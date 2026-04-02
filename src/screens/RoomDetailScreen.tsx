import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDeviceStore } from '../store/DeviceContext';
import { RootStackParamList, Sensor } from '../types';
import { colors, spacing, typography } from '../theme';
import DeviceCard from '../components/DeviceCard';
import SensorWidget from '../components/SensorWidget';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomDetail'>;

export default function RoomDetailScreen({ route, navigation }: Props) {
  const { getRoomById } = useDeviceStore();
  const room = getRoomById(route.params.roomId);

  if (!room) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Room not found</Text>
      </View>
    );
  }

  const sensors = room.devices.filter((d): d is Sensor => d.type === 'sensor');
  const otherDevices = room.devices.filter((d) => d.type !== 'sensor');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{room.name}</Text>
      <Text style={styles.subtitle}>
        {room.devices.length} devices · {room.devices.filter((d) => d.isOnline).length} online
      </Text>

      {sensors.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Sensors</Text>
          {sensors.map((sensor) => (
            <SensorWidget key={sensor.id} sensor={sensor} />
          ))}
        </>
      )}

      {otherDevices.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Devices</Text>
          <View style={styles.devicesGrid}>
            {otherDevices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onPress={() =>
                  navigation.navigate('DeviceDetail', {
                    deviceId: device.id,
                    roomId: room.id,
                  })
                }
              />
            ))}
          </View>
        </>
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
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
