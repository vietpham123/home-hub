import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList } from '../types';
import { colors } from '../theme';

import DashboardScreen from '../screens/DashboardScreen';
import RoomsScreen from '../screens/RoomsScreen';
import RoomDetailScreen from '../screens/RoomDetailScreen';
import DeviceDetailScreen from '../screens/DeviceDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GosundSetupScreen from '../screens/GosundSetupScreen';
import GosundDiscoveryScreen from '../screens/GosundDiscoveryScreen';
import MqttConfigScreen from '../screens/MqttConfigScreen';
import AddMqttDeviceScreen from '../screens/AddMqttDeviceScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Rooms"
        component={RoomsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="floor-plan" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RoomDetail"
          component={RoomDetailScreen}
          options={({ route }) => ({
            title: 'Room',
          })}
        />
        <Stack.Screen
          name="DeviceDetail"
          component={DeviceDetailScreen}
          options={{ title: 'Device' }}
        />
        <Stack.Screen
          name="GosundSetup"
          component={GosundSetupScreen}
          options={{ title: 'Gosund Setup' }}
        />
        <Stack.Screen
          name="GosundDiscovery"
          component={GosundDiscoveryScreen}
          options={{ title: 'Discover Devices' }}
        />
        <Stack.Screen
          name="MqttConfig"
          component={MqttConfigScreen}
          options={{ title: 'MQTT Broker' }}
        />
        <Stack.Screen
          name="AddMqttDevice"
          component={AddMqttDeviceScreen}
          options={{ title: 'Add MQTT Device' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
