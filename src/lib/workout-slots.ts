// 운동 시간대(요일 + 시각) 계산

import type { Profile, WorkoutSlot } from '@/types/models';
import { toMinutes } from './time';

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/** 운동 시간대 목록. 예전 데이터(workoutTime 하나)는 요일 미정 시간대 하나로 본다 */
export function getSlots(p: Pick<Profile, 'workoutSlots' | 'workoutTime'>): WorkoutSlot[] {
  if (p.workoutSlots && p.workoutSlots.length > 0) return p.workoutSlots;
  return [{ id: 'default', days: [], time: p.workoutTime || '19:00' }];
}

/** 요일을 정한 시간대가 하나라도 있는가 */
export function hasFixedDays(p: Pick<Profile, 'workoutSlots' | 'workoutTime'>): boolean {
  return getSlots(p).some((s) => s.days.length > 0);
}

/** 그 요일에 하는 운동 시간대(시각 순). 요일 미정 시간대도 포함 */
export function slotsForWeekday(p: Pick<Profile, 'workoutSlots' | 'workoutTime'>, weekday: number): WorkoutSlot[] {
  return getSlots(p)
    .filter((s) => s.days.length === 0 || s.days.includes(weekday))
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}

/** 요일이 정해진 시간대에 그 요일이 들어 있는가 */
export function isScheduledWeekday(p: Pick<Profile, 'workoutSlots' | 'workoutTime'>, weekday: number): boolean {
  return getSlots(p).some((s) => s.days.includes(weekday));
}

/** 주당 운동하는 요일 수(정해진 요일 기준). 정한 요일이 없으면 null */
export function scheduledDaysPerWeek(slots: WorkoutSlot[]): number | null {
  const days = new Set(slots.flatMap((s) => s.days));
  return days.size > 0 ? days.size : null;
}

export function formatDays(days: number[]): string {
  if (days.length === 0) return '요일 미정';
  if (days.length === 7) return '매일';
  const sorted = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // 월요일부터
  const key = sorted.join(',');
  if (key === '1,2,3,4,5') return '평일';
  if (key === '6,0') return '주말';
  return sorted.map((d) => DAY_NAMES[d]).join('·');
}

/** "19:30" → "오후 7:30" */
export function formatTimeKo(hhmm: string): string {
  const total = toMinutes(hhmm);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(m).padStart(2, '0')}`;
}

export function describeSlot(s: WorkoutSlot): string {
  return `${s.label ? `${s.label} · ` : ''}${formatDays(s.days)} ${formatTimeKo(s.time)}`;
}
