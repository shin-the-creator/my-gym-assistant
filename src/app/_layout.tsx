import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

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
  const c = useTheme();
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;

  // 앱 전체를 매트 다크 테마로 고정한다
  const base = DarkTheme;
  return (
    <KeyboardProvider>
    <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: c.primary, background: c.background, card: c.card, text: c.text, border: c.border } }}>
      <StatusBar style="light" />
      <ReminderSync />
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: c.background },
          headerTintColor: c.text,
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.background },
          // 안드로이드에서도 iOS처럼 옆에서 부드럽게 밀려 들어오는 전환
          animation: 'ios_from_right',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: '내 정보', presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="place/new" options={{ title: '장소 추가', presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="place/[id]" options={{ title: '장소' }} />
        <Stack.Screen name="session" options={{ title: '운동 기록', gestureEnabled: false }} />
        <Stack.Screen name="settings" options={{ title: '설정' }} />
        <Stack.Screen name="coach" options={{ title: 'AI 코치' }} />
        <Stack.Screen name="food" options={{ title: '음식 기록', presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="school" options={{ title: '학교 급식 연결' }} />
        <Stack.Screen name="feedback" options={{ title: '의견 보내기' }} />
      </Stack>
    </ThemeProvider>
    </KeyboardProvider>
  );
}
