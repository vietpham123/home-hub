import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Room } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

interface RoomCardProps {
  room: Room;
  onPress: () => void;
}

export default function RoomCard({ room, onPress }: RoomCardProps) {
  const onlineCount = room.devices.filter((d) => d.isOnline).length;
  const activeCount = room.devices.filter((d) => {
    if (!d.isOnline) return false;
    switch (d.type) {
      case 'light':
        return d.isOn;
      case 'thermostat':
        return d.mode !== 'off';
      case 'lock':
        return !d.isLocked;
      case 'camera':
        return d.isRecording;
      case 'blinds':
        return d.position > 0;
      default:
        return false;
    }
  }).length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconRow}>
        <MaterialCommunityIcons name={room.icon as any} size={32} color={colors.primary} />
        {activeCount > 0 && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>{activeCount}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name}>{room.name}</Text>
      <Text style={styles.info}>
        {room.devices.length} devices · {onlineCount} online
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activeBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  activeBadgeText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  name: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  info: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
