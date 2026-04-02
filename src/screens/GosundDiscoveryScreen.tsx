import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { gosundService, TuyaDeviceRaw } from '../services/gosundService';
import { useDeviceStore } from '../store/DeviceContext';
import { RootStackParamList } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GosundDiscovery'>;

const DEVICE_CATEGORIES: Record<string, { label: string; icon: string }> = {
  dj: { label: 'Light', icon: 'lightbulb-on' },
  dd: { label: 'Light Strip', icon: 'led-strip-variant' },
  fwd: { label: 'Dimmer', icon: 'brightness-6' },
  xdd: { label: 'Ceiling Light', icon: 'ceiling-light' },
  dc: { label: 'Light String', icon: 'string-lights' },
  tgq: { label: 'Spotlight', icon: 'spotlight-beam' },
  cz: { label: 'Smart Plug', icon: 'power-socket-us' },
  pc: { label: 'Power Strip', icon: 'power-plug' },
  kg: { label: 'Switch', icon: 'toggle-switch' },
  wk: { label: 'Thermostat', icon: 'thermometer' },
  default: { label: 'Device', icon: 'devices' },
};

export default function GosundDiscoveryScreen({ navigation }: Props) {
  const [devices, setDevices] = useState<TuyaDeviceRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedDevices, setAddedDevices] = useState<Set<string>>(new Set());
  const { rooms, addDeviceToRoom } = useDeviceStore();

  useEffect(() => {
    discoverDevices();
  }, []);

  async function discoverDevices() {
    setLoading(true);
    setError(null);
    try {
      await gosundService.loadConfig();
      if (!gosundService.isConfigured()) {
        setError('Gosund not configured. Go to Settings → Gosund Setup first.');
        setLoading(false);
        return;
      }
      const found = await gosundService.discoverDevices();
      setDevices(found);
    } catch (e: any) {
      setError(e.message);
      // Fall back to cached devices
      try {
        const cached = await gosundService.getCachedDevices();
        if (cached.length > 0) {
          setDevices(cached);
          setError(`${e.message}\n\nShowing cached devices instead.`);
        }
      } catch {}
    }
    setLoading(false);
  }

  function getCategoryInfo(category: string) {
    return DEVICE_CATEGORIES[category] ?? DEVICE_CATEGORIES.default;
  }

  function handleAddDevice(device: TuyaDeviceRaw) {
    const roomOptions = rooms.map((r) => ({
      text: r.name,
      onPress: () => {
        const light = gosundService.tuyaDeviceToLight(device, r.id);
        addDeviceToRoom(light, r.id);
        setAddedDevices((prev) => new Set(prev).add(device.id));
        Alert.alert('Added', `${device.name} added to ${r.name}`);
      },
    }));

    Alert.alert('Add to Room', `Which room should "${device.name}" be in?`, [
      ...roomOptions,
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Discovering Gosund devices...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Discovered Devices</Text>
          <Text style={styles.subtitle}>
            {devices.length} device{devices.length !== 1 ? 's' : ''} found
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={discoverDevices}>
          <MaterialCommunityIcons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <MaterialCommunityIcons name="alert-circle" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Device list */}
      {devices.length === 0 && !error ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="magnify-close" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Devices Found</Text>
          <Text style={styles.emptyText}>
            Make sure your Gosund devices are set up in the Gosund/Smart Life app and linked to your
            Tuya developer account.
          </Text>
          <TouchableOpacity
            style={styles.setupBtn}
            onPress={() => navigation.navigate('GosundSetup')}
          >
            <Text style={styles.setupBtnText}>Check Setup</Text>
          </TouchableOpacity>
        </View>
      ) : (
        devices.map((device) => {
          const catInfo = getCategoryInfo(device.category);
          const isAdded = addedDevices.has(device.id);
          const isLight = gosundService.isLightCategory(device.category);

          return (
            <View key={device.id} style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <View
                  style={[
                    styles.deviceIcon,
                    { backgroundColor: device.online ? colors.primary + '20' : colors.surfaceLight },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={catInfo.icon as any}
                    size={28}
                    color={device.online ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceMeta}>
                    {catInfo.label} · {device.product_name}
                  </Text>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: device.online ? colors.online : colors.offline },
                      ]}
                    />
                    <Text style={styles.statusLabel}>
                      {device.online ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Status codes */}
              {device.status && device.status.length > 0 && (
                <View style={styles.statusCodes}>
                  {device.status.slice(0, 4).map((s, i) => (
                    <View key={i} style={styles.statusCodeBadge}>
                      <Text style={styles.statusCodeText}>
                        {s.code}: {typeof s.value === 'boolean' ? (s.value ? 'ON' : 'OFF') : String(s.value)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action */}
              <TouchableOpacity
                style={[
                  styles.addBtn,
                  isAdded && styles.addBtnDisabled,
                  !isLight && styles.addBtnUnsupported,
                ]}
                onPress={() => handleAddDevice(device)}
                disabled={isAdded || !isLight}
              >
                <MaterialCommunityIcons
                  name={isAdded ? 'check' : isLight ? 'plus' : 'information'}
                  size={18}
                  color={isAdded ? colors.success : isLight ? colors.text : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.addBtnText,
                    isAdded && { color: colors.success },
                    !isLight && { color: colors.textSecondary },
                  ]}
                >
                  {isAdded ? 'Added' : isLight ? 'Add to Room' : 'Not supported yet'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
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
    paddingBottom: spacing.xl * 3,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  refreshBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  errorCard: {
    flexDirection: 'row',
    backgroundColor: colors.danger + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger + '40',
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    flex: 1,
    marginLeft: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  setupBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  setupBtnText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  deviceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceHeader: {
    flexDirection: 'row',
  },
  deviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    ...typography.h3,
    color: colors.text,
  },
  deviceMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusCodes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  statusCodeBadge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusCodeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.md,
  },
  addBtnDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  addBtnUnsupported: {
    backgroundColor: colors.surfaceLight,
  },
  addBtnText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
