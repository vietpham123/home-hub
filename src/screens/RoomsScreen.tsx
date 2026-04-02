import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { rooms } from '../data/mockData';
import { RootStackParamList } from '../types';
import { colors, spacing, typography } from '../theme';
import RoomCard from '../components/RoomCard';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function RoomsScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Rooms</Text>
      <Text style={styles.subtitle}>{rooms.length} rooms configured</Text>
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          onPress={() => navigation.navigate('RoomDetail', { roomId: room.id })}
        />
      ))}
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
});
