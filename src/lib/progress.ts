// 점진적 과부하: 지난 기록을 보고 오늘의 무게/반복 수를 제안한다.
// 장소마다 기구 세팅(최대 무게, 증가 단위)이 다르므로 그 범위 안으로 맞춘다.

import { type Exercise, getExercise } from '@/data/exercises';
import type { ExerciseLog, Place, WorkoutLog } from '@/types/models';
import type { Prescription } from './routine';

export interface Suggestion {
  weightKg?: number;
  reps: number;
  note: string;
}

interface History {
  log: ExerciseLog;
  placeId: string;
  date: string;
}

function lastHistory(logs: WorkoutLog[], match: (e: ExerciseLog) => boolean): History | undefined {
  const sorted = [...logs].sort((a, b) => b.startedAt - a.startedAt);
  for (const w of sorted) {
    const found = w.exercises.find((e) => match(e) && e.sets.some((s) => s.done));
    if (found) return { log: found, placeId: w.placeId, date: w.date };
  }
  return undefined;
}

/** 기구 세팅(장소별) — 없으면 일반적인 값 */
export function equipmentSetting(ex: Exercise, place: Place): { maxWeightKg?: number; incrementKg: number } {
  const ids = ex.loadEquipment ?? [];
  const setting = place.equipment.find((e) => ids.includes(e.equipmentId));
  const defaultInc = ids.includes('dumbbell') || ids.includes('kettlebell') ? 2 : ids.includes('barbell') || ids.includes('ez_bar') ? 2.5 : 5;
  return { maxWeightKg: setting?.maxWeightKg, incrementKg: setting?.incrementKg ?? defaultInc };
}

export function suggest(ex: Exercise, rx: Prescription, place: Place, logs: WorkoutLog[]): Suggestion {
  if (ex.load === 'time') {
    const prev = lastHistory(logs, (e) => e.exerciseId === ex.id);
    const best = prev ? Math.max(...prev.log.sets.filter((s) => s.done).map((s) => s.reps)) : 0;
    const target = prev ? Math.min(rx.repMax, best + 5) : rx.repMin;
    return { reps: target, note: prev ? `지난번 최고 ${best}${ex.pattern === 'cardio' ? '분' : '초'} → 조금 더 길게` : '편안한 강도로 시작해요' };
  }

  if (ex.load === 'bodyweight') {
    const prev = lastHistory(logs, (e) => e.exerciseId === ex.id);
    if (!prev) return { reps: rx.repMin, note: '처음 하는 운동이에요. 2회 정도 여유를 남기고 멈추세요.' };
    const done = prev.log.sets.filter((s) => s.done);
    const allTop = done.length > 0 && done.every((s) => s.reps >= rx.repMax);
    const best = Math.max(...done.map((s) => s.reps));
    if (allTop) return { reps: rx.repMax, note: '모든 세트를 최대 반복으로 해냈어요! 템포를 느리게(3초 내리기) 하거나 더 어려운 변형으로 바꿔 보세요.' };
    return { reps: Math.min(rx.repMax, best + 1), note: `지난번 최고 ${best}회 → 한 개 더 도전` };
  }

  const { maxWeightKg, incrementKg } = equipmentSetting(ex, place);
  const same = lastHistory(logs, (e) => e.exerciseId === ex.id);

  if (!same) {
    const related = lastHistory(logs, (e) => e.pattern === ex.pattern);
    const relatedName = related ? getExercise(related.log.exerciseId)?.name : undefined;
    return {
      reps: rx.repMin,
      note: relatedName
        ? `이 운동은 처음이에요. 다른 곳에서 하던 ${relatedName}과 비슷한 힘듦(2~3회 여유)으로 무게를 찾아 기록해 두세요.`
        : '처음이니 가벼운 무게로 자세를 익히고, 2~3회 여유가 남는 무게를 찾아 기록하세요.',
    };
  }

  const done = same.log.sets.filter((s) => s.done);
  const topWeight = Math.max(...done.map((s) => s.weightKg));
  const atTop = done.filter((s) => s.weightKg === topWeight);
  const allHitTop = atTop.length >= Math.min(done.length, rx.sets) && atTop.every((s) => s.reps >= rx.repMax);
  const otherPlace = same.placeId !== place.id;

  let weight = topWeight;
  let reps = Math.min(rx.repMax, Math.max(...atTop.map((s) => s.reps)) + 1);
  let note = `지난번 ${topWeight}kg × ${Math.max(...atTop.map((s) => s.reps))}회 → 반복 수 +1`;

  if (allHitTop) {
    weight = topWeight + incrementKg;
    reps = rx.repMin;
    note = `지난번 모든 세트 성공! ${topWeight}kg → ${weight}kg으로 올려요`;
  }

  if (maxWeightKg !== undefined && weight > maxWeightKg) {
    weight = maxWeightKg;
    reps = rx.repMax;
    note = `이 장소의 최대 무게가 ${maxWeightKg}kg이에요. 무게 대신 반복 수를 늘리고, 내릴 때 3초로 천천히 하거나 세트 사이 휴식을 줄여 강도를 맞추세요.`;
  } else if (otherPlace) {
    note += ' (다른 장소 기록 기준 — 기구마다 무게 느낌이 다를 수 있어요)';
  }

  return { weightKg: weight, reps, note };
}
