// 루틴 생성기
//
// 1) 프로필(목표·주당 횟수·숙련도)로 "프로그램"을 만든다. 프로그램은 운동 이름이 아니라
//    움직임 패턴(수평 밀기, 수직 당기기 …)의 목록이라 장소와 무관하다.
// 2) 운동하러 간 장소의 기구로 각 패턴을 실제 운동으로 바꿔 끼운다.
//    이전에 같은 장소에서 했던 운동 → 다른 장소에서 했던 운동 → 우선순위 순으로 고른다.
// 3) 다음에 할 데이는 장소와 상관없이 마지막 운동 기록 다음 데이로 이어진다.
//    그래서 단지 헬스장과 학교 철봉을 오가도 분할 순서가 꼬이지 않는다.

import { EXERCISES, type Exercise, PATTERN_NAMES, type Pattern, getExercise } from '@/data/exercises';
import type { Experience, Goal, Place, Profile, WorkoutLog } from '@/types/models';

export interface Slot {
  pattern: Pattern;
  role: 'main' | 'accessory' | 'finisher';
  /** 직접 고른 운동. 그 장소에서 할 수 있으면 이 운동을 먼저 쓴다 */
  preferred?: string;
}

export interface ProgramDay {
  name: string;
  focus: string;
  slots: Slot[];
}

const main = (pattern: Pattern): Slot => ({ pattern, role: 'main' });
const acc = (pattern: Pattern): Slot => ({ pattern, role: 'accessory' });
const fin = (pattern: Pattern): Slot => ({ pattern, role: 'finisher' });

const FULL_A: ProgramDay = { name: '전신 A', focus: '스쿼트 · 가슴 · 등', slots: [main('squat'), main('horizontal_push'), main('vertical_pull'), acc('hinge'), acc('lateral_raise'), acc('core')] };
const FULL_B: ProgramDay = { name: '전신 B', focus: '힌지 · 어깨 · 등', slots: [main('hinge'), main('vertical_push'), main('horizontal_pull'), acc('lunge'), acc('biceps'), acc('triceps')] };
const FULL_C: ProgramDay = { name: '전신 C', focus: '런지 · 가슴 · 광배', slots: [main('lunge'), main('horizontal_push'), main('vertical_pull'), acc('leg_curl'), acc('rear_delt'), acc('core')] };

const UPPER_A: ProgramDay = { name: '상체 A', focus: '가슴 · 등 중심', slots: [main('horizontal_push'), main('vertical_pull'), acc('vertical_push'), acc('horizontal_pull'), acc('chest_fly'), acc('triceps'), acc('biceps')] };
const LOWER_A: ProgramDay = { name: '하체 A', focus: '스쿼트 중심', slots: [main('squat'), acc('hinge'), acc('lunge'), acc('leg_extension'), acc('calves'), acc('core')] };
const UPPER_B: ProgramDay = { name: '상체 B', focus: '어깨 · 등 두께', slots: [main('vertical_push'), main('horizontal_pull'), acc('horizontal_push'), acc('vertical_pull'), acc('lateral_raise'), acc('rear_delt'), acc('biceps')] };
const LOWER_B: ProgramDay = { name: '하체 B', focus: '힌지 중심', slots: [main('hinge'), acc('squat'), acc('lunge'), acc('leg_curl'), acc('calves'), acc('core')] };

const PUSH: ProgramDay = { name: '푸시', focus: '가슴 · 어깨 · 삼두', slots: [main('horizontal_push'), main('vertical_push'), acc('chest_fly'), acc('lateral_raise'), acc('triceps')] };
const PULL: ProgramDay = { name: '풀', focus: '등 · 후면 어깨 · 이두', slots: [main('vertical_pull'), main('horizontal_pull'), acc('rear_delt'), acc('biceps'), acc('core')] };
const LEGS: ProgramDay = { name: '레그', focus: '하체 전체', slots: [main('squat'), main('hinge'), acc('lunge'), acc('leg_curl'), acc('leg_extension'), acc('calves')] };

/** "수평 밀기 (가슴)" → "가슴" 처럼 괄호 속 부위 이름을 뽑아 한 줄 요약을 만든다 */
export function programFocus(slots: Slot[]): string {
  const names = slots
    .filter((s) => s.pattern !== 'cardio')
    .map((s) => PATTERN_NAMES[s.pattern].match(/\((.+)\)/)?.[1] ?? PATTERN_NAMES[s.pattern]);
  return [...new Set(names)].slice(0, 3).join(' · ') || '유산소';
}

