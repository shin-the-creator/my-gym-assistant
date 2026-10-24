import { adjustedWorkoutDay, eventReminders, eventsOn, plannedWorkouts, postponeOneDay, resetAdjust, skipWorkout } from '../scheduler';
import type { ProgramDay } from '../routine';
import { profile } from './fixtures';
import type { CalendarEvent, Profile, WorkoutLog } from '@/types/models';

// 2026-10-26은 월요일
const withSlots: Profile = {
  ...profile,
  workoutSlots: [
    { id: 'a', days: [1, 3, 5], time: '19:30', label: '웨이트' },
    { id: 'b', days: [1], time: '07:00', label: '아침 유산소' },
  ],
};
const program = [{ name: '미는 날' }, { name: '당기는 날' }, { name: '하체 날' }] as ProgramDay[];

describe('events', () => {
  const events: CalendarEvent[] = [
    { id: '1', title: '수학 학원', kind: 'study', date: '2026-10-26', time: '18:00', repeatDays: [1, 3], remindMin: 30 },
    { id: '2', title: '중간고사', kind: 'exam', date: '2026-10-28' },
    { id: '3', title: '친구 약속', kind: 'appointment', date: '2026-10-28', time: '12:00', remindMin: 24 * 60 },
  ];

  it('expands weekly repeats from the start date, all-day first', () => {
    expect(eventsOn(events, '2026-10-19')).toEqual([]); // 시작 전 월요일
    expect(eventsOn(events, '2026-11-02').map((e) => e.id)).toEqual(['1']);
    expect(eventsOn(events, '2026-10-28').map((e) => e.id)).toEqual(['2', '3', '1']);
  });

  it('builds reminders only for future timed events', () => {
    const now = new Date('2026-10-26T17:45:00');
    const r = eventReminders(events, now, 7);
    // 오늘 18:00 학원의 30분 전(17:30)은 이미 지났다
    expect(r[0].key).toBe('3-2026-10-28');
    expect(r[0].at.getTime()).toBe(new Date('2026-10-27T12:00:00').getTime());
    expect(r[0].body).toContain('내일 12:00');
    expect(r.map((x) => x.key)).toContain('1-2026-10-28');
    expect(r.some((x) => x.key.startsWith('2-'))).toBe(false);
  });
});

describe('planned workouts', () => {
  it('needs fixed days', () => {
    expect(plannedWorkouts(profile, program, 0, [], {}, '2026-11-01', '2026-10-26')).toEqual({});
  });

  it('plans fixed days, groups two slots a day and names the split in order', () => {
    const p = plannedWorkouts(withSlots, program, 1, [], {}, '2026-11-02', '2026-10-26');
    expect(Object.keys(p)).toEqual(['2026-10-26', '2026-10-28', '2026-10-30', '2026-11-02']);
    expect(p['2026-10-26']).toHaveLength(1);
    expect(p['2026-10-26'][0].time).toBe('19:30');
    expect(p['2026-10-26'][0].dayName).toBe('당기는 날');
    expect(p['2026-10-28'][0].dayName).toBe('하체 날');
    expect(p['2026-10-30'][0].dayName).toBe('미는 날');
  });

  it('drops today once logged', () => {
    const logs = [{ date: '2026-10-26' }] as WorkoutLog[];
    const p = plannedWorkouts(withSlots, program, 0, logs, {}, '2026-10-28', '2026-10-26');
    expect(Object.keys(p)).toEqual(['2026-10-28']);
    expect(p['2026-10-28'][0].dayName).toBe('미는 날');
  });

  it('skips and postpones without breaking the split order', () => {
    let adjust = skipWorkout({}, '2026-10-26');
    let p = plannedWorkouts(withSlots, program, 0, [], adjust, '2026-10-30', '2026-10-26');
    expect(Object.keys(p)).toEqual(['2026-10-28', '2026-10-30']);
    expect(p['2026-10-28'][0].dayName).toBe('미는 날');

    adjust = postponeOneDay({}, '2026-10-26', '2026-10-26');
    p = plannedWorkouts(withSlots, program, 0, [], adjust, '2026-10-30', '2026-10-26');
    expect(p['2026-10-27'][0]).toMatchObject({ from: '2026-10-26', moved: true, dayName: '미는 날' });
    // 한 번 더 미루면 원래 날짜 기준으로 하루 더
    adjust = postponeOneDay(adjust, '2026-10-26', '2026-10-27');
    expect(adjust['2026-10-26'].movedTo).toBe('2026-10-28');
    expect(resetAdjust(adjust, '2026-10-26')).toEqual({});
  });

  it('keeps a workout moved from a past day', () => {
    const p = plannedWorkouts(withSlots, program, 0, [], { '2026-10-23': { movedTo: '2026-10-27' } }, '2026-10-27', '2026-10-26');
    expect(p['2026-10-27'][0]).toMatchObject({ from: '2026-10-23', moved: true });
  });

  it('adjusts whether today is a workout day', () => {
    expect(adjustedWorkoutDay(true, skipWorkout({}, '2026-10-26'), '2026-10-26')).toBe(false);
    expect(adjustedWorkoutDay(false, { '2026-10-23': { movedTo: '2026-10-26' } }, '2026-10-26')).toBe(true);
    expect(adjustedWorkoutDay(true, { '2026-10-26': { movedTo: '2026-10-27' } }, '2026-10-26')).toBe(false);
  });
});
