import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Sensor } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

interface SensorWidgetProps {
  sensor: Sensor;
}

function getIcon(kind: string): string {
  switch (kind) {
    case 'temperature':
      return 'thermometer';
    case 'humidity':
      return 'water-percent';
    case 'motion':
      return 'motion-sensor';
    default:
      return 'chip';
  }
}

function getColor(kind: string): string {
  switch (kind) {
    case 'temperature':
      return '#FF6B6B';
    case 'humidity':
      return '#4ECDC4';
    case 'motion':
      return '#FFE66D';
    default:
      return colors.primary;
  }
}

export default function SensorWidget({ sensor }: SensorWidgetProps) {
  const iconColor = getColor(sensor.sensorKind);

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={getIcon(sensor.sensorKind) as any} size={24} color={iconColor} />
      <View style={styles.info}>
        <Text style={styles.label}>{sensor.name}</Text>
        <Text style={[styles.value, { color: iconColor }]}>
          {sensor.sensorKind === 'motion'
            ? sensor.value
              ? 'Detected'
              : 'Clear'
            : `${sensor.value}${sensor.unit}`}
        </Text>
      </View>
      <View style={[styles.dot, { backgroundColor: sensor.isOnline ? colors.online : colors.offline }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.h3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