const CHEST: ProgramDay = { name: '가슴', focus: '', slots: [main('horizontal_push'), acc('horizontal_push'), acc('chest_fly'), acc('triceps')] };
const BACK: ProgramDay = { name: '등', focus: '', slots: [main('vertical_pull'), main('horizontal_pull'), acc('rear_delt'), acc('core')] };
const SHOULDER: ProgramDay = { name: '어깨', focus: '', slots: [main('vertical_push'), acc('lateral_raise'), acc('rear_delt'), acc('core')] };
const ARMS: ProgramDay = { name: '팔', focus: '', slots: [acc('biceps'), acc('triceps'), acc('biceps'), acc('triceps')] };

/** 직접 루틴을 만들 때 시작점으로 쓰는 분할 템플릿 */
export const PROGRAM_PRESETS: { id: string; name: string; days: ProgramDay[] }[] = [
  { id: 'ppl', name: '미는 날 · 당기는 날 · 하체', days: [{ ...PUSH, name: '미는 날' }, { ...PULL, name: '당기는 날' }, { ...LEGS, name: '하체 날' }] },
  { id: 'ul', name: '상체 · 하체', days: [UPPER_A, LOWER_A, UPPER_B, LOWER_B] },
  { id: 'full', name: '전신 A · B · C', days: [FULL_A, FULL_B, FULL_C] },
  { id: 'bro', name: '부위별 5분할', days: [CHEST, BACK, LEGS, SHOULDER, ARMS].map((d) => ({ ...d, name: d.name === '레그' ? '하체' : d.name })) },
  { id: 'empty', name: '빈 루틴', days: [{ name: '1일차', focus: '', slots: [] }] },
].map((p) => ({ ...p, days: p.days.map((d) => ({ ...d, focus: programFocus(d.slots), slots: d.slots.map((x) => ({ ...x })) })) }));

function withSuffix(day: ProgramDay, suffix: string): ProgramDay {
  return { ...day, name: `${day.name} ${suffix}` };
}

export function buildProgram(p: Pick<Profile, 'workoutDaysPerWeek' | 'experience' | 'goal'>): ProgramDay[] {
  const days = Math.min(6, Math.max(1, Math.round(p.workoutDaysPerWeek)));
  let program: ProgramDay[];
  if (days <= 2) program = [FULL_A, FULL_B];
  else if (days === 3) program = p.experience === 'beginner' ? [FULL_A, FULL_B, FULL_C] : [PUSH, PULL, LEGS];
  else if (days === 4) program = [UPPER_A, LOWER_A, UPPER_B, LOWER_B];
  else if (days === 5) program = [UPPER_A, LOWER_A, PUSH, PULL, LEGS];
  else program = [PUSH, PULL, LEGS, withSuffix(PUSH, '2'), withSuffix(PULL, '2'), withSuffix(LEGS, '2')];

  if (p.goal === 'fat_loss') {
    program = program.map((d) => ({ ...d, slots: [...d.slots, fin('cardio')] }));
  }
  return program;
}

const LEVEL_RANK: Record<Experience, number> = { beginner: 0, intermediate: 1, advanced: 2 };

export function isAvailable(ex: Exercise, equipment: Set<string>): boolean {
  return ex.requires.some((group) => group.every((id) => equipment.has(id)));
}

/** 이 장소에서 해당 패턴으로 할 수 있는 운동들(추천 순) */
export function candidatesFor(pattern: Pattern, place: Pick<Place, 'equipment'>, experience: Experience): Exercise[] {
  const equipment = new Set(place.equipment.map((e) => e.equipmentId));
  const available = EXERCISES.filter((e) => e.pattern === pattern && isAvailable(e, equipment));
  const suitable = available.filter((e) => LEVEL_RANK[e.minLevel] <= LEVEL_RANK[experience]);
  const tooHard = available.filter((e) => LEVEL_RANK[e.minLevel] > LEVEL_RANK[experience]);
  return [...suitable, ...tooHard];
}

export interface Prescription {
  sets: number;
  /** 표시용 반복 범위, 예: "8-12회", "30-45초", "20분" */
  target: string;
  repMin: number;
  repMax: number;
  restSec: number;
}

