// 하루 일과표: 기상 시각과 운동 시각을 기준으로 물·식사·수면 시각을 정한다.

import { ageFrom, waterTargetMl } from './body';
import { fromMinutes, toMinutes } from './time';
import type { Profile } from '@/types/models';

export type ScheduleKind = 'wake' | 'water' | 'meal' | 'snack' | 'workout' | 'winddown' | 'sleep';

export interface ScheduleItem {
  time: string;
  minutes: number;
  kind: ScheduleKind;
  title: string;
  detail?: string;
  /** 물 항목일 때 마실 양(ml) */
  amountMl?: number;
}

/** 나이별 권장 수면 시간(미국 수면재단) */
export function recommendedSleepHours(age: number): [number, number] {
  if (age < 18) return [8, 10];
  if (age < 65) return [7, 9];
  return [7, 8];
}

/**
 * 기상 시각에서 거꾸로 90분 수면 주기를 맞춰 취침 시각을 고른다.
 * 잠드는 데 걸리는 15분을 포함한다.
 */
export function bedtimeOptions(wakeTime: string, age: number): { time: string; cycles: number; hours: number; recommended: boolean }[] {
  const wake = toMinutes(wakeTime);
  const [lo, hi] = recommendedSleepHours(age);
  return [6, 5, 4].map((cycles) => {
    const hours = (cycles * 90) / 60;
    return {
      time: fromMinutes(wake - cycles * 90 - 15),
      cycles,
      hours,
      recommended: hours >= lo && hours <= hi,
    };
  });
}

export function recommendedBedtime(wakeTime: string, age: number): string {
  const options = bedtimeOptions(wakeTime, age);
  // 권장 범위 안에서 가장 긴 수면(5주기=7.5시간이 대부분)
  return (options.find((o) => o.recommended && o.cycles === 5) ?? options.find((o) => o.recommended) ?? options[1]).time;
}

export function buildDailySchedule(p: Profile, workoutDay: boolean, now?: Date): ScheduleItem[] {
  const age = ageFrom(p.birthYear, now);
  const wake = toMinutes(p.wakeTime);
  const bed = toMinutes(recommendedBedtime(p.wakeTime, age));
  // 취침 시각을 기상 이후의 분으로 펼친다(자정을 넘길 수 있음)
  const bedAbs = bed > wake ? bed : bed + 24 * 60;
  let workout = toMinutes(p.workoutTime);
  if (workout < wake) workout += 24 * 60;
  const hasWorkout = workoutDay && workout > wake + 30 && workout < bedAbs - 90;

  const items: ScheduleItem[] = [];
  const add = (minutes: number, kind: ScheduleKind, title: string, detail?: string, amountMl?: number) =>
    items.push({ minutes, time: fromMinutes(minutes), kind, title, detail, amountMl });

  add(wake, 'wake', '기상', '일어나자마자 햇빛을 5~10분 보면 밤에 잠이 잘 와요.');

  // 식사: 기상 1시간 후 아침, 이후 4.5~5시간 간격, 취침 3시간 전까지 저녁
  const breakfast = wake + 60;
  const dinner = Math.min(bedAbs - 180, breakfast + 11 * 60);
  const lunch = Math.round((breakfast + dinner) / 2);
  add(breakfast, 'meal', '아침 식사', '단백질을 꼭 포함하세요.');
  add(lunch, 'meal', '점심 식사');
  add(dinner, 'meal', '저녁 식사', '잠들기 3시간 전에는 식사를 마치세요.');

  if (hasWorkout) {
    add(workout, 'workout', '운동', '시작 전 5분 가볍게 몸을 데우세요.');
    // 식사와 운동 사이가 2시간 넘게 비면 운동 전 간식
    const meals = [breakfast, lunch, dinner];
    const lastMealBefore = Math.max(...meals.filter((m) => m <= workout), -Infinity);
    if (workout - lastMealBefore > 150) add(workout - 60, 'snack', '운동 전 간식', '바나나·고구마 같은 소화 잘 되는 탄수화물.');
    const nextMeal = meals.find((m) => m > workout + 60);
    if (!nextMeal || nextMeal - (workout + 70) > 60) add(workout + 75, 'snack', '운동 후 단백질', '운동 후 2시간 안에 단백질 20~40g.');
  } else {
    add(Math.round((lunch + dinner) / 2), 'snack', '오후 간식', '배고프면 단백질 위주로 가볍게.');
  }

  // 물: 기상 직후 1잔, 이후 취침 1.5시간 전까지 고르게 나눔
  const total = waterTargetMl(p.weightKg, hasWorkout);
  const first = 300;
  const workoutWater = hasWorkout ? 500 : 0;
  const rest = Math.max(0, total - first - workoutWater);
  const start = wake + 5;
  const end = bedAbs - 90;
  const slots = Math.max(4, Math.min(10, Math.round(rest / 250)));
  add(start, 'water', '물 한 컵', '자는 동안 빠진 수분을 채워요.', first);
  const step = (end - (start + 60)) / (slots - 1);
  const times = Array.from({ length: slots }, (_, i) => Math.round(start + 60 + step * i)).filter(
    (t) => !hasWorkout || Math.abs(t - workout) >= 40,
  );
  const per = Math.round(rest / times.length / 10) * 10;
  for (const t of times) add(t, 'water', '물 마시기', undefined, per);
  if (hasWorkout) add(workout + 5, 'water', '운동 중 물', '세트 사이에 조금씩 나눠 마셔요.', workoutWater);

  add(bedAbs - 60, 'winddown', '잠들 준비', '화면 밝기를 낮추고 카페인·야식은 피하세요.');
  add(bedAbs, 'sleep', '취침', `7.5시간(수면 주기 5번) 자면 ${p.wakeTime}에 개운하게 일어날 수 있어요.`);

  return items.sort((a, b) => a.minutes - b.minutes);
}

export function totalWaterMl(items: ScheduleItem[]): number {
  return items.reduce((sum, i) => sum + (i.amountMl ?? 0), 0);
}
