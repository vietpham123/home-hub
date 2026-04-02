import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AnyDevice } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

interface DeviceCardProps {
  device: AnyDevice;
  onPress: () => void;
  onToggle?: () => void;
}

function getStatusText(device: AnyDevice): string {
  if (!device.isOnline) return 'Offline';
  switch (device.type) {
    case 'light':
      return device.isOn ? `On · ${device.brightness}%` : 'Off';
    case 'thermostat':
      return `${device.currentTemp}°C → ${device.targetTemp}°C`;
    case 'plug':
      return device.isOn ? 'On' : 'Off';
    case 'lock':
      return device.isLocked ? 'Locked' : 'Unlocked';
    case 'camera':
      return device.isRecording ? 'Recording' : 'Idle';
    case 'blinds':
      return device.position === 0
        ? 'Closed'
        : device.position === 100
        ? 'Open'
        : `${device.position}% Open`;
    case 'sensor':
      if (device.sensorKind === 'motion') return device.value ? 'Motion detected' : 'Clear';
      return `${device.value}${device.unit}`;
    default:
      return '';
  }
}

function getStatusColor(device: AnyDevice): string {
  if (!device.isOnline) return colors.offline;
  switch (device.type) {
    case 'light':
      return device.isOn ? colors.accent : colors.textSecondary;
    case 'thermostat':
      return device.mode === 'off' ? colors.textSecondary : colors.primary;
    case 'lock':
      return device.isLocked ? colors.success : colors.danger;
    case 'camera':
      return device.isRecording ? colors.danger : colors.textSecondary;
    case 'blinds':
      return device.position > 0 ? colors.primary : colors.textSecondary;
    case 'sensor':
      return colors.primary;
    default:
      return colors.textSecondary;
  }
}

function getIconName(device: AnyDevice): string {
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
      if (device.sensorKind === 'motion') return 'motion-sensor';
      if (device.sensorKind === 'humidity') return 'water-percent';
      return 'thermometer';
    default:
      return 'devices';
  }
}

export default function DeviceCard({ device, onPress, onToggle }: DeviceCardProps) {
  const hasToggle = device.type === 'light' || device.type === 'lock';
  const isActive =
    device.isOnline &&
    ((device.type === 'light' && device.isOn) ||
      (device.type === 'lock' && !device.isLocked) ||
      (device.type === 'camera' && device.isRecording) ||
      (device.type === 'blinds' && device.position > 0) ||
      (device.type === 'thermostat' && device.mode !== 'off'));

  return (
    <TouchableOpacity
      style={[styles.card, isActive && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, isActive && styles.iconActive]}>
          <MaterialCommunityIcons
            name={getIconName(device) as any}
            size={24}
            color={isActive ? colors.background : colors.textSecondary}
          />
        </View>
        {hasToggle && (
          <TouchableOpacity
            style={[styles.toggleBtn, isActive && styles.toggleBtnActive]}
            onPress={onToggle}
          >
            <View style={[styles.toggleDot, isActive && styles.toggleDotActive]} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {device.name}
      </Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(device) }]} />
        <Text style={styles.status} numberOfLines={1}>
          {getStatusText(device)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '47%',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconActive: {
    backgroundColor: colors.primary,
  },
  toggleBtn: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textSecondary,
  },
  toggleDotActive: {
    backgroundColor: colors.text,
    alignSelf: 'flex-end',
  },
  name: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  status: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
});