export function prescribe(slot: Slot, ex: Exercise, goal: Goal, experience: Experience): Prescription {
  if (ex.pattern === 'cardio') {
    const minutes = goal === 'fat_loss' ? 25 : 15;
    return { sets: 1, target: `${minutes}분`, repMin: minutes, repMax: minutes, restSec: 0 };
  }
  if (ex.load === 'time') {
    const [a, b] = experience === 'beginner' ? [20, 40] : [40, 60];
    return { sets: 3, target: `${a}-${b}초`, repMin: a, repMax: b, restSec: 45 };
  }

  const table: Record<Goal, { main: [number, number, number, number]; accessory: [number, number, number, number] }> = {
    // [세트, 최소 반복, 최대 반복, 휴식(초)]
    strength: { main: [5, 3, 5, 180], accessory: [3, 6, 10, 90] },
    muscle_gain: { main: [4, 6, 10, 120], accessory: [3, 10, 15, 75] },
    fat_loss: { main: [3, 8, 12, 90], accessory: [3, 12, 15, 60] },
    maintain: { main: [3, 8, 12, 90], accessory: [3, 10, 15, 60] },
  };
  let [sets, repMin, repMax, restSec] = slot.role === 'main' ? table[goal].main : table[goal].accessory;
  if (experience === 'beginner' && slot.role === 'main') sets = Math.max(3, sets - 1);
  if (experience === 'advanced' && slot.role === 'accessory') sets += 1;

  if (ex.load === 'bodyweight') {
    // 맨몸 운동은 무게 대신 반복 수로 강도를 맞춘다
    repMin = Math.max(repMin, 6);
    repMax = Math.max(repMax, 12);
  }
  return { sets, target: `${repMin}-${repMax}회`, repMin, repMax, restSec };
}

export interface PlannedExercise {
  slot: Slot;
  exercise?: Exercise;
  alternatives: Exercise[];
  prescription?: Prescription;
  /** 왜 이 운동이 골라졌는지 */
  reason: string;
}

function lastExerciseFor(pattern: Pattern, logs: WorkoutLog[], placeId?: string): string | undefined {
  const sorted = [...logs].sort((a, b) => b.startedAt - a.startedAt);
  for (const log of sorted) {
    if (placeId && log.placeId !== placeId) continue;
    const found = log.exercises.find((e) => e.pattern === pattern && e.sets.some((s) => s.done));
    if (found) return found.exerciseId;
  }
  return undefined;
}

export function planDay(
  day: ProgramDay,
  place: Place,
  profile: Pick<Profile, 'goal' | 'experience'>,
  logs: WorkoutLog[],
  overrides: Record<number, string> = {},
): PlannedExercise[] {
  const used = new Set<string>();
  return day.slots.map((slot, i) => {
    const candidates = candidatesFor(slot.pattern, place, profile.experience).filter((c) => !used.has(c.id));
    let exercise: Exercise | undefined;
    let reason = '';

    const override = overrides[i] ? getExercise(overrides[i]) : undefined;
    if (override && candidates.some((c) => c.id === override.id)) {
      exercise = override;
      reason = '직접 바꾼 운동';
    }
    const preferred = slot.preferred ? getExercise(slot.preferred) : undefined;
    if (!exercise && preferred && candidates.some((c) => c.id === preferred.id)) {
      exercise = preferred;
      reason = '루틴에 직접 정해 둔 운동';
    }
    if (!exercise) {
      const here = lastExerciseFor(slot.pattern, logs, place.id);
      exercise = candidates.find((c) => c.id === here);
      if (exercise) reason = '이 장소에서 지난번에 한 운동 (기록 이어가기)';
    }
    if (!exercise) {
      const anywhere = lastExerciseFor(slot.pattern, logs);
      exercise = candidates.find((c) => c.id === anywhere);
      if (exercise) reason = '다른 장소에서 하던 운동을 여기서도 이어서';
    }
    if (!exercise && candidates.length > 0) {
      exercise = candidates[0];
      reason = '이 장소 기구로 할 수 있는 가장 효과적인 운동';
    }
    if (exercise) used.add(exercise.id);

    return {
      slot,
      exercise,
      alternatives: candidates.filter((c) => c.id !== exercise?.id),
      prescription: exercise ? prescribe(slot, exercise, profile.goal, profile.experience) : undefined,
      reason: exercise ? reason : '이 장소에는 해당 부위를 위한 기구가 없어 생략해요',
    };
  });
}

/** 장소와 무관하게 마지막으로 끝낸 데이의 다음 데이 */
export function nextDayIndex(program: ProgramDay[], logs: WorkoutLog[]): number {
  const finished = logs.filter((l) => l.finishedAt).sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
  if (finished.length === 0 || program.length === 0) return 0;
  const last = finished[0];
  // 프로그램이 바뀌었을 수 있으니 이름이 같은 데이를 먼저 찾는다
  const byName = program.findIndex((d) => d.name === last.dayName);
  const idx = byName >= 0 ? byName : last.dayIndex;
  return (idx + 1) % program.length;
}

/** 프로그램의 패턴 중 이 장소에서 할 수 있는 비율(0~1) */
export function placeCoverage(program: ProgramDay[], place: Place, experience: Experience): number {
  const patterns = new Set(program.flatMap((d) => d.slots.map((s) => s.pattern)));
  if (patterns.size === 0) return 1;
  const ok = [...patterns].filter((p) => candidatesFor(p, place, experience).length > 0);
  return ok.length / patterns.size;
}
