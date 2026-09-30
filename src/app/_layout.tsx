import '../global.css';

import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/query';
import { SeasonProvider } from '@/lib/season';

void SplashScreen.preventAutoHideAsync();

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Minecraft: require('../../assets/fonts/Minecraft-regular.otf'),
    MinecraftBold: require('../../assets/fonts/Minecraft-bold.otf'),
  });

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SeasonProvider>
          <ThemeProvider value={DarkTheme}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: '#27272a' },
                headerTintColor: '#fafafa',
                headerTitleStyle: { fontFamily: 'Minecraft' },
                contentStyle: { backgroundColor: '#18181b' },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </ThemeProvider>
        </SeasonProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
