// 화면 여러 곳에서 쓰는 파생 데이터(프로그램, 오늘 일정, 식단 목표)

import { useMemo } from 'react';

import { macroTargets, waterTargetMl } from '@/lib/body';
import { buildProgram, nextDayIndex } from '@/lib/routine';
import { buildDailySchedule } from '@/lib/schedule';
import { dateKey } from '@/lib/time';
import { useStore } from '@/store/useStore';

export function useProgram() {
  const profile = useStore((s) => s.profile);
  const workouts = useStore((s) => s.workouts);
  return useMemo(() => {
    if (!profile) return { program: [], nextIndex: 0 };
    const program = buildProgram(profile);
    return { program, nextIndex: nextDayIndex(program, workouts) };
  }, [profile, workouts]);
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
    return {
      today,
      workoutDay,
      schedule: buildDailySchedule(profile, workoutDay),
      targets: macroTargets(profile),
      waterTarget: waterTargetMl(profile.weightKg, workoutDay),
      waterDrunk: water[today] ?? 0,
    };
  }, [profile, water, workoutDay]);
}
