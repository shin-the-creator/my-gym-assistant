import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { useToday } from '@/hooks/use-plan';
import { useTheme } from '@/hooks/use-theme';
import { syncReminders } from '@/lib/notifications';
import { useHydrated, useStore } from '@/store/useStore';

SplashScreen.preventAutoHideAsync();

/** 일과(기상·운동 시간, 운동일 여부)나 알림 설정이 바뀌면 매일 반복 알림을 다시 등록한다 */
function ReminderSync() {
  const today = useToday();
  const settings = useStore((s) => s.settings);
  const signature = today ? today.schedule.map((i) => `${i.time}${i.kind}${i.amountMl ?? ''}`).join('|') : '';
  useEffect(() => {
    if (!today) return;
    syncReminders(today.schedule, settings).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, settings.waterReminders, settings.mealReminders, settings.sleepReminder]);
  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = useTheme();
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: c.primary, background: c.background, card: c.card, text: c.text, border: c.border } }}>
      <StatusBar style="auto" />
      <ReminderSync />
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: c.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: '내 정보', presentation: 'modal' }} />
        <Stack.Screen name="place/new" options={{ title: '장소 추가', presentation: 'modal' }} />
        <Stack.Screen name="place/[id]" options={{ title: '장소' }} />
        <Stack.Screen name="session" options={{ title: '운동 기록', gestureEnabled: false }} />
        <Stack.Screen name="settings" options={{ title: '설정' }} />
        <Stack.Screen name="coach" options={{ title: 'AI 코치' }} />
      </Stack>
    </ThemeProvider>
  );
}
