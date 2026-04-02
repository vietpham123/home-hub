import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Room, AnyDevice } from '../types';
import { rooms as mockRooms } from '../data/mockData';

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
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [loaded, setLoaded] = useState(false);

  // Load persisted discovered devices on mount
  useEffect(() => {
    loadPersistedDevices();
  }, []);

  async function loadPersistedDevices() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const savedRooms: Room[] = JSON.parse(stored);
        // Merge: start with mock rooms, add any discovered devices
        const merged = [...mockRooms.map(r => ({ ...r, devices: [...r.devices] }))];
        
        for (const savedRoom of savedRooms) {
          const existingRoom = merged.find(r => r.id === savedRoom.id);
          if (existingRoom) {
            // Add saved devices that aren't already in mock data
            for (const device of savedRoom.devices) {
              if (!existingRoom.devices.find(d => d.id === device.id)) {
                existingRoom.devices.push(device);
              }
            }
          } else {
            // It's a custom room not in mock data
            merged.push(savedRoom);
          }
        }
        setRooms(merged);
      }
    } catch (e) {
      console.warn('Failed to load persisted devices:', e);
    }
    setLoaded(true);
  }

  // Persist only non-mock devices (discovered/added ones)
  async function persistRooms(updatedRooms: Room[]) {
    try {
      const mockDeviceIds = new Set(
        mockRooms.flatMap(r => r.devices.map(d => d.id))
      );
      const mockRoomIds = new Set(mockRooms.map(r => r.id));

      // Save rooms that have non-mock devices, or are custom rooms
      const toSave: Room[] = [];
      for (const room of updatedRooms) {
        const nonMockDevices = room.devices.filter(d => !mockDeviceIds.has(d.id));
        if (nonMockDevices.length > 0 || !mockRoomIds.has(room.id)) {
          toSave.push({
            ...room,
            devices: mockRoomIds.has(room.id) ? nonMockDevices : room.devices,
          });
        }
      }
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to persist devices:', e);
    }
  }

  const addDeviceToRoom = useCallback((device: AnyDevice, roomId: string) => {
    setRooms(prev => {
      const updated = prev.map(room => {
        if (room.id === roomId) {
          // Don't add duplicates
          if (room.devices.find(d => d.id === device.id)) return room;
          return { ...room, devices: [...room.devices, device] };
        }
        return room;
      });
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
