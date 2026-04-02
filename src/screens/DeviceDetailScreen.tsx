import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDeviceStore } from '../store/DeviceContext';
import { RootStackParamList, AnyDevice, Light, Thermostat, Blinds, Lock, Camera } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useMqttDevice, useMqttConnection } from '../hooks/useMqtt';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceDetail'>;

export default function DeviceDetailScreen({ route }: Props) {
  const { getDeviceById, getRoomById } = useDeviceStore();
  const device = getDeviceById(route.params.deviceId);
  const room = getRoomById(route.params.roomId);

  if (!device || !room) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Device not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconLarge}>
          <MaterialCommunityIcons
            name={getDeviceIcon(device) as any}
            size={48}
            color={colors.primary}
          />
        </View>
        <Text style={styles.title}>{device.name}</Text>
        <Text style={styles.roomName}>{room.name}</Text>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: device.isOnline ? colors.online : colors.offline },
            ]}
          />
          <Text style={styles.statusText}>
            {device.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <DeviceControls device={device} />
      </View>
    </ScrollView>
  );
}

function getDeviceIcon(device: AnyDevice): string {
  switch (device.type) {
    case 'light':
      return device.isOn ? 'lightbulb-on' : 'lightbulb-outline';
    case 'thermostat':
      return 'thermometer';
    case 'lock':
      return device.isLocked ? 'lock' : 'lock-open';
    case 'camera':
      return 'cctv';
    case 'blinds':
      return 'blinds';
    case 'sensor':
      return 'chip';
    default:
      return 'devices';
  }
}

function DeviceControls({ device }: { device: AnyDevice }) {
  switch (device.type) {
    case 'light':
      return <LightControls device={device} />;
    case 'thermostat':
      return <ThermostatControls device={device} />;
    case 'lock':
      return <LockControls device={device} />;
    case 'camera':
      return <CameraControls device={device} />;
    case 'blinds':
      return <BlindsControls device={device} />;
    default:
      return <Text style={styles.noControls}>No controls available</Text>;
  }
}

function LightControls({ device }: { device: Light }) {
  const isMqttDevice = device.source === 'gosund' || device.source === 'mqtt';
  const mqttDeviceId = device.gosundDeviceId ?? device.id;

  // Use MQTT hook for real devices, local state for mock
  const mqtt = useMqttDevice(mqttDeviceId, {
    isOn: device.isOn,
    brightness: device.brightness,
  });
  const mqttConnected = useMqttConnection();

  const [localIsOn, setLocalIsOn] = useState(device.isOn);
  const [localBrightness, setLocalBrightness] = useState(device.brightness);

  const isOn = isMqttDevice && mqttConnected ? mqtt.state.isOn : localIsOn;
  const brightness = isMqttDevice && mqttConnected ? mqtt.state.brightness : localBrightness;

  function handleToggle() {
    if (isMqttDevice && mqttConnected) {
      mqtt.sendCommand({ isOn: !isOn });
    } else {
      setLocalIsOn(!localIsOn);
    }
  }

  function handleBrightness(val: number) {
    if (isMqttDevice && mqttConnected) {
      mqtt.sendCommand({ brightness: Math.round(val) });
    } else {
      setLocalBrightness(val);
    }
  }

  return (
    <View>
      {isMqttDevice && (
        <View style={[styles.mqttBadge, mqttConnected ? styles.mqttOnline : styles.mqttOffline]}>
          <MaterialCommunityIcons
            name={mqttConnected ? 'access-point-network' : 'access-point-network-off'}
            size={16}
            color={mqttConnected ? colors.success : colors.textSecondary}
          />
          <Text style={[styles.mqttBadgeText, mqttConnected && { color: colors.success }]}>
            {mqttConnected ? 'MQTT Connected — Live Control' : 'MQTT Offline — Local Only'}
          </Text>
        </View>
      )}
      <ControlRow label="Power">
        <ToggleButton
          isOn={isOn}
          onToggle={handleToggle}
          labelOn="ON"
          labelOff="OFF"
        />
      </ControlRow>
      <ControlRow label={`Brightness: ${Math.round(brightness)}%`}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={brightness}
          onSlidingComplete={handleBrightness}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.surfaceLight}
          thumbTintColor={colors.accent}
        />
      </ControlRow>
      {device.color && (
        <ControlRow label="Color">
          <View style={styles.colorRow}>
            {['#FFFFFF', '#FFE4B5', '#FF8C00', '#FF6B6B', '#4ECDC4', '#9B59B6'].map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorSwatch, { backgroundColor: c }]}
                onPress={() => Alert.alert('Color', `Set to ${c}`)}
              />
            ))}
          </View>
        </ControlRow>
      )}
    </View>
  );
}

