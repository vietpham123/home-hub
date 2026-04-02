/**
 * Smarthouse Tuya-MQTT Bridge
 *
 * Runs on your local server (e.g. Raspberry Pi) and:
 *   1. Connects to each Tuya/Gosund device on the local network
 *   2. Publishes device state to MQTT topics
 *   3. Subscribes to command topics and relays commands to devices
 *
 * Topic convention:
 *   smarthouse/{deviceId}/state    — bridge publishes JSON state
 *   smarthouse/{deviceId}/command  — app publishes JSON commands
 *   smarthouse/{deviceId}/status   — bridge publishes online/offline
 *
 * Configuration: see config.json
 *
 * Usage:
 *   1. npm install
 *   2. Edit config.json with your device keys and MQTT broker
 *   3. npm start
 */

const TuyAPI = require('tuyapi');
const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

// ── Load configuration ─────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, 'config.json');

if (!fs.existsSync(CONFIG_PATH)) {
  console.error('config.json not found. Copy config.example.json and fill in your device details.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const VERBOSE = process.argv.includes('--verbose');

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

function debug(...args) {
  if (VERBOSE) console.log(`[DEBUG ${new Date().toISOString()}]`, ...args);
}

// ── MQTT Connection ────────────────────────────────────────────────
const mqttUrl = `mqtt://${config.mqtt.host}:${config.mqtt.port}`;
log(`Connecting to MQTT broker at ${mqttUrl}...`);

const mqttClient = mqtt.connect(mqttUrl, {
  username: config.mqtt.username || undefined,
  password: config.mqtt.password || undefined,
  clientId: `smarthouse-bridge-${Date.now()}`,
  will: {
    topic: 'smarthouse/bridge/status',
    payload: JSON.stringify({ online: false, timestamp: Date.now() }),
    retain: true,
    qos: 1,
  },
});

mqttClient.on('connect', () => {
  log('Connected to MQTT broker');
  mqttClient.publish('smarthouse/bridge/status',
    JSON.stringify({ online: true, timestamp: Date.now(), devices: config.devices.length }),
    { retain: true, qos: 1 }
  );
  // Subscribe to command topics for each device
  config.devices.forEach((dev) => {
    const topic = `smarthouse/${dev.id}/command`;
    mqttClient.subscribe(topic, { qos: 1 }, (err) => {
      if (err) log(`Failed to subscribe to ${topic}:`, err.message);
      else debug(`Subscribed to ${topic}`);
    });
  });
});

mqttClient.on('error', (err) => {
  log('MQTT error:', err.message);
});

// ── Tuya Device Management ─────────────────────────────────────────
const tuyaDevices = new Map(); // deviceId → { tuya, state, config }

function publishState(deviceId, state) {
  const topic = `smarthouse/${deviceId}/state`;
  const payload = JSON.stringify({
    ...state,
    timestamp: Date.now(),
  });
  mqttClient.publish(topic, payload, { retain: true, qos: 1 });
  debug(`Published state for ${deviceId}:`, payload);
}

function publishStatus(deviceId, online) {
  const topic = `smarthouse/${deviceId}/status`;
  mqttClient.publish(topic, JSON.stringify({ online, timestamp: Date.now() }),
    { retain: true, qos: 1 });
}

/**
 * Translate Tuya DPS (data points) to a normalized state object.
 * Common Gosund light DPS:
 *   1  → switch (bool)
 *   2  → mode ("white"/"colour"/"scene"/"music")
 *   3  → brightness (10–1000)
 *   4  → color temperature (0–1000)
 *   5  → color data (HSV JSON string)
 */
function parseLightDps(dps) {
  const state = {};
  if (dps['1'] !== undefined) state.isOn = dps['1'];
  if (dps['2'] !== undefined) state.mode = dps['2'];
  if (dps['3'] !== undefined) state.brightness = Math.round((dps['3'] / 1000) * 100);
  if (dps['4'] !== undefined) state.colorTemp = Math.round((dps['4'] / 1000) * 100);
  if (dps['5'] !== undefined) {
    try {
      const color = typeof dps['5'] === 'string' ? JSON.parse(dps['5']) : dps['5'];
      state.color = { h: color.h, s: color.s, v: color.v };
    } catch {
      state.colorRaw = dps['5'];
    }
  }
  return state;
}

/**
 * Translate Tuya DPS for a smart plug.
 *   1  → switch (bool)
 *   9  → countdown (seconds)
 *   17 → current (mA)
 *   18 → power (W * 10)
 *   19 → voltage (V * 10)
 */
function parsePlugDps(dps) {
  const state = {};
  if (dps['1'] !== undefined) state.isOn = dps['1'];
  if (dps['9'] !== undefined) state.countdown = dps['9'];
  if (dps['17'] !== undefined) state.currentMa = dps['17'];
  if (dps['18'] !== undefined) state.powerW = dps['18'] / 10;
  if (dps['19'] !== undefined) state.voltageV = dps['19'] / 10;
  return state;
}

function parseDps(deviceConfig, dps) {
  switch (deviceConfig.type) {
    case 'light': return parseLightDps(dps);
    case 'plug': return parsePlugDps(dps);
    default: return dps; // pass-through raw DPS
  }
}

/**
 * Translate a command from the app into Tuya DPS values.
 */
function commandToDps(deviceConfig, command) {
  const dps = {};
  if (deviceConfig.type === 'light') {
    if (command.isOn !== undefined) dps['1'] = command.isOn;
    if (command.brightness !== undefined) dps['3'] = Math.round((command.brightness / 100) * 1000);
    if (command.colorTemp !== undefined) dps['4'] = Math.round((command.colorTemp / 100) * 1000);
    if (command.color) {
      dps['2'] = 'colour';
      dps['5'] = JSON.stringify(command.color);
    }
    if (command.mode) dps['2'] = command.mode;
  } else if (deviceConfig.type === 'plug') {
    if (command.isOn !== undefined) dps['1'] = command.isOn;
  }
  return dps;
}

function validateDeviceConfig(deviceConfig) {
  if (!deviceConfig.tuyaId || deviceConfig.tuyaId.startsWith('YOUR_')) {
    log(`⚠ Skipping "${deviceConfig.name}" — tuyaId is not configured`);
    return false;
  }
  if (!deviceConfig.tuyaKey || deviceConfig.tuyaKey.startsWith('YOUR_') || deviceConfig.tuyaKey.length !== 16) {
    log(`⚠ Skipping "${deviceConfig.name}" — tuyaKey is missing or not 16 characters (got ${(deviceConfig.tuyaKey || '').length})`);
    return false;
  }
  return true;
}

async function connectDevice(deviceConfig) {
  if (!validateDeviceConfig(deviceConfig)) return;

  const tuya = new TuyAPI({
    id: deviceConfig.tuyaId,
    key: deviceConfig.tuyaKey,
    ip: deviceConfig.ip || undefined,
    version: deviceConfig.version || '3.3',
    issueRefreshOnConnect: true,
  });

  const entry = { tuya, state: {}, config: deviceConfig };
  tuyaDevices.set(deviceConfig.id, entry);

  tuya.on('connected', () => {
    log(`Device connected: ${deviceConfig.name} (${deviceConfig.id})`);
    publishStatus(deviceConfig.id, true);
  });

  tuya.on('disconnected', () => {
    log(`Device disconnected: ${deviceConfig.name} (${deviceConfig.id})`);
    publishStatus(deviceConfig.id, false);
    // Auto-reconnect after 10 seconds
    setTimeout(() => {
      log(`Reconnecting to ${deviceConfig.name}...`);
      tuya.connect().catch((err) => {
        log(`Reconnect failed for ${deviceConfig.name}:`, err.message);
      });
    }, 10000);
  });

  tuya.on('data', (data) => {
    debug(`Data from ${deviceConfig.name}:`, JSON.stringify(data));
    if (data.dps) {
      const parsed = parseDps(deviceConfig, data.dps);
      entry.state = { ...entry.state, ...parsed };
      publishState(deviceConfig.id, entry.state);
    }
  });

  tuya.on('error', (err) => {
    log(`Error from ${deviceConfig.name}:`, err.message);
  });

  try {
    // Find device on network if no IP specified
    if (!deviceConfig.ip) {
      log(`Finding ${deviceConfig.name} on network...`);
      await tuya.find();
    }
    await tuya.connect();
  } catch (err) {
    log(`Failed to connect to ${deviceConfig.name}:`, err.message);
    publishStatus(deviceConfig.id, false);
  }
}

// ── Handle MQTT commands from the app ──────────────────────────────
mqttClient.on('message', (topic, message) => {
  const match = topic.match(/^smarthouse\/(.+)\/command$/);
  if (!match) return;

  const deviceId = match[1];
  const entry = tuyaDevices.get(deviceId);
  if (!entry) {
    log(`Received command for unknown device: ${deviceId}`);
    return;
  }

  try {
    const command = JSON.parse(message.toString());
    log(`Command for ${entry.config.name}:`, JSON.stringify(command));

    const dps = commandToDps(entry.config, command);
    const dpsKeys = Object.keys(dps);
    if (dpsKeys.length === 0) {
      log(`No DPS mapping for command:`, JSON.stringify(command));
      return;
    }

    log(`Setting DPS for ${entry.config.name}:`, JSON.stringify(dps));

    // Use individual set for single DPS (more reliable on 3.4+ firmware)
    if (dpsKeys.length === 1) {
      const dpsKey = dpsKeys[0];
      entry.tuya.set({ dps: dpsKey, set: dps[dpsKey] }).then(() => {
        log(`Command sent to ${entry.config.name}: DPS ${dpsKey} = ${dps[dpsKey]}`);
      }).catch((err) => {
        log(`Failed to send command to ${entry.config.name}:`, err.message);
      });
    } else {
      entry.tuya.set({ multiple: true, data: dps }).then(() => {
        log(`Multi-DPS command sent to ${entry.config.name}`);
      }).catch((err) => {
        log(`Failed to send multi-DPS command to ${entry.config.name}:`, err.message);
      });
    }
  } catch (err) {
    log(`Invalid command payload for ${deviceId}:`, err.message);
  }
});

// ── Start ──────────────────────────────────────────────────────────
const validDevices = config.devices.filter(validateDeviceConfig);
log(`Starting Smarthouse Bridge with ${validDevices.length}/${config.devices.length} valid device(s)...`);

if (validDevices.length === 0) {
  log('');
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║  No devices configured with valid keys.                     ║');
  log('║                                                             ║');
  log('║  To get your device keys:                                   ║');
  log('║    pip3 install tinytuya                                    ║');
  log('║    python3 -m tinytuya wizard                               ║');
  log('║                                                             ║');
  log('║  Then edit config.json with the real tuyaId and tuyaKey.    ║');
  log('╚══════════════════════════════════════════════════════════════╝');
  log('');
  log('Bridge is running (waiting for valid device config)...');
} else {
  validDevices.forEach((deviceConfig) => {
    connectDevice(deviceConfig);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('Shutting down bridge...');
  mqttClient.publish('smarthouse/bridge/status',
    JSON.stringify({ online: false, timestamp: Date.now() }),
    { retain: true, qos: 1 },
    () => {
      tuyaDevices.forEach((entry) => {
        entry.tuya.disconnect();
      });
      mqttClient.end();
      process.exit(0);
    }
  );
});
