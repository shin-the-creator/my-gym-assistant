// 달력 스케줄러: 직접 넣은 일정(반복 포함)과, 운동 시간대로 계산한 "운동 예정"을 날짜별로 펼친다.

import type { CalendarEvent, EventKind, Profile, WorkoutAdjust, WorkoutLog } from '@/types/models';
import type { ProgramDay } from './routine';
import { dateKey, toMinutes } from './time';
import { slotsForWeekday } from './workout-slots';

export const EVENT_KINDS: Record<EventKind, string> = {
  exam: '시험',
  study: '학원·공부',
  appointment: '약속',
  other: '기타',
};

export const REMIND_OPTIONS: { label: string; min?: number }[] = [
  { label: '알림 없음' },
  { label: '10분 전', min: 10 },
  { label: '30분 전', min: 30 },
  { label: '1시간 전', min: 60 },
  { label: '하루 전', min: 24 * 60 },
];

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const weekdayOf = (date: string) => new Date(`${date}T00:00:00`).getDay();

/** 그 날짜에 해당하는 일정(반복 일정 포함), 시간 순 */
export function eventsOn(events: CalendarEvent[], date: string): CalendarEvent[] {
  return events
    .filter((e) => (e.repeatDays && e.repeatDays.length > 0 ? date >= e.date && e.repeatDays.includes(weekdayOf(date)) : e.date === date))
    .sort((a, b) => (a.time ? toMinutes(a.time) : -1) - (b.time ? toMinutes(b.time) : -1));
}

export interface PlannedWorkout {
  date: string;
  /** 운동하던 원래 날짜(옮긴 경우 다름) */
  from: string;
  time: string;
  label?: string;
  /** 그날 할 분할(전신 A, 미는 날 …) */
  dayName?: string;
  moved: boolean;
}

/**
 * 오늘부터 to까지 운동 예정. 운동 시간대에 요일을 정한 경우에만 계산된다.
 * 건너뛴 날은 빼고, 옮긴 날은 옮긴 날짜에 넣는다. 오늘 이미 운동했으면 오늘 예정은 없다.
 * 분할 이름은 다음에 할 데이부터 예정 순서대로 붙인다(장소와 무관하게 이어지는 순서).
 */
export function plannedWorkouts(
  profile: Pick<Profile, 'workoutSlots' | 'workoutTime'>,
  program: ProgramDay[],
  nextIndex: number,
  logs: WorkoutLog[],
  adjust: WorkoutAdjust,
  to: string,
  today: string = dateKey(),
): Record<string, PlannedWorkout[]> {
  const doneDates = new Set(logs.map((l) => l.date));
  const base: PlannedWorkout[] = [];
  for (const date of dateRange(today, to)) {
    const slots = slotsForWeekday(profile, weekdayOf(date)).filter((s) => s.days.length > 0);
    if (slots.length === 0) continue;
    const a = adjust[date];
    if (a?.skip) continue;
    const target = a?.movedTo ?? date;
    // 같은 날 여러 시간대(아침 유산소+저녁 웨이트)는 한 번의 분할 운동으로 묶는다
    const main = slots[slots.length - 1];
    base.push({ date: target, from: date, time: main.time, label: slots.map((s) => s.label).filter(Boolean).join(' · ') || undefined, moved: target !== date });
  }
  // 옮겨 온 예정(오늘 이전 날짜에서 옮긴 것 포함)
  for (const [from, a] of Object.entries(adjust)) {
    if (!a.movedTo || from >= today || a.movedTo < today || a.movedTo > to) continue;
    const slots = slotsForWeekday(profile, weekdayOf(from)).filter((s) => s.days.length > 0);
    const main = slots[slots.length - 1];
    if (main) base.push({ date: a.movedTo, from, time: main.time, label: main.label, moved: true });
  }

  const sorted = base.filter((p) => !(p.date === today && doneDates.has(today))).sort((x, y) => x.date.localeCompare(y.date) || toMinutes(x.time) - toMinutes(y.time));
  const out: Record<string, PlannedWorkout[]> = {};
  let i = 0;
  for (const p of sorted) {
    const named = { ...p, dayName: program.length ? program[(nextIndex + i) % program.length].name : undefined };
    i += 1;
    (out[p.date] ??= []).push(named);
  }
  return out;
}

/** 예정 운동을 하루 미룬다(이미 옮긴 것이면 거기서 하루 더) */
export function postponeOneDay(adjust: WorkoutAdjust, from: string, current: string): WorkoutAdjust {
  return { ...adjust, [from]: { movedTo: addDays(current, 1) } };
}

export function skipWorkout(adjust: WorkoutAdjust, from: string): WorkoutAdjust {
  return { ...adjust, [from]: { skip: true } };
}

export function resetAdjust(adjust: WorkoutAdjust, from: string): WorkoutAdjust {
  const next = { ...adjust };
  delete next[from];
  return next;
}

/** 오늘이 운동일인지에 대한 조정: 건너뛴 날은 쉬고, 옮겨 온 날은 운동 */
export function adjustedWorkoutDay(base: boolean, adjust: WorkoutAdjust, today: string = dateKey()): boolean {
  if (Object.values(adjust).some((a) => a.movedTo === today)) return true;
  const a = adjust[today];
  if (a?.skip || (a?.movedTo && a.movedTo !== today)) return false;
  return base;
}

export interface EventReminder {
  key: string;
  title: string;
  body: string;
  at: Date;
}

/**
 * 앞으로 days일 동안 울릴 일정 알림. 반복 일정은 날짜마다 하나씩 펼친다
 * (앱을 열 때마다 다시 등록하므로 한 달치면 충분하다). 기기 알림 개수 제한 때문에 max개까지만.
 */
export function eventReminders(events: CalendarEvent[], now: Date, days = 30, max = 40): EventReminder[] {
  const withRemind = events.filter((e) => e.time && e.remindMin);
  if (withRemind.length === 0) return [];
  const today = dateKey(now);
  const out: EventReminder[] = [];
  // 하루 전 알림 때문에 하루 더 본다
  for (const date of dateRange(today, addDays(today, days + 1))) {
    for (const e of eventsOn(withRemind, date)) {
      const [h, m] = e.time!.split(':').map(Number);
      const start = new Date(`${date}T00:00:00`);
      start.setHours(h, m, 0, 0);
      const at = new Date(start.getTime() - e.remindMin! * 60000);
      if (at <= now) continue;
      const before = e.remindMin! >= 24 * 60 ? '내일' : e.remindMin! >= 60 ? `${e.remindMin! / 60}시간 뒤` : `${e.remindMin}분 뒤`;
      out.push({ key: `${e.id}-${date}`, title: `📅 ${e.title}`, body: `${before} ${e.time} · ${EVENT_KINDS[e.kind]}${e.memo ? ` · ${e.memo}` : ''}`, at });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, max);
}