function ThermostatControls({ device }: { device: Thermostat }) {
  const [target, setTarget] = useState(device.targetTemp);
  const [mode, setMode] = useState(device.mode);

  return (
    <View>
      <ControlRow label="Current Temperature">
        <Text style={styles.bigValue}>{device.currentTemp}°C</Text>
      </ControlRow>
      <ControlRow label={`Target: ${target.toFixed(1)}°C`}>
        <View style={styles.tempControls}>
          <TouchableOpacity
            style={styles.tempBtn}
            onPress={() => setTarget((t) => Math.max(16, t - 0.5))}
          >
            <MaterialCommunityIcons name="minus" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.tempValue}>{target.toFixed(1)}°C</Text>
          <TouchableOpacity
            style={styles.tempBtn}
            onPress={() => setTarget((t) => Math.min(30, t + 0.5))}
          >
            <MaterialCommunityIcons name="plus" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </ControlRow>
      <ControlRow label="Mode">
        <View style={styles.modeRow}>
          {(['auto', 'heat', 'cool', 'off'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ControlRow>
    </View>
  );
}

function LockControls({ device }: { device: Lock }) {
  const [isLocked, setIsLocked] = useState(device.isLocked);

  return (
    <View>
      <ControlRow label="Status">
        <Text style={[styles.bigValue, { color: isLocked ? colors.success : colors.danger }]}>
          {isLocked ? 'Locked' : 'Unlocked'}
        </Text>
      </ControlRow>
      <ControlRow label="Control">
        <ToggleButton
          isOn={isLocked}
          onToggle={() => setIsLocked(!isLocked)}
          labelOn="LOCKED"
          labelOff="UNLOCKED"
        />
      </ControlRow>
    </View>
  );
}

function CameraControls({ device }: { device: Camera }) {
  const [isRecording, setIsRecording] = useState(device.isRecording);

  return (
    <View>
      <View style={styles.cameraPreview}>
        <MaterialCommunityIcons name="cctv" size={64} color={colors.textSecondary} />
        <Text style={styles.previewText}>Live preview (mock)</Text>
      </View>
      <ControlRow label="Recording">
        <ToggleButton
          isOn={isRecording}
          onToggle={() => setIsRecording(!isRecording)}
          labelOn="REC"
          labelOff="STOP"
        />
      </ControlRow>
    </View>
  );
}

function BlindsControls({ device }: { device: Blinds }) {
  const [position, setPosition] = useState(device.position);

  return (
    <View>
      <ControlRow label={`Position: ${Math.round(position)}%`}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={position}
          onValueChange={setPosition}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surfaceLight}
          thumbTintColor={colors.primary}
        />
      </ControlRow>
      <View style={styles.presetRow}>
        {[
          { label: 'Closed', value: 0 },
          { label: '25%', value: 25 },
          { label: '50%', value: 50 },
          { label: '75%', value: 75 },
          { label: 'Open', value: 100 },
        ].map((preset) => (
          <TouchableOpacity
            key={preset.label}
            style={[styles.presetBtn, position === preset.value && styles.presetBtnActive]}
            onPress={() => setPosition(preset.value)}
          >
            <Text
              style={[
                styles.presetText,
                position === preset.value && styles.presetTextActive,
              ]}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.controlRow}>
      <Text style={styles.controlLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleButton({
  isOn,
  onToggle,
  labelOn,
  labelOff,
}: {
  isOn: boolean;
  onToggle: () => void;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.toggleButton, isOn ? styles.toggleOn : styles.toggleOff]}
      onPress={onToggle}
    >
      <Text style={styles.toggleLabel}>{isOn ? labelOn : labelOff}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  roomName: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    marginTop: spacing.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  statusText: {
    ...typography.body,
    color: colors.text,
  },
  controls: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlRow: {
    marginBottom: spacing.lg,
  },
  controlLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  bigValue: {
    ...typography.h1,
    color: colors.primary,
  },
  toggleButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: colors.primary,
  },
  toggleOff: {
    backgroundColor: colors.surfaceLight,
  },
  toggleLabel: {
    ...typography.h3,
    color: colors.text,
  },
  tempControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tempValue: {
    ...typography.h1,
    color: colors.primary,
    marginHorizontal: spacing.xl,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  modeTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cameraPreview: {
    height: 200,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  previewText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    marginHorizontal: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: colors.primary,
  },
  presetText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  presetTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  noControls: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  mqttBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  mqttOnline: {
    backgroundColor: colors.success + '15',
  },
  mqttOffline: {
    backgroundColor: colors.surfaceLight,
  },
  mqttBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});
