// 오늘의 운동량 추정: 운동 시간, 운동 칼로리, 목표치

import type { Goal, WorkoutLog } from '@/types/models';

/** 근력 운동 MET(대사당량) — 웨이트 약 5, 맨몸 위주 약 4 */
const STRENGTH_MET = 5;

/** MET 공식: kcal/분 = MET × 3.5 × 체중(kg) / 200 */
export function workoutKcal(minutes: number, weightKg: number, met = STRENGTH_MET): number {
  return (met * 3.5 * weightKg * minutes) / 200;
}

export function workoutMinutesOn(date: string, workouts: WorkoutLog[], active: WorkoutLog | null, now = Date.now()): number {
  const done = workouts
    .filter((w) => w.date === date && w.finishedAt)
    .reduce((sum, w) => sum + ((w.finishedAt ?? w.startedAt) - w.startedAt) / 60000, 0);
  const running = active && active.date === date ? (now - active.startedAt) / 60000 : 0;
  return done + running;
}

export function activeKcalGoal(goal: Goal): number {
  // 근력 운동 45~60분(체중 60~75kg) 기준
  return { fat_loss: 400, maintain: 300, muscle_gain: 300, strength: 300 }[goal];
}
