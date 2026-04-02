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
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { mqttService, MqttConfig } from '../services/mqttService';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function MqttConfigScreen() {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('1883');
  const [wsPort, setWsPort] = useState('9001');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useTls, setUseTls] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    loadConfig();
    setConnected(mqttService.isConnected());
    const unsub = mqttService.onConnectionChange(setConnected);
    return unsub;
  }, []);

  async function loadConfig() {
    const config = await mqttService.loadConfig();
    setHost(config.host);
    setPort(String(config.port));
    setWsPort(String(config.wsPort));
    setUsername(config.username ?? '');
    setPassword(config.password ?? '');
    setUseTls(config.useTls ?? false);
    setLoading(false);
  }

  function buildConfig(): MqttConfig {
    return {
      host: host.trim(),
      port: parseInt(port, 10) || 1883,
      wsPort: parseInt(wsPort, 10) || 9001,
      username: username.trim() || undefined,
      password: password.trim() || undefined,
      useTls,
    };
  }

  async function handleSave() {
    if (!host.trim()) {
      Alert.alert('Missing', 'Broker host is required.');
      return;
    }
    await mqttService.saveConfig(buildConfig());
    Alert.alert('Saved', 'MQTT broker configuration saved.');
  }

  async function handleConnect() {
    if (!host.trim()) {
      Alert.alert('Missing', 'Enter the broker host first.');
      return;
    }
    setTesting(true);
    try {
      await mqttService.saveConfig(buildConfig());
      await mqttService.connect();
      Alert.alert('Connected', 'Successfully connected to the MQTT broker.');
    } catch (e: any) {
      Alert.alert('Connection Failed', e.message || 'Could not connect to broker.');
    }
    setTesting(false);
  }

  function handleDisconnect() {
    mqttService.disconnect();
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
      {/* Status banner */}
      <View style={[styles.statusBanner, connected ? styles.bannerOnline : styles.bannerOffline]}>
        <MaterialCommunityIcons
          name={connected ? 'check-network' : 'close-network'}
          size={24}
          color={connected ? colors.success : colors.textSecondary}
        />
        <View style={styles.bannerInfo}>
          <Text style={styles.bannerTitle}>
            {connected ? 'Connected' : 'Not Connected'}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {connected ? `${host}:${wsPort}` : 'Configure your MQTT broker below'}
          </Text>
        </View>
        {connected && (
          <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Setup guide */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>MQTT Broker Setup</Text>
        <Text style={styles.infoText}>
          The bridge server communicates with your Gosund devices locally and publishes state to an
          MQTT broker. This app connects to the same broker via WebSocket.
        </Text>
        <View style={styles.divider} />
        <Text style={styles.infoSubtitle}>Quick Start with Mosquitto:</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`# Install Mosquitto (macOS)\nbrew install mosquitto\n\n# Enable WebSocket listener\n# Add to /usr/local/etc/mosquitto/mosquitto.conf:\nlistener 1883\nlistener 9001\nprotocol websockets\n\n# Start broker\nbrew services start mosquitto`}
          </Text>
        </View>
      </View>

      {/* Form */}
      <Text style={styles.sectionTitle}>Broker Settings</Text>

      <Text style={styles.label}>Host / IP Address</Text>
      <TextInput
        style={styles.input}
        value={host}
        onChangeText={setHost}
        placeholder="e.g. 192.168.1.100 or mqtt.local"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>MQTT Port</Text>
          <TextInput
            style={styles.input}
            value={port}
            onChangeText={setPort}
            placeholder="1883"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>WebSocket Port</Text>
          <TextInput
            style={styles.input}
            value={wsPort}
            onChangeText={setWsPort}
            placeholder="9001"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Text style={styles.label}>Username (optional)</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="Leave empty for no auth"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Password (optional)</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Leave empty for no auth"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Use TLS (wss://)</Text>
        <Switch
          value={useTls}
          onValueChange={setUseTls}
          trackColor={{ false: colors.surfaceLight, true: colors.primary }}
          thumbColor={colors.text}
        />
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleSave}
      >
        <MaterialCommunityIcons name="content-save" size={20} color={colors.text} />
        <Text style={styles.buttonText}>Save Configuration</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, connected ? styles.successButton : styles.secondaryButton]}
        onPress={handleConnect}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <MaterialCommunityIcons
              name="connection"
              size={20}
              color={connected ? colors.success : colors.primary}
            />
            <Text style={[styles.buttonText, { color: connected ? colors.success : colors.primary }]}>
              {connected ? 'Reconnect' : 'Connect to Broker'}
            </Text>
          </>
        )}
      </TouchableOpacity>
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  bannerOnline: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success + '40',
  },
  bannerOffline: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  bannerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  bannerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  bannerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  disconnectBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
  },
  disconnectText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  infoSubtitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  codeBlock: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 20,
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
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleLabel: {
    ...typography.body,
    color: colors.text,
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
  successButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.success,
  },
  buttonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
