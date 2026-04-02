import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDeviceStore } from '../store/DeviceContext';
import { RootStackParamList, DeviceType, Light, Plug, Thermostat, Lock, Camera, Blinds, Sensor, AnyDevice } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMqttDevice'>;

const DEVICE_TYPES: { type: DeviceType; label: string; icon: string }[] = [
  { type: 'light', label: 'Light', icon: 'lightbulb-on' },
  { type: 'plug', label: 'Smart Plug', icon: 'power-plug' },
  { type: 'thermostat', label: 'Thermostat', icon: 'thermometer' },
  { type: 'lock', label: 'Lock', icon: 'lock' },
  { type: 'camera', label: 'Camera', icon: 'cctv' },
  { type: 'blinds', label: 'Blinds', icon: 'blinds' },
  { type: 'sensor', label: 'Sensor', icon: 'chip' },
];

export default function AddMqttDeviceScreen({ navigation }: Props) {
  const { rooms, addDeviceToRoom, addRoom } = useDeviceStore();
  const [name, setName] = useState('');
  const [mqttId, setMqttId] = useState('');
  const [selectedType, setSelectedType] = useState<DeviceType>('light');
  const [selectedRoom, setSelectedRoom] = useState(rooms[0]?.id ?? '');
  const [newRoomName, setNewRoomName] = useState('');
  const [showNewRoom, setShowNewRoom] = useState(false);

  function handleCreateRoom() {
    const trimmed = newRoomName.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Enter a room name.');
      return;
    }
    const roomId = trimmed.toLowerCase().replace(/\s+/g, '-');
    if (rooms.find(r => r.id === roomId)) {
      Alert.alert('Error', 'A room with that name already exists.');
      return;
    }
    addRoom({ id: roomId, name: trimmed, icon: 'door', devices: [] });
    setSelectedRoom(roomId);
    setNewRoomName('');
    setShowNewRoom(false);
  }

  function handleAdd() {
    const trimName = name.trim();
    const trimId = mqttId.trim();

    if (!trimName) {
      Alert.alert('Error', 'Enter a device name.');
      return;
    }
    if (!trimId) {
      Alert.alert('Error', 'Enter an MQTT Device ID.');
      return;
    }
    if (!selectedRoom) {
      Alert.alert('Error', 'Select a room.');
      return;
    }

    const deviceId = `mqtt-${trimId}`;
    const base = {
      id: deviceId,
      name: trimName,
      type: selectedType,
      roomId: selectedRoom,
      isOnline: true,
      icon: DEVICE_TYPES.find(t => t.type === selectedType)?.icon ?? 'devices',
      source: 'mqtt' as const,
      gosundDeviceId: trimId,
    };

    let device: AnyDevice;
    switch (selectedType) {
      case 'light':
        device = { ...base, type: 'light', isOn: false, brightness: 100, color: '#FFFFFF' } as Light;
        break;
      case 'plug':
        device = { ...base, type: 'plug', isOn: false } as Plug;
        break;
      case 'thermostat':
        device = { ...base, type: 'thermostat', currentTemp: 20, targetTemp: 22, mode: 'auto' } as Thermostat;
        break;
      case 'lock':
        device = { ...base, type: 'lock', isLocked: true } as Lock;
        break;
      case 'camera':
        device = { ...base, type: 'camera', isRecording: false } as Camera;
        break;
      case 'blinds':
        device = { ...base, type: 'blinds', position: 100 } as Blinds;
        break;
      case 'sensor':
        device = { ...base, type: 'sensor', sensorKind: 'temperature', value: 0, unit: '°C' } as Sensor;
        break;
    }

    addDeviceToRoom(device, selectedRoom);
    const roomName = rooms.find(r => r.id === selectedRoom)?.name ?? selectedRoom;
    Alert.alert('Device Added', `${trimName} added to ${roomName}.\n\nMQTT topics:\n• smarthouse/${trimId}/state\n• smarthouse/${trimId}/command`, [
      { text: 'Add Another', onPress: () => { setName(''); setMqttId(''); } },
      { text: 'Done', onPress: () => navigation.goBack() },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Info banner */}
      <View style={styles.infoBanner}>
        <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Add a device that communicates over MQTT. The app will subscribe to{' '}
          <Text style={styles.code}>smarthouse/{'<id>'}/state</Text> and publish commands to{' '}
          <Text style={styles.code}>smarthouse/{'<id>'}/command</Text>.
        </Text>
      </View>

      {/* Device Name */}
      <Text style={styles.label}>Device Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Living Room Lamp"
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={setName}
      />

      {/* MQTT Device ID */}
      <Text style={styles.label}>MQTT Device ID</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. gosund-bulb-01 or bf3a7c..."
        placeholderTextColor={colors.textSecondary}
        value={mqttId}
        onChangeText={setMqttId}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.hint}>
        This is the Tuya device ID from your bridge config, or any unique identifier you use in your MQTT topics.
      </Text>

      {/* Device Type */}
      <Text style={styles.label}>Device Type</Text>
      <View style={styles.typeGrid}>
        {DEVICE_TYPES.map(({ type, label, icon }) => (
          <TouchableOpacity
            key={type}
            style={[styles.typeCard, selectedType === type && styles.typeCardSelected]}
            onPress={() => setSelectedType(type)}
          >
            <MaterialCommunityIcons
              name={icon as any}
              size={28}
              color={selectedType === type ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[styles.typeLabel, selectedType === type && styles.typeLabelSelected]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Room */}
      <Text style={styles.label}>Room</Text>
      <View style={styles.roomList}>
        {rooms.map((room) => (
          <TouchableOpacity
            key={room.id}
            style={[styles.roomChip, selectedRoom === room.id && styles.roomChipSelected]}
            onPress={() => setSelectedRoom(room.id)}
          >
            <MaterialCommunityIcons
              name={room.icon as any}
              size={18}
              color={selectedRoom === room.id ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[styles.roomChipText, selectedRoom === room.id && styles.roomChipTextSelected]}
            >
              {room.name}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.roomChip, { borderStyle: 'dashed' }]}
          onPress={() => setShowNewRoom(!showNewRoom)}
        >
          <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
          <Text style={[styles.roomChipText, { color: colors.primary }]}>New Room</Text>
        </TouchableOpacity>
      </View>

      {showNewRoom && (
        <View style={styles.newRoomRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Room name (e.g. Living Room)"
            placeholderTextColor={colors.textSecondary}
            value={newRoomName}
            onChangeText={setNewRoomName}
          />
          <TouchableOpacity style={styles.newRoomBtn} onPress={handleCreateRoom}>
            <MaterialCommunityIcons name="check" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Add Button */}
      <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
        <MaterialCommunityIcons name="plus-circle" size={22} color={colors.text} />
        <Text style={styles.addBtnText}>Add Device</Text>
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
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  code: {
    fontFamily: 'monospace',
    color: colors.primary,
    fontSize: 13,
  },
  label: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    width: '31%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  typeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  typeLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  roomList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roomChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  roomChipText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  roomChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  addBtnText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginLeft: spacing.sm,
    fontSize: 16,
  },
  newRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  newRoomBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
