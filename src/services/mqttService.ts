/**
 * MQTT Service — Real WebSocket-based MQTT client.
 *
 * Connects to a broker over WebSocket (ws://) which works in both
 * React Native and web environments. Pairs with the Tuya-MQTT bridge
 * running on your local network.
 *
 * Topic convention:
 *   smarthouse/{deviceId}/state    — bridge publishes device state
 *   smarthouse/{deviceId}/command  — app publishes commands
 *   smarthouse/{deviceId}/status   — bridge publishes online/offline
 *   smarthouse/bridge/status       — bridge online/offline status
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@mqtt_config';

export interface MqttConfig {
  host: string;
  port: number;
  wsPort: number; // WebSocket port (e.g. 9001)
  username?: string;
  password?: string;
  useTls?: boolean;
}

const DEFAULT_CONFIG: MqttConfig = {
  host: '192.168.1.100',
  port: 1883,
  wsPort: 9001,
};

export type MessageHandler = (topic: string, payload: any) => void;
export type ConnectionHandler = (connected: boolean) => void;

class MqttService {
  private config: MqttConfig = DEFAULT_CONFIG;
  private ws: WebSocket | null = null;
  private connected = false;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private connectionHandlers: ConnectionHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private clientId = `smarthouse_${Math.random().toString(36).slice(2, 10)}`;
  private pendingSubscriptions: string[] = [];

  /** Load config from AsyncStorage */
  async loadConfig(): Promise<MqttConfig> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch {}
    return this.config;
  }

  /** Save config */
  async saveConfig(config: MqttConfig): Promise<void> {
    this.config = config;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  /** Get current config */
  getConfig(): MqttConfig {
    return this.config;
  }

  /** Connect to the MQTT broker via WebSocket */
  async connect(): Promise<void> {
    if (this.ws && this.connected) return;

    await this.loadConfig();

    const protocol = this.config.useTls ? 'wss' : 'ws';
    const url = `${protocol}://${this.config.host}:${this.config.wsPort}/mqtt`;

    console.log(`[MQTT] Connecting to ${url}...`);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url, 'mqtt');
        this.ws.binaryType = 'arraybuffer';

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
          this.ws?.close();
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          console.log('[MQTT] WebSocket connected, sending CONNECT...');
          this.sendConnectPacket();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
          if (!this.connected) {
            // First message back should be CONNACK
            this.connected = true;
            console.log('[MQTT] Connected to broker');
            this.notifyConnectionHandlers(true);
            // Re-subscribe pending topics
            this.pendingSubscriptions.forEach((topic) => this.sendSubscribe(topic));
            this.pendingSubscriptions = [];
            resolve();
          }
        };

        this.ws.onerror = (err) => {
          console.log('[MQTT] WebSocket error');
          clearTimeout(timeout);
          if (!this.connected) reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          console.log('[MQTT] WebSocket closed');
          const wasConnected = this.connected;
          this.connected = false;
          if (wasConnected) {
            this.notifyConnectionHandlers(false);
            this.scheduleReconnect();
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /** Disconnect from broker */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      // Send DISCONNECT packet
      const packet = new Uint8Array([0xe0, 0x00]);
      try { this.ws.send(packet.buffer); } catch {}
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.notifyConnectionHandlers(false);
  }

  /** Subscribe to a topic */
  subscribe(topic: string, handler: MessageHandler): void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, []);
    }
    this.handlers.get(topic)!.push(handler);

    if (this.connected) {
      this.sendSubscribe(topic);
    } else {
      this.pendingSubscriptions.push(topic);
    }
  }

  /** Unsubscribe from a topic */
  unsubscribe(topic: string): void {
    this.handlers.delete(topic);
    if (this.connected) {
      this.sendUnsubscribe(topic);
    }
  }

  /** Publish a message to a topic */
  publish(topic: string, payload: any): void {
    if (!this.connected || !this.ws) {
      console.log(`[MQTT] Not connected, cannot publish to ${topic}`);
      return;
    }
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.sendPublishPacket(topic, payloadStr);
  }

  /** Register a handler for connection state changes */
  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter((h) => h !== handler);
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ── MQTT packet encoding (minimal MQTT 3.1.1) ──────────────────

  private sendConnectPacket(): void {
    const clientIdBytes = new TextEncoder().encode(this.clientId);
    const usernameBytes = this.config.username ? new TextEncoder().encode(this.config.username) : null;
    const passwordBytes = this.config.password ? new TextEncoder().encode(this.config.password) : null;

    // Variable header
    const protocolName = new Uint8Array([0x00, 0x04, 0x4d, 0x51, 0x54, 0x54]); // "MQTT"
    const protocolLevel = 0x04; // MQTT 3.1.1
    let connectFlags = 0x02; // Clean session
    if (usernameBytes) connectFlags |= 0x80;
    if (passwordBytes) connectFlags |= 0x40;
    const keepAlive = new Uint8Array([0x00, 0x3c]); // 60 seconds

    // Calculate remaining length
    let remainingLength = protocolName.length + 1 + 1 + keepAlive.length;
    remainingLength += 2 + clientIdBytes.length;
    if (usernameBytes) remainingLength += 2 + usernameBytes.length;
    if (passwordBytes) remainingLength += 2 + passwordBytes.length;

    const packet = new Uint8Array(1 + this.encodedLength(remainingLength).length + remainingLength);
    let offset = 0;

    packet[offset++] = 0x10; // CONNECT packet type
    const rlBytes = this.encodedLength(remainingLength);
    packet.set(rlBytes, offset); offset += rlBytes.length;

    packet.set(protocolName, offset); offset += protocolName.length;
    packet[offset++] = protocolLevel;
    packet[offset++] = connectFlags;
    packet.set(keepAlive, offset); offset += keepAlive.length;

    // Client ID
    packet[offset++] = (clientIdBytes.length >> 8) & 0xff;
    packet[offset++] = clientIdBytes.length & 0xff;
    packet.set(clientIdBytes, offset); offset += clientIdBytes.length;

    // Username
    if (usernameBytes) {
      packet[offset++] = (usernameBytes.length >> 8) & 0xff;
      packet[offset++] = usernameBytes.length & 0xff;
      packet.set(usernameBytes, offset); offset += usernameBytes.length;
    }

    // Password
    if (passwordBytes) {
      packet[offset++] = (passwordBytes.length >> 8) & 0xff;
      packet[offset++] = passwordBytes.length & 0xff;
      packet.set(passwordBytes, offset); offset += passwordBytes.length;
    }

    this.ws?.send(packet.buffer);

    // Start keepalive pings
    this.startPingInterval();
  }

  private sendSubscribe(topic: string): void {
    const topicBytes = new TextEncoder().encode(topic);
    const packetId = Math.floor(Math.random() * 65535) + 1;

    const remainingLength = 2 + 2 + topicBytes.length + 1; // packetId + topic + QoS
    const rlBytes = this.encodedLength(remainingLength);
    const packet = new Uint8Array(1 + rlBytes.length + remainingLength);
    let offset = 0;

    packet[offset++] = 0x82; // SUBSCRIBE
    packet.set(rlBytes, offset); offset += rlBytes.length;
    packet[offset++] = (packetId >> 8) & 0xff;
    packet[offset++] = packetId & 0xff;
    packet[offset++] = (topicBytes.length >> 8) & 0xff;
    packet[offset++] = topicBytes.length & 0xff;
    packet.set(topicBytes, offset); offset += topicBytes.length;
    packet[offset++] = 0x01; // QoS 1

    this.ws?.send(packet.buffer);
    console.log(`[MQTT] Subscribed to ${topic}`);
  }

  private sendUnsubscribe(topic: string): void {
    const topicBytes = new TextEncoder().encode(topic);
    const packetId = Math.floor(Math.random() * 65535) + 1;

    const remainingLength = 2 + 2 + topicBytes.length;
    const rlBytes = this.encodedLength(remainingLength);
    const packet = new Uint8Array(1 + rlBytes.length + remainingLength);
    let offset = 0;

    packet[offset++] = 0xa2; // UNSUBSCRIBE
    packet.set(rlBytes, offset); offset += rlBytes.length;
    packet[offset++] = (packetId >> 8) & 0xff;
    packet[offset++] = packetId & 0xff;
    packet[offset++] = (topicBytes.length >> 8) & 0xff;
    packet[offset++] = topicBytes.length & 0xff;
    packet.set(topicBytes, offset);

    this.ws?.send(packet.buffer);
  }

  private sendPublishPacket(topic: string, payload: string): void {
    const topicBytes = new TextEncoder().encode(topic);
    const payloadBytes = new TextEncoder().encode(payload);

    const remainingLength = 2 + topicBytes.length + payloadBytes.length;
    const rlBytes = this.encodedLength(remainingLength);
    const packet = new Uint8Array(1 + rlBytes.length + remainingLength);
    let offset = 0;

    packet[offset++] = 0x30; // PUBLISH, QoS 0
    packet.set(rlBytes, offset); offset += rlBytes.length;
    packet[offset++] = (topicBytes.length >> 8) & 0xff;
    packet[offset++] = topicBytes.length & 0xff;
    packet.set(topicBytes, offset); offset += topicBytes.length;
    packet.set(payloadBytes, offset);

    this.ws?.send(packet.buffer);
  }

  private pingInterval: ReturnType<typeof setInterval> | null = null;

  private startPingInterval(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.connected && this.ws) {
        const ping = new Uint8Array([0xc0, 0x00]);
        try { this.ws.send(ping.buffer); } catch {}
      }
    }, 30000);
  }

  private handleMessage(data: ArrayBuffer): void {
    const bytes = new Uint8Array(data);
    if (bytes.length === 0) return;

    const packetType = bytes[0] >> 4;

    switch (packetType) {
      case 2: // CONNACK
        break;
      case 3: { // PUBLISH
        this.handlePublishPacket(bytes);
        break;
      }
      case 9: // SUBACK
        break;
      case 13: // PINGRESP
        break;
    }
  }

  private handlePublishPacket(bytes: Uint8Array): void {
    let offset = 1;
    // Decode remaining length
    let remainingLength = 0;
    let multiplier = 1;
    let digit;
    do {
      digit = bytes[offset++];
      remainingLength += (digit & 127) * multiplier;
      multiplier *= 128;
    } while ((digit & 128) !== 0);

    // Topic
    const topicLength = (bytes[offset] << 8) | bytes[offset + 1];
    offset += 2;
    const topic = new TextDecoder().decode(bytes.slice(offset, offset + topicLength));
    offset += topicLength;

    // Payload
    const payloadLength = remainingLength - 2 - topicLength;
    const payloadStr = new TextDecoder().decode(bytes.slice(offset, offset + payloadLength));

    let payload: any;
    try {
      payload = JSON.parse(payloadStr);
    } catch {
      payload = payloadStr;
    }

    // Dispatch to handlers — match exact and wildcard topics
    this.handlers.forEach((handlers, pattern) => {
      if (this.topicMatches(pattern, topic)) {
        handlers.forEach((handler) => {
          try {
            handler(topic, payload);
          } catch (e) {
            console.error('[MQTT] Handler error:', e);
          }
        });
      }
    });
  }

  /** Simple MQTT topic matching with + and # wildcards */
  private topicMatches(pattern: string, topic: string): boolean {
    if (pattern === topic) return true;
    if (pattern === '#') return true;

    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') return true;
      if (patternParts[i] === '+') continue;
      if (i >= topicParts.length || patternParts[i] !== topicParts[i]) return false;
    }

    return patternParts.length === topicParts.length;
  }

  private encodedLength(length: number): Uint8Array {
    const bytes: number[] = [];
    do {
      let digit = length % 128;
      length = Math.floor(length / 128);
      if (length > 0) digit |= 0x80;
      bytes.push(digit);
    } while (length > 0);
    return new Uint8Array(bytes);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    console.log('[MQTT] Reconnecting in 5s...');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        this.scheduleReconnect();
      });
    }, 5000);
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach((h) => {
      try { h(connected); } catch {}
    });
  }
}

export const mqttService = new MqttService();
export default MqttService;
