import type { Place, Profile, WorkoutLog } from '@/types/models';

export const profile: Profile = {
  name: '테스트',
  sex: 'male',
  birthYear: 1995,
  heightCm: 175,
  weightKg: 72,
  waistCm: 82,
  neckCm: 38,
  activity: 'moderate',
  goal: 'muscle_gain',
  experience: 'beginner',
  workoutDaysPerWeek: 3,
  wakeTime: '07:00',
  workoutTime: '19:00',
  avoidFoods: [],
};

export const apartmentGym: Place = {
  id: 'apt',
  name: '단지 헬스장',
  kind: 'apartment_gym',
  equipment: [{ equipmentId: 'dumbbell', maxWeightKg: 20, incrementKg: 2 }, { equipmentId: 'flat_bench' }, { equipmentId: 'lat_pulldown' }, { equipmentId: 'leg_press' }, { equipmentId: 'treadmill' }],
  photos: [],
  createdAt: 0,
};

export const schoolBar: Place = {
  id: 'school',
  name: '학교 철봉',
  kind: 'outdoor_bar',
  equipment: [{ equipmentId: 'pullup_bar' }, { equipmentId: 'parallel_bars' }, { equipmentId: 'low_bar' }],
  photos: [],
  createdAt: 0,
};

export function workout(partial: Partial<WorkoutLog> & Pick<WorkoutLog, 'exercises'>): WorkoutLog {
  return {
    id: Math.random().toString(36),
    placeId: 'apt',
    dayIndex: 0,
    dayName: '전신 A',
    date: '2026-10-20',
    startedAt: 1000,
    finishedAt: 2000,
    ...partial,
  };
}
