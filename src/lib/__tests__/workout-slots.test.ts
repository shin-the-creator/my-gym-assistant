import { buildDailySchedule, dailyWaterTarget, totalWaterMl, workoutTimesFor } from '../schedule';
import { describeSlot, formatDays, formatTimeKo, getSlots, hasFixedDays, isScheduledWeekday, scheduledDaysPerWeek, slotsForWeekday } from '../workout-slots';
import { profile } from './fixtures';
import type { Profile } from '@/types/models';

const withSlots: Profile = {
  ...profile,
  workoutSlots: [
    { id: 'a', days: [1, 3, 5], time: '19:30', label: '웨이트' },
    { id: 'b', days: [1, 3], time: '07:30', label: '아침 유산소' },
    { id: 'c', days: [6], time: '10:00' },
  ],
};

describe('workout slots', () => {
  it('falls back to the single legacy time', () => {
    expect(getSlots(profile)).toEqual([{ id: 'default', days: [], time: '19:00' }]);
    expect(hasFixedDays(profile)).toBe(false);
  });

  it('finds the slots for a weekday in time order', () => {
    expect(slotsForWeekday(withSlots, 1).map((s) => s.time)).toEqual(['07:30', '19:30']);
    expect(slotsForWeekday(withSlots, 6).map((s) => s.time)).toEqual(['10:00']);
    expect(slotsForWeekday(withSlots, 2)).toEqual([]);
    expect(isScheduledWeekday(withSlots, 5)).toBe(true);
    expect(isScheduledWeekday(withSlots, 0)).toBe(false);
    expect(scheduledDaysPerWeek(withSlots.workoutSlots!)).toBe(4);
  });

  it('formats days and times in Korean', () => {
    expect(formatTimeKo('19:30')).toBe('오후 7:30');
    expect(formatTimeKo('00:05')).toBe('오전 12:05');
    expect(formatTimeKo('12:00')).toBe('오후 12:00');
    expect(formatDays([5, 1, 3])).toBe('월·수·금');
    expect(formatDays([1, 2, 3, 4, 5])).toBe('평일');
    expect(formatDays([0, 6])).toBe('주말');
    expect(formatDays([])).toBe('요일 미정');
    expect(describeSlot(withSlots.workoutSlots![0])).toBe('웨이트 · 월·수·금 오후 7:30');
  });
});

describe('schedule with several workouts', () => {
  const monday = new Date('2026-10-26T09:00:00');

  it('puts both workouts of the day into the schedule with water for each', () => {
    const items = buildDailySchedule(withSlots, true, monday);
    const workouts = items.filter((i) => i.kind === 'workout');
    expect(workouts.map((w) => `${w.time} ${w.title}`)).toEqual(['07:30 운동 · 아침 유산소', '19:30 운동 · 웨이트']);
    expect(items.filter((i) => i.title === '운동 중 물').map((i) => i.amountMl)).toEqual([500, 300]);
    expect(Math.abs(totalWaterMl(items) - dailyWaterTarget(withSlots.weightKg, 2))).toBeLessThanOrEqual(100);
    const minutes = items.map((i) => i.minutes);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
  });

  it('uses the first slot when training on a day without a slot, and none on rest days', () => {
    const tuesday = new Date('2026-10-27T09:00:00');
    expect(workoutTimesFor(withSlots, true, tuesday.getDay())).toHaveLength(1);
    expect(buildDailySchedule(withSlots, false, tuesday).some((i) => i.kind === 'workout')).toBe(false);
  });
});
