import { Room } from '../types';

export const rooms: Room[] = [];

export function getAllDevices() {
  return rooms.flatMap((r) => r.devices);
}

export function getDeviceById(deviceId: string) {
  return getAllDevices().find((d) => d.id === deviceId);
}

export function getRoomById(roomId: string) {
  return rooms.find((r) => r.id === roomId);
}
