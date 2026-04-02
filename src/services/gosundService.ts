/**
 * Gosund / Tuya Cloud API Service
 *
 * Gosund devices use the Tuya IoT platform under the hood.
 * This service communicates with the Tuya Cloud API to:
 *   - Authenticate with API credentials
 *   - Discover Gosund devices linked to the account
 *   - Read device state and send commands
 *
 * Setup:
 *   1. Create a Tuya IoT developer account at https://iot.tuya.com
 *   2. Create a Cloud Project and link your Gosund app account
 *   3. Copy the Access ID and Access Secret into this app's settings
 */

import { Light, AnyDevice } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHmac } from '../utils/crypto';

const TUYA_API_BASE = 'https://openapi.tuyaeu.com'; // EU region — change for your region
const STORAGE_KEY_CONFIG = '@gosund_config';
const STORAGE_KEY_DEVICES = '@gosund_devices';

export interface GosundConfig {
  accessId: string;
  accessSecret: string;
  region: 'us' | 'eu' | 'cn' | 'in';
  uid?: string; // Tuya user ID (obtained after linking)
}

export interface TuyaDeviceRaw {
  id: string;
  name: string;
  category: string;
  product_name: string;
  online: boolean;
  icon: string;
  status: Array<{ code: string; value: any }>;
}

const REGION_URLS: Record<string, string> = {
  us: 'https://openapi.tuyaus.com',
  eu: 'https://openapi.tuyaeu.com',
  cn: 'https://openapi.tuyacn.com',
  in: 'https://openapi.tuyain.com',
};

class GosundService {
  private config: GosundConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /** Load saved config from storage */
  async loadConfig(): Promise<GosundConfig | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      this.config = JSON.parse(raw);
    }
    return this.config;
  }

  /** Save config to storage */
  async saveConfig(config: GosundConfig): Promise<void> {
    this.config = config;
    this.accessToken = null; // force re-auth
    await AsyncStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }

  /** Clear stored config and cached devices */
  async clearConfig(): Promise<void> {
    this.config = null;
    this.accessToken = null;
    await AsyncStorage.multiRemove([STORAGE_KEY_CONFIG, STORAGE_KEY_DEVICES]);
  }

  isConfigured(): boolean {
    return !!(this.config?.accessId && this.config?.accessSecret);
  }

  private getBaseUrl(): string {
    return REGION_URLS[this.config?.region ?? 'eu'] ?? REGION_URLS.eu;
  }

  /**
   * Get an access token from Tuya Cloud API.
   * Uses HMAC-SHA256 signing as required by Tuya's API.
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.config) throw new Error('Gosund not configured');

    const timestamp = Date.now().toString();
    const signStr = this.config.accessId + timestamp;
    const sign = createHmac(this.config.accessSecret, signStr);

    const url = `${this.getBaseUrl()}/v1.0/token?grant_type=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        client_id: this.config.accessId,
        sign: sign.toUpperCase(),
        t: timestamp,
        sign_method: 'HMAC-SHA256',
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.msg || 'Failed to authenticate with Tuya');
    }

    this.accessToken = data.result.access_token;
    this.tokenExpiry = Date.now() + (data.result.expire_time * 1000) - 60000;
    return this.accessToken!;
  }

  /** Make an authenticated request to the Tuya API */
  private async apiRequest(method: string, path: string, body?: any): Promise<any> {
    if (!this.config) throw new Error('Gosund not configured');

    const token = await this.getAccessToken();
    const timestamp = Date.now().toString();
    const signStr = this.config.accessId + token + timestamp;
    const sign = createHmac(this.config.accessSecret, signStr);

    const url = `${this.getBaseUrl()}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        client_id: this.config.accessId,
        access_token: token,
        sign: sign.toUpperCase(),
        t: timestamp,
        sign_method: 'HMAC-SHA256',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.msg || `API request failed: ${path}`);
    }
    return data.result;
  }

  /** Discover all devices linked to the Tuya/Gosund account */
  async discoverDevices(): Promise<TuyaDeviceRaw[]> {
    if (!this.config?.uid) {
      throw new Error('User ID not set. Link your Gosund account first.');
    }
    const result = await this.apiRequest('GET', `/v1.0/users/${this.config.uid}/devices`);
    // Cache discovered devices
    await AsyncStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(result));
    return result;
  }

  /** Get cached discovered devices */
  async getCachedDevices(): Promise<TuyaDeviceRaw[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_DEVICES);
    return raw ? JSON.parse(raw) : [];
  }

  /** Get a single device's current status */
  async getDeviceStatus(deviceId: string): Promise<Array<{ code: string; value: any }>> {
    return this.apiRequest('GET', `/v1.0/devices/${deviceId}/status`);
  }

  /** Send a command to a device */
  async sendCommand(deviceId: string, commands: Array<{ code: string; value: any }>): Promise<void> {
    await this.apiRequest('POST', `/v1.0/devices/${deviceId}/commands`, { commands });
  }

  /** Turn a Gosund light on/off */
  async setLightPower(deviceId: string, on: boolean): Promise<void> {
    await this.sendCommand(deviceId, [{ code: 'switch_led', value: on }]);
  }

  /** Set brightness (0–1000 in Tuya scale) */
  async setLightBrightness(deviceId: string, brightness: number): Promise<void> {
    const tuyaValue = Math.round((brightness / 100) * 1000);
    await this.sendCommand(deviceId, [{ code: 'bright_value_v2', value: tuyaValue }]);
  }

  /** Set color temperature (0–1000 in Tuya scale) */
  async setLightColorTemp(deviceId: string, temp: number): Promise<void> {
    await this.sendCommand(deviceId, [{ code: 'temp_value_v2', value: temp }]);
  }

  /** Set HSV color */
  async setLightColor(deviceId: string, h: number, s: number, v: number): Promise<void> {
    await this.sendCommand(deviceId, [
      { code: 'colour_data_v2', value: JSON.stringify({ h, s, v }) },
    ]);
  }

  /**
   * Convert a raw Tuya device to our app's Light type.
   * Gosund bulbs typically have category 'dj' (light).
   */
  tuyaDeviceToLight(raw: TuyaDeviceRaw, roomId: string): Light {
    const switchStatus = raw.status.find((s) => s.code === 'switch_led');
    const brightnessStatus = raw.status.find((s) => s.code === 'bright_value_v2');

    return {
      id: `gosund-${raw.id}`,
      name: raw.name || raw.product_name,
      type: 'light',
      roomId,
      isOnline: raw.online,
      icon: 'lightbulb-on',
      isOn: switchStatus?.value ?? false,
      brightness: brightnessStatus ? Math.round((brightnessStatus.value / 1000) * 100) : 0,
      source: 'gosund',
      gosundDeviceId: raw.id,
    } as Light & { source: string; gosundDeviceId: string };
  }

  /** Check which Tuya device categories are lights */
  isLightCategory(category: string): boolean {
    return ['dj', 'dd', 'fwd', 'xdd', 'dc', 'tgq'].includes(category);
  }
}

export const gosundService = new GosundService();
export default GosundService;
