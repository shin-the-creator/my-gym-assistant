// AI 코치에게 넘길 사용자 요약(텍스트)

import { equipmentName } from '@/data/equipment';
import { PATTERN_NAMES, getExercise } from '@/data/exercises';
import type { Place, Profile, WeightEntry, WorkoutLog } from '@/types/models';
import { ACTIVITY_LABELS, GOAL_LABELS, ageFrom, bmi, macroTargets, navyBodyFat } from './body';
import type { ProgramDay } from './routine';
import { describeSlot, getSlots } from './workout-slots';

export function coachContext(p: Profile, program: ProgramDay[], places: Place[], workouts: WorkoutLog[], weights: WeightEntry[]): string {
  const fat = p.bodyFatPct ?? navyBodyFat(p);
  const t = macroTargets(p);
  const lines = [
    `- ${p.sex === 'male' ? '남성' : '여성'}, ${ageFrom(p.birthYear)}세, ${p.heightCm}cm, ${p.weightKg}kg, BMI ${bmi(p.weightKg, p.heightCm).toFixed(1)}${fat !== undefined ? `, 체지방률 약 ${fat.toFixed(1)}%` : ''}`,
    `- 목표: ${GOAL_LABELS[p.goal]}, 경력: ${p.experience}, 주 ${p.workoutDaysPerWeek}회, 활동량: ${ACTIVITY_LABELS[p.activity]}`,
    `- 기상 ${p.wakeTime}, 운동 시간: ${getSlots(p).map(describeSlot).join(' / ')}${p.avoidFoods.length ? `, 피하는 음식: ${p.avoidFoods.join(', ')}` : ''}`,
    `- 하루 목표: ${t.calories}kcal, 단백질 ${t.proteinG}g, 탄수화물 ${t.carbsG}g, 지방 ${t.fatG}g`,
    `- 분할 루틴(이 순서로 돌아감): ${program.map((d) => `${d.name}[${d.slots.map((sl) => (sl.preferred ? getExercise(sl.preferred)?.name : null) ?? PATTERN_NAMES[sl.pattern]).join(', ')}]`).join(' → ')}`,
    `- 운동 장소:`,
    ...places.map((pl) => `  · ${pl.name}: ${pl.equipment.map((e) => `${equipmentName(e.equipmentId)}${e.maxWeightKg ? `(최대 ${e.maxWeightKg}kg)` : ''}`).join(', ') || '기구 없음'}`),
  ];
  const recent = [...workouts].sort((a, b) => b.startedAt - a.startedAt).slice(0, 5);
  if (recent.length) {
    lines.push('- 최근 운동:');
    for (const w of recent) {
      const where = places.find((pl) => pl.id === w.placeId)?.name ?? '알 수 없음';
      const ex = w.exercises
        .map((e) => {
          const done = e.sets.filter((s) => s.done);
          return `${getExercise(e.exerciseId)?.name ?? e.exerciseId} ${done.map((s) => (s.weightKg ? `${s.weightKg}kg×${s.reps}` : `${s.reps}`)).join('/')}`;
        })
        .join('; ');
      lines.push(`  · ${w.date} ${w.dayName} @${where}: ${ex}`);
    }
  }
  const lastWeights = weights.slice(-7);
  if (lastWeights.length > 1) lines.push(`- 최근 체중: ${lastWeights.map((w) => `${w.date.slice(5)} ${w.weightKg}kg`).join(', ')}`);
  return lines.join('\n');
}
