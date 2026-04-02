import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDeviceStore } from '../store/DeviceContext';
import { RootStackParamList } from '../types';
import { colors, spacing, typography } from '../theme';
import RoomCard from '../components/RoomCard';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function RoomsScreen({ navigation }: Props) {
  const { rooms } = useDeviceStore();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Rooms</Text>
      <Text style={styles.subtitle}>{rooms.length} rooms configured</Text>
      {rooms.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="floor-plan" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            No rooms yet. Add a device via Settings → Add MQTT Device to create your first room.
          </Text>
        </View>
      ) : (
        rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onPress={() => navigation.navigate('RoomDetail', { roomId: room.id })}
          />
        ))
      )}
    </ScrollView>
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
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
});
