// 하루 일과표를 매일 반복 알림으로 등록하고(물·식사·취침), 달력 일정 알림을 날짜 알림으로 등록한다.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { ScheduleItem } from './schedule';
import { eventReminders } from './scheduler';
import type { CalendarEvent, Settings } from '@/types/models';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('routine', {
      name: '건강 루틴 알림',
      // eslint-disable-next-line import/namespace -- 타입 재수출이라 린터가 못 찾을 뿐 실제로 존재한다
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** 기존 알림을 모두 지우고 설정에 맞게 다시 등록한다. 등록한 개수를 돌려준다 */
export async function syncReminders(items: ScheduleItem[], settings: Settings, events: CalendarEvent[] = []): Promise<number> {
  if (Platform.OS === 'web') return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const wanted = items.filter(
    (i) =>
      (settings.waterReminders && i.kind === 'water') ||
      (settings.mealReminders && (i.kind === 'meal' || i.kind === 'snack')) ||
      (settings.sleepReminder && (i.kind === 'winddown' || i.kind === 'sleep')),
  );
  const eventAlarms = eventReminders(events, new Date());
  if (wanted.length === 0 && eventAlarms.length === 0) return 0;
  if (!(await ensurePermission())) return 0;

  for (const alarm of eventAlarms) {
    await Notifications.scheduleNotificationAsync({
      content: { title: alarm.title, body: alarm.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: alarm.at, channelId: 'routine' },
    });
  }

  for (const item of wanted) {
    const [hour, minute] = item.time.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.kind === 'water' ? `💧 ${item.title}` : item.kind === 'sleep' || item.kind === 'winddown' ? `🌙 ${item.title}` : `🍽️ ${item.title}`,
        body: item.amountMl ? `${item.amountMl}ml 마실 시간이에요.` : (item.detail ?? ''),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'routine' },
    });
  }
  return wanted.length + eventAlarms.length;
}
