// 계획된 루틴을 운동 기록(세트 목록)으로 바꾼다

import { suggest } from './progress';
import type { PlannedExercise } from './routine';
import type { ExerciseLog, Place, WorkoutLog } from '@/types/models';

export function toExerciseLogs(plan: PlannedExercise[], place: Place, logs: WorkoutLog[]): ExerciseLog[] {
  return plan
    .filter((p) => p.exercise && p.prescription)
    .map((p) => {
      const ex = p.exercise!;
      const rx = p.prescription!;
      const s = suggest(ex, rx, place, logs);
      return {
        exerciseId: ex.id,
        pattern: ex.pattern,
        target: `${rx.sets}세트 × ${rx.target}`,
        restSec: rx.restSec,
        note: s.note,
        sets: Array.from({ length: rx.sets }, () => ({ reps: s.reps, weightKg: s.weightKg ?? 0, done: false })),
      };
    });
}

/** 기록의 총 볼륨(kg) — 무게 × 반복 */
export function volume(log: WorkoutLog): number {
  return log.exercises.reduce((sum, e) => sum + e.sets.filter((s) => s.done).reduce((a, s) => a + s.weightKg * s.reps, 0), 0);
}

/** 루틴 예상 소요 시간(분): 세트당 수행 40초 + 휴식, 유산소는 처방 시간, 워밍업 5분 */
export function estimateMinutes(plan: PlannedExercise[]): number {
  const seconds = plan.reduce((sum, p) => {
    if (!p.exercise || !p.prescription) return sum;
    if (p.exercise.pattern === 'cardio') return sum + p.prescription.repMin * 60;
    return sum + p.prescription.sets * (40 + p.prescription.restSec);
  }, 0);
  return Math.round(seconds / 60) + 5;
}
