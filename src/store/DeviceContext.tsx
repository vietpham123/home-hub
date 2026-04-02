import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Room, AnyDevice } from '../types';

const STORAGE_KEY = '@smarthouse_rooms';

interface DeviceStore {
  rooms: Room[];
  allDevices: AnyDevice[];
  getDeviceById: (id: string) => AnyDevice | undefined;
  getRoomById: (id: string) => Room | undefined;
  addDeviceToRoom: (device: AnyDevice, roomId: string) => void;
  removeDevice: (deviceId: string) => void;
  updateDevice: (deviceId: string, updates: Partial<AnyDevice>) => void;
  addRoom: (room: Room) => void;
  refresh: () => void;
  loaded: boolean;
}

const DeviceContext = createContext<DeviceStore | null>(null);

export function useDeviceStore(): DeviceStore {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDeviceStore must be used within DeviceProvider');
  return ctx;
}

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load persisted devices on mount
  useEffect(() => {
    loadPersistedDevices();
  }, []);

  async function loadPersistedDevices() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const savedRooms: Room[] = JSON.parse(stored);
        setRooms(savedRooms);
      }
    } catch (e) {
      console.warn('Failed to load persisted devices:', e);
    }
    setLoaded(true);
  }

  async function persistRooms(updatedRooms: Room[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRooms));
    } catch (e) {
      console.warn('Failed to persist devices:', e);
    }
  }

  const addDeviceToRoom = useCallback((device: AnyDevice, roomId: string) => {
    setRooms(prev => {
      let found = false;
      const updated = prev.map(room => {
        if (room.id === roomId) {
          found = true;
          // Don't add duplicates
          if (room.devices.find(d => d.id === device.id)) return room;
          return { ...room, devices: [...room.devices, device] };
        }
        return room;
      });
      // If room doesn't exist yet, create it with the device
      if (!found) {
        updated.push({ id: roomId, name: roomId, icon: 'door', devices: [device] });
      }
      persistRooms(updated);
      return updated;
    });
  }, []);

  const removeDevice = useCallback((deviceId: string) => {
    setRooms(prev => {
      const updated = prev.map(room => ({
        ...room,
        devices: room.devices.filter(d => d.id !== deviceId),
      }));
      persistRooms(updated);
      return updated;
    });
  }, []);

  const updateDevice = useCallback((deviceId: string, updates: Partial<AnyDevice>) => {
    setRooms(prev => {
      const updated = prev.map(room => ({
        ...room,
        devices: room.devices.map(d =>
          d.id === deviceId ? { ...d, ...updates } as AnyDevice : d
        ),
      }));
      persistRooms(updated);
      return updated;
    });
  }, []);

  const addRoom = useCallback((room: Room) => {
    setRooms(prev => {
      if (prev.find(r => r.id === room.id)) return prev;
      const updated = [...prev, room];
      persistRooms(updated);
      return updated;
    });
  }, []);

  const allDevices = rooms.flatMap(r => r.devices);

  const getDeviceById = useCallback(
    (id: string) => rooms.flatMap(r => r.devices).find(d => d.id === id),
    [rooms]
  );

  const getRoomById = useCallback(
    (id: string) => rooms.find(r => r.id === id),
    [rooms]
  );

  const refresh = useCallback(() => {
    loadPersistedDevices();
  }, []);

  return (
    <DeviceContext.Provider
      value={{
        rooms,
        allDevices,
        getDeviceById,
        getRoomById,
        addDeviceToRoom,
        removeDevice,
        updateDevice,
        addRoom,
        refresh,
        loaded,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
}
