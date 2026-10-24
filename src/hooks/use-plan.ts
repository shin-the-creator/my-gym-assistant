// 화면 여러 곳에서 쓰는 파생 데이터(프로그램, 오늘 일정, 식단 목표)

import { useMemo } from 'react';

import { macroTargets } from '@/lib/body';
import { buildProgram, nextDayIndex } from '@/lib/routine';
import { buildDailySchedule, dailyWaterTarget } from '@/lib/schedule';
import { getSlots, hasFixedDays, isScheduledWeekday } from '@/lib/workout-slots';
import { dateKey } from '@/lib/time';
import { useStore } from '@/store/useStore';

export function useProgram() {
  const profile = useStore((s) => s.profile);
  const workouts = useStore((s) => s.workouts);
  const custom = useStore((s) => s.customProgram);
  return useMemo(() => {
    if (!profile) return { program: [], nextIndex: 0, isCustom: false };
    // 직접 만든 루틴이 있으면 그것을, 없으면 내 정보(주당 횟수·목표·경력)로 자동 추천
    const isCustom = !!custom && custom.length > 0;
    const program = isCustom ? custom : buildProgram(profile);
    return { program, nextIndex: nextDayIndex(program, workouts), isCustom };
  }, [profile, workouts, custom]);
}

/** 오늘 운동을 하는 날인지: 이미 했거나, 이번 주 목표 횟수를 아직 못 채웠으면 운동일 */
export function useIsWorkoutDay(): boolean {
  const profile = useStore((s) => s.profile);
  const workouts = useStore((s) => s.workouts);
  return useMemo(() => {
    if (!profile) return false;
    const today = dateKey();
    if (workouts.some((w) => w.date === today)) return true;
    const now = new Date();
    // 운동 요일을 정해 두었으면 그 요일이 운동일. 요일 미정 시간대만 있으면 아래 자동 판단을 쓴다
    if (hasFixedDays(profile)) {
      if (isScheduledWeekday(profile, now.getDay())) return true;
      if (!getSlots(profile).some((s) => s.days.length === 0)) return false;
    }
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const weekStart = dateKey(monday);
    const doneThisWeek = new Set(workouts.filter((w) => w.date >= weekStart).map((w) => w.date)).size;
    const daysLeft = 7 - ((now.getDay() + 6) % 7);
    const remaining = profile.workoutDaysPerWeek - doneThisWeek;
    // 남은 날 대비 남은 운동이 많을수록 오늘을 운동일로 본다. 연속 운동은 피하도록 어제 했으면 쉬는 날
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const didYesterday = workouts.some((w) => w.date === dateKey(yesterday));
    if (remaining <= 0) return false;
    if (remaining >= daysLeft) return true;
    return !didYesterday || profile.workoutDaysPerWeek >= 5;
  }, [profile, workouts]);
}

export function useToday() {
  const profile = useStore((s) => s.profile);
  const water = useStore((s) => s.water);
  const workoutDay = useIsWorkoutDay();
  return useMemo(() => {
    if (!profile) return null;
    const today = dateKey();
    const schedule = buildDailySchedule(profile, workoutDay);
    return {
      today,
      workoutDay,
      schedule,
      targets: macroTargets(profile),
      waterTarget: dailyWaterTarget(profile.weightKg, schedule.filter((i) => i.kind === 'workout').length),
      waterDrunk: water[today] ?? 0,
    };
  }, [profile, water, workoutDay]);
}
