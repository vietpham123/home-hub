import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { rooms, getAllDevices } from '../data/mockData';
import { RootStackParamList, AnyDevice, Sensor } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';
import DeviceCard from '../components/DeviceCard';
import SensorWidget from '../components/SensorWidget';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function DashboardScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const allDevices = getAllDevices();
  const onlineDevices = allDevices.filter((d) => d.isOnline);
  const sensors = allDevices.filter((d): d is Sensor => d.type === 'sensor');
  const favoriteDevices = allDevices.filter(
    (d) => d.type !== 'sensor' && d.isOnline
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome Home</Text>
          <Text style={styles.subtitle}>
            {onlineDevices.length}/{allDevices.length} devices online
          </Text>
        </View>
        <TouchableOpacity style={styles.profileBtn}>
          <MaterialCommunityIcons name="account-circle" size={40} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <StatCard
          icon="lightbulb-on"
          label="Lights On"
          value={String(allDevices.filter((d) => d.type === 'light' && d.isOnline && d.isOn).length)}
          color={colors.accent}
        />
        <StatCard
          icon="lock"
          label="Doors Locked"
          value={String(allDevices.filter((d) => d.type === 'lock' && d.isOnline && d.isLocked).length)}
          color={colors.success}
        />
        <StatCard
          icon="cctv"
          label="Cameras"
          value={String(allDevices.filter((d) => d.type === 'camera' && d.isOnline && d.isRecording).length)}
          color={colors.danger}
        />
      </View>

      {/* Sensors */}
      <Text style={styles.sectionTitle}>Sensors</Text>
      {sensors.slice(0, 4).map((sensor) => (
        <SensorWidget key={sensor.id} sensor={sensor} />
      ))}

      {/* Devices */}
      <Text style={styles.sectionTitle}>Active Devices</Text>
      <View style={styles.devicesGrid}>
        {favoriteDevices.slice(0, 6).map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onPress={() =>
              navigation.navigate('DeviceDetail', {
                deviceId: device.id,
                roomId: device.roomId,
              })
            }
          />
        ))}
      </View>
    </ScrollView>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  profileBtn: {
    padding: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    ...typography.h2,
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
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
});
