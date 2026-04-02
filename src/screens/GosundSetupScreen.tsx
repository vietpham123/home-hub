import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { gosundService, GosundConfig } from '../services/gosundService';
import { RootStackParamList } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GosundSetup'>;

const REGIONS = [
  { key: 'us', label: 'Americas', url: 'tuyaus.com' },
  { key: 'eu', label: 'Europe', url: 'tuyaeu.com' },
  { key: 'cn', label: 'China', url: 'tuyacn.com' },
  { key: 'in', label: 'India', url: 'tuyain.com' },
] as const;

export default function GosundSetupScreen({ navigation }: Props) {
  const [accessId, setAccessId] = useState('');
  const [accessSecret, setAccessSecret] = useState('');
  const [uid, setUid] = useState('');
  const [region, setRegion] = useState<'us' | 'eu' | 'cn' | 'in'>('eu');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    loadExisting();
  }, []);

  async function loadExisting() {
    try {
      const config = await gosundService.loadConfig();
      if (config) {
        setAccessId(config.accessId);
        setAccessSecret(config.accessSecret);
        setUid(config.uid ?? '');
        setRegion(config.region);
        setIsConfigured(true);
      }
    } catch (e) {
      // No saved config
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!accessId.trim() || !accessSecret.trim()) {
      Alert.alert('Missing Fields', 'Access ID and Access Secret are required.');
      return;
    }

    setSaving(true);
    try {
      const config: GosundConfig = {
        accessId: accessId.trim(),
        accessSecret: accessSecret.trim(),
        region,
        uid: uid.trim() || undefined,
      };
      await gosundService.saveConfig(config);
      setIsConfigured(true);
      Alert.alert('Saved', 'Gosund configuration saved successfully.', [
        {
          text: 'Discover Devices',
          onPress: () => navigation.navigate('GosundDiscovery'),
        },
        { text: 'OK' },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  }

  async function handleClear() {
    Alert.alert('Disconnect Gosund', 'Remove all Gosund configuration and cached devices?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await gosundService.clearConfig();
          setAccessId('');
          setAccessSecret('');
          setUid('');
          setRegion('eu');
          setIsConfigured(false);
        },
      },
    ]);
  }

  async function handleTestConnection() {
    if (!accessId.trim() || !accessSecret.trim()) {
      Alert.alert('Missing Fields', 'Save your credentials first.');
      return;
    }
    setSaving(true);
    try {
      await gosundService.saveConfig({
        accessId: accessId.trim(),
        accessSecret: accessSecret.trim(),
        region,
        uid: uid.trim() || undefined,
      });
      // Try to get a token — this validates the credentials
      const devices = uid ? await gosundService.discoverDevices() : [];
      Alert.alert(
        'Connection Successful',
        uid
          ? `Found ${devices.length} device(s) on your account.`
          : 'Credentials are valid. Add your User ID to discover devices.'
      );
    } catch (e: any) {
      Alert.alert('Connection Failed', e.message);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header info */}
      <View style={styles.infoCard}>
        <MaterialCommunityIcons name="lightbulb-group" size={40} color={colors.accent} />
        <Text style={styles.infoTitle}>Connect Gosund Devices</Text>
        <Text style={styles.infoText}>
          Gosund devices use the Tuya IoT platform. You need a Tuya developer account to connect
          your devices.
        </Text>
      </View>

      {/* Steps */}
      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>Setup Steps</Text>
        <StepRow number="1" text="Go to iot.tuya.com and create a developer account" />
        <StepRow number="2" text="Create a Cloud Project (Smart Home type)" />
        <StepRow number="3" text='Link your Gosund/Smart Life app account under "Link Devices"' />
        <StepRow number="4" text="Copy the Access ID, Access Secret, and User ID below" />
      </View>

      {/* Credential form */}
      <Text style={styles.sectionTitle}>API Credentials</Text>

      <Text style={styles.label}>Region</Text>
      <View style={styles.regionRow}>
        {REGIONS.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.regionBtn, region === r.key && styles.regionBtnActive]}
            onPress={() => setRegion(r.key)}
          >
            <Text style={[styles.regionText, region === r.key && styles.regionTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Access ID</Text>
      <TextInput
        style={styles.input}
        value={accessId}
        onChangeText={setAccessId}
        placeholder="e.g. pnf4s5ey7h8x..."
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Access Secret</Text>
      <TextInput
        style={styles.input}
        value={accessSecret}
        onChangeText={setAccessSecret}
        placeholder="e.g. 3a8b7d1e0f..."
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>User ID (UID)</Text>
      <TextInput
        style={styles.input}
        value={uid}
        onChangeText={setUid}
        placeholder="Found in Tuya IoT → Devices → Link Tuya Account"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Actions */}
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <>
            <MaterialCommunityIcons name="content-save" size={20} color={colors.text} />
            <Text style={styles.buttonText}>Save Configuration</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={handleTestConnection}
        disabled={saving}
      >
        <MaterialCommunityIcons name="connection" size={20} color={colors.primary} />
        <Text style={[styles.buttonText, { color: colors.primary }]}>Test Connection</Text>
      </TouchableOpacity>

      {isConfigured && (
        <>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => navigation.navigate('GosundDiscovery')}
          >
            <MaterialCommunityIcons name="magnify" size={20} color={colors.text} />
            <Text style={styles.buttonText}>Discover Devices</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleClear}
          >
            <MaterialCommunityIcons name="link-off" size={20} color={colors.danger} />
            <Text style={[styles.buttonText, { color: colors.danger }]}>Disconnect</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

function StepRow({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNumber}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
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
    paddingBottom: spacing.xl * 3,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  stepsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  stepsTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  stepNumber: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  stepText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  regionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  regionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    marginHorizontal: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  regionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  regionText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  regionTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dangerButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  buttonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
