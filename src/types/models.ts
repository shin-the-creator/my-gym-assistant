// 앱 전체에서 쓰는 도메인 모델

export type Sex = 'male' | 'female';
export type Goal = 'fat_loss' | 'maintain' | 'muscle_gain' | 'strength';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface Profile {
  name: string;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  /** 허리/목/엉덩이 둘레(cm) — 있으면 체지방률 추정에 사용 */
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  /** 직접 측정한 체지방률(인바디 등)이 있으면 추정치 대신 사용 */
  bodyFatPct?: number;
  activity: ActivityLevel;
  goal: Goal;
  experience: Experience;
  workoutDaysPerWeek: number;
  /** "HH:MM" */
  wakeTime: string;
  /** "HH:MM" — 운동하는 대략적인 시각 */
  workoutTime: string;
  /** 못 먹는 음식 키워드 (예: 우유, 땅콩) */
  avoidFoods: string[];
}

export type PlaceKind = 'apartment_gym' | 'other_gym' | 'outdoor_bar' | 'home' | 'other';

/** 장소에 등록된 기구 한 개 + 그 장소만의 세팅 */
export interface PlaceEquipment {
  equipmentId: string;
  /** 덤벨/케이블/머신의 최대 무게(kg). 루틴 무게 제안을 이 안으로 맞춘다 */
  maxWeightKg?: number;
  /** 무게 증가 단위(kg) — 예: 덤벨 2kg, 머신 5kg 단위 */
  incrementKg?: number;
  note?: string;
}

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  equipment: PlaceEquipment[];
  photos: string[];
  createdAt: number;
}

export interface SetLog {
  reps: number;
  weightKg: number;
  done: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  pattern: string;
  sets: SetLog[];
  /** 루틴이 제시한 목표(예: "8-12회") */
  target?: string;
  restSec?: number;
  /** 무게 제안/코칭 메모 */
  note?: string;
}

export interface WorkoutLog {
  id: string;
  placeId: string;
  /** 프로그램의 몇 번째 데이(A/B/C...)를 수행했는지 */
  dayIndex: number;
  dayName: string;
  date: string; // YYYY-MM-DD
  startedAt: number;
  finishedAt?: number;
  exercises: ExerciseLog[];
}

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weightKg: number;
}

export interface Settings {
  apiKeyConfigured: boolean;
  waterReminders: boolean;
  sleepReminder: boolean;
  mealReminders: boolean;
}

export type MealSlotKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** 실제로 먹은 음식 한 건 */
export interface FoodEntry {
  id: string;
  date: string; // YYYY-MM-DD
  meal: MealSlotKey;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** 어떻게 기록했는지: 사진 AI 분석, 학교 급식, 음식 목록, 직접 입력 */
  source: 'photo' | 'school' | 'db' | 'manual';
  createdAt: number;
}

/** 나이스(NEIS)에서 찾은 학교 */
export interface School {
  name: string;
  officeCode: string; // ATPT_OFCDC_SC_CODE
  schoolCode: string; // SD_SCHUL_CODE
  address?: string;
}

/** 학교 급식 한 끼(조식·중식·석식) */
export interface SchoolMeal {
  code: '1' | '2' | '3';
  name: string;
  dishes: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}
