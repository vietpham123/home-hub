import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useDeviceStore } from '../store/DeviceContext';
import { RootStackParamList } from '../types';

export default function SettingsScreen() {
  const { allDevices, rooms } = useDeviceStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Configure your smart home</Text>

      {/* Integrations */}
      <Text style={styles.sectionTitle}>Integrations</Text>
      <View style={styles.card}>
        <SettingRow
          icon="lightbulb-group"
          label="Gosund / Tuya"
          value="Configure"
          onPress={() => navigation.navigate('GosundSetup')}
        />
        <SettingRow
          icon="magnify"
          label="Discover Gosund Devices"
          value=""
          onPress={() => navigation.navigate('GosundDiscovery')}
          isLast
        />
      </View>

      {/* Connection */}
      <Text style={styles.sectionTitle}>Connection</Text>
      <View style={styles.card}>
        <SettingRow
          icon="server-network"
          label="MQTT Broker"
          value="Configure"
          onPress={() => navigation.navigate('MqttConfig')}
        />
        <SettingRow
          icon="wifi"
          label="Network"
          value="Connected"
          isLast
        />
      </View>

      {/* General */}
      <Text style={styles.sectionTitle}>General</Text>
      <View style={styles.card}>
        <SettingToggle icon="theme-light-dark" label="Dark Mode" defaultValue={true} />
        <SettingToggle icon="bell" label="Notifications" defaultValue={true} />
        <SettingToggle icon="map-marker" label="Location Services" defaultValue={false} isLast />
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.card}>
        <SettingRow icon="information" label="Version" value="1.0.0" />
        <SettingRow icon="home" label="Rooms" value={String(rooms.length)} />
        <SettingRow icon="devices" label="Total Devices" value={String(allDevices.length)} isLast />
      </View>
    </ScrollView>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  isLast = false,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.settingRow, !isLast && styles.settingBorder]}
      onPress={onPress}
      disabled={!onPress}
    >
      <MaterialCommunityIcons name={icon as any} size={22} color={colors.primary} />
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
      {onPress && (
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );
}

function SettingToggle({
  icon,
  label,
  defaultValue,
  isLast = false,
}: {
  icon: string;
  label: string;
  defaultValue: boolean;
  isLast?: boolean;
}) {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <View style={[styles.settingRow, !isLast && styles.settingBorder]}>
      <MaterialCommunityIcons name={icon as any} size={22} color={colors.primary} />
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={setValue}
        trackColor={{ false: colors.surfaceLight, true: colors.primary }}
        thumbColor={colors.text}
      />
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
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  settingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  settingValue: {
    ...typography.body,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
});
