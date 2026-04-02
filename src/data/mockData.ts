import { Room, Light, Thermostat, Lock, Camera, Blinds, Sensor } from '../types';

const livingRoomDevices = [
  {
    id: 'light-1',
    name: 'Ceiling Light',
    type: 'light',
    roomId: 'living-room',
    isOnline: true,
    icon: 'lightbulb-on',
    isOn: true,
    brightness: 80,
    color: '#FFE4B5',
  } as Light,
  {
    id: 'light-2',
    name: 'Floor Lamp',
    type: 'light',
    roomId: 'living-room',
    isOnline: true,
    icon: 'floor-lamp',
    isOn: false,
    brightness: 0,
    color: '#FFFFFF',
  } as Light,
  {
    id: 'thermostat-1',
    name: 'Main Thermostat',
    type: 'thermostat',
    roomId: 'living-room',
    isOnline: true,
    icon: 'thermometer',
    currentTemp: 22.5,
    targetTemp: 23,
    mode: 'auto',
  } as Thermostat,
  {
    id: 'blinds-1',
    name: 'Window Blinds',
    type: 'blinds',
    roomId: 'living-room',
    isOnline: true,
    icon: 'blinds',
    position: 75,
  } as Blinds,
  {
    id: 'sensor-1',
    name: 'Temperature Sensor',
    type: 'sensor',
    roomId: 'living-room',
    isOnline: true,
    icon: 'thermometer',
    sensorKind: 'temperature',
    value: 22.5,
    unit: '°C',
  } as Sensor,
  {
    id: 'sensor-2',
    name: 'Humidity Sensor',
    type: 'sensor',
    roomId: 'living-room',
    isOnline: true,
    icon: 'water-percent',
    sensorKind: 'humidity',
    value: 45,
    unit: '%',
  } as Sensor,
];

const bedroomDevices = [
  {
    id: 'light-3',
    name: 'Bedside Lamp L',
    type: 'light',
    roomId: 'bedroom',
    isOnline: true,
    icon: 'lamp',
    isOn: true,
    brightness: 30,
    color: '#FF8C00',
  } as Light,
  {
    id: 'light-4',
    name: 'Bedside Lamp R',
    type: 'light',
    roomId: 'bedroom',
    isOnline: true,
    icon: 'lamp',
    isOn: false,
    brightness: 0,
    color: '#FF8C00',
  } as Light,
  {
    id: 'blinds-2',
    name: 'Bedroom Blinds',
    type: 'blinds',
    roomId: 'bedroom',
    isOnline: true,
    icon: 'blinds',
    position: 0,
  } as Blinds,
  {
    id: 'sensor-3',
    name: 'Motion Sensor',
    type: 'sensor',
    roomId: 'bedroom',
    isOnline: true,
    icon: 'motion-sensor',
    sensorKind: 'motion',
    value: 0,
    unit: '',
  } as Sensor,
  {
    id: 'sensor-4',
    name: 'Temperature Sensor',
    type: 'sensor',
    roomId: 'bedroom',
    isOnline: true,
    icon: 'thermometer',
    sensorKind: 'temperature',
    value: 20.8,
    unit: '°C',
  } as Sensor,
];

const kitchenDevices = [
  {
    id: 'light-5',
    name: 'Kitchen Lights',
    type: 'light',
    roomId: 'kitchen',
    isOnline: true,
    icon: 'lightbulb-on',
    isOn: true,
    brightness: 100,
    color: '#FFFFFF',
  } as Light,
  {
    id: 'sensor-5',
    name: 'Temperature Sensor',
    type: 'sensor',
    roomId: 'kitchen',
    isOnline: true,
    icon: 'thermometer',
    sensorKind: 'temperature',
    value: 24.1,
    unit: '°C',
  } as Sensor,
  {
    id: 'sensor-6',
    name: 'Humidity Sensor',
    type: 'sensor',
    roomId: 'kitchen',
    isOnline: true,
    icon: 'water-percent',
    sensorKind: 'humidity',
    value: 60,
    unit: '%',
  } as Sensor,
  {
    id: 'camera-2',
    name: 'Kitchen Cam',
    type: 'camera',
    roomId: 'kitchen',
    isOnline: false,
    icon: 'cctv',
    isRecording: false,
  } as Camera,
];

const entranceDevices = [
  {
    id: 'lock-1',
    name: 'Front Door Lock',
    type: 'lock',
    roomId: 'entrance',
    isOnline: true,
    icon: 'lock',
    isLocked: true,
  } as Lock,
  {
    id: 'camera-1',
    name: 'Doorbell Camera',
    type: 'camera',
    roomId: 'entrance',
    isOnline: true,
    icon: 'cctv',
    isRecording: true,
  } as Camera,
  {
    id: 'light-6',
    name: 'Porch Light',
    type: 'light',
    roomId: 'entrance',
    isOnline: true,
    icon: 'lightbulb-on',
    isOn: false,
    brightness: 0,
    color: '#FFFFFF',
  } as Light,
  {
    id: 'sensor-7',
    name: 'Motion Sensor',
    type: 'sensor',
    roomId: 'entrance',
    isOnline: true,
    icon: 'motion-sensor',
    sensorKind: 'motion',
    value: 1,
    unit: '',
  } as Sensor,
];

const garageDevices = [
  {
    id: 'lock-2',
    name: 'Garage Door Lock',
    type: 'lock',
    roomId: 'garage',
    isOnline: true,
    icon: 'lock',
    isLocked: true,
  } as Lock,
  {
    id: 'light-7',
    name: 'Garage Light',
    type: 'light',
    roomId: 'garage',
    isOnline: true,
    icon: 'lightbulb-on',
    isOn: false,
    brightness: 0,
    color: '#FFFFFF',
  } as Light,
  {
    id: 'sensor-8',
    name: 'Temperature Sensor',
    type: 'sensor',
    roomId: 'garage',
    isOnline: false,
    icon: 'thermometer',
    sensorKind: 'temperature',
    value: 18.2,
    unit: '°C',
  } as Sensor,
];

export const rooms: Room[] = [
  {
    id: 'living-room',
    name: 'Living Room',
    icon: 'sofa',
    devices: livingRoomDevices,
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    icon: 'bed',
    devices: bedroomDevices,
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: 'stove',
    devices: kitchenDevices,
  },
  {
    id: 'entrance',
    name: 'Entrance',
    icon: 'door',
    devices: entranceDevices,
  },
  {
    id: 'garage',
    name: 'Garage',
    icon: 'garage',
    devices: garageDevices,
  },
];

export function getAllDevices() {
  return rooms.flatMap((r) => r.devices);
}

export function getDeviceById(deviceId: string) {
  return getAllDevices().find((d) => d.id === deviceId);
}

export function getRoomById(roomId: string) {
  return rooms.find((r) => r.id === roomId);
}
