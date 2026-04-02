export type DeviceType =
  | 'light'
  | 'plug'
  | 'thermostat'
  | 'lock'
  | 'camera'
  | 'blinds'
  | 'sensor';

export type SensorKind = 'motion' | 'temperature' | 'humidity';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  roomId: string;
  isOnline: boolean;
  icon: string;
}

export interface Light extends Device {
  type: 'light';
  isOn: boolean;
  brightness: number; // 0–100
  color?: string; // hex
  source?: 'mock' | 'gosund' | 'mqtt';
  gosundDeviceId?: string;
}

export interface Plug extends Device {
  type: 'plug';
  isOn: boolean;
  source?: 'mock' | 'gosund' | 'mqtt';
  gosundDeviceId?: string;
}

export interface Thermostat extends Device {
  type: 'thermostat';
  currentTemp: number;
  targetTemp: number;
  mode: 'heat' | 'cool' | 'auto' | 'off';
}

export interface Lock extends Device {
  type: 'lock';
  isLocked: boolean;
}

export interface Camera extends Device {
  type: 'camera';
  isRecording: boolean;
  thumbnailUri?: string;
}

export interface Blinds extends Device {
  type: 'blinds';
  position: number; // 0 (closed) – 100 (open)
}

export interface Sensor extends Device {
  type: 'sensor';
  sensorKind: SensorKind;
  value: number;
  unit: string;
}

export type AnyDevice = Light | Plug | Thermostat | Lock | Camera | Blinds | Sensor;

export interface Room {
  id: string;
  name: string;
  icon: string;
  devices: AnyDevice[];
}

export type RootStackParamList = {
  MainTabs: undefined;
  RoomDetail: { roomId: string };
  DeviceDetail: { deviceId: string; roomId: string };
  GosundSetup: undefined;
  GosundDiscovery: undefined;
  MqttConfig: undefined;
  AddMqttDevice: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Rooms: undefined;
  Settings: undefined;
};
