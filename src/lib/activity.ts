// 오늘의 활동량 추정: 운동 시간, 활동 칼로리(운동 + 걸음), 목표치

import type { Goal, WorkoutLog } from '@/types/models';

/** 근력 운동 MET(대사당량) — 웨이트 약 5, 맨몸 위주 약 4 */
const STRENGTH_MET = 5;

/** MET 공식: kcal/분 = MET × 3.5 × 체중(kg) / 200 */
export function workoutKcal(minutes: number, weightKg: number, met = STRENGTH_MET): number {
  return (met * 3.5 * weightKg * minutes) / 200;
}

/** 걸음당 약 0.0005 × 체중(kg) kcal (70kg 기준 1만 보 ≈ 350kcal) */
export function stepsKcal(steps: number, weightKg: number): number {
  return steps * 0.0005 * weightKg;
}

export function workoutMinutesOn(date: string, workouts: WorkoutLog[], active: WorkoutLog | null, now = Date.now()): number {
  const done = workouts
    .filter((w) => w.date === date && w.finishedAt)
    .reduce((sum, w) => sum + ((w.finishedAt ?? w.startedAt) - w.startedAt) / 60000, 0);
  const running = active && active.date === date ? (now - active.startedAt) / 60000 : 0;
  return done + running;
}

export function activeKcalGoal(goal: Goal): number {
  // 근력 운동 45~60분 + 걸음 목표(체중 60~75kg) 기준
  return { fat_loss: 500, maintain: 400, muscle_gain: 350, strength: 350 }[goal];
}

export function stepGoal(goal: Goal): number {
  return goal === 'fat_loss' ? 10000 : 8000;
}
