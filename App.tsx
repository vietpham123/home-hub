import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { DeviceProvider } from './src/store/DeviceContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DeviceProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </DeviceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
