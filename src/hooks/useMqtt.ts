import { useEffect, useState, useRef, useCallback } from 'react';
import { mqttService } from '../services/mqttService';

/**
 * Hook to subscribe to MQTT state updates for a device.
 * Returns the latest state and a function to send commands.
 *
 * Topics:
 *   smarthouse/{deviceId}/state   — incoming state from bridge
 *   smarthouse/{deviceId}/command — outgoing commands to bridge
 */
export function useMqttDevice<T extends Record<string, any>>(
  deviceId: string,
  initialState: T
): {
  state: T;
  sendCommand: (command: Partial<T>) => void;
  isConnected: boolean;
} {
  const [state, setState] = useState<T>(initialState);
  const [isConnected, setIsConnected] = useState(mqttService.isConnected());
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const stateTopic = `smarthouse/${deviceId}/state`;

    const handler = (_topic: string, payload: any) => {
      if (payload && typeof payload === 'object') {
        setState((prev) => ({ ...prev, ...payload }));
      }
    };

    mqttService.subscribe(stateTopic, handler);

    const unsub = mqttService.onConnectionChange(setIsConnected);

    return () => {
      mqttService.unsubscribe(stateTopic);
      unsub();
    };
  }, [deviceId]);

  const sendCommand = useCallback(
    (command: Partial<T>) => {
      // Optimistically update local state
      setState((prev) => ({ ...prev, ...command }));
      // Send to bridge via MQTT
      mqttService.publish(`smarthouse/${deviceId}/command`, command);
    },
    [deviceId]
  );

  return { state, sendCommand, isConnected };
}

/**
 * Hook to subscribe to the bridge status.
 */
export function useBridgeStatus(): { online: boolean; deviceCount: number } {
  const [status, setStatus] = useState({ online: false, deviceCount: 0 });

  useEffect(() => {
    const handler = (_topic: string, payload: any) => {
      if (payload && typeof payload === 'object') {
        setStatus({
          online: payload.online ?? false,
          deviceCount: payload.devices ?? 0,
        });
      }
    };

    mqttService.subscribe('smarthouse/bridge/status', handler);
    return () => mqttService.unsubscribe('smarthouse/bridge/status');
  }, []);

  return status;
}

/**
 * Hook for MQTT connection state.
 */
export function useMqttConnection(): boolean {
  const [connected, setConnected] = useState(mqttService.isConnected());

  useEffect(() => {
    const unsub = mqttService.onConnectionChange(setConnected);
    return unsub;
  }, []);

  return connected;
}
