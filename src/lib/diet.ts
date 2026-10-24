// 식단 생성기: 목표 칼로리·탄단지에 맞춰 끼니별로 음식을 고르고 양을 조절한다.

import { FOODS, type Food, type FoodRole, type MealSlot, isAvoided } from '@/data/foods';
import type { MacroTargets } from './body';
import type { FoodEntry, SchoolMeal } from '@/types/models';

export interface MealItem {
  food: Food;
  /** 1회 제공량의 배수 */
  qty: number;
}

export interface Meal {
  slot: MealSlot;
  title: string;
  items: MealItem[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const MEAL_TITLES: Record<MealSlot, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

export const SHARE: Record<MealSlot, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };

/** 같은 시드면 같은 식단 — 날짜별로 고정되고 "다시 짜기"로 바꿀 수 있다 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(foods: Food[], rnd: () => number, exclude: Set<string>): Food | undefined {
  const pool = foods.filter((f) => !exclude.has(f.id));
  const list = pool.length > 0 ? pool : foods;
  if (list.length === 0) return undefined;
  return list[Math.floor(rnd() * list.length)];
}

const step = (v: number) => Math.min(3, Math.max(0.5, Math.round(v * 2) / 2));

function totals(items: MealItem[]) {
  return items.reduce(
    (t, { food, qty }) => ({
      kcal: t.kcal + food.kcal * qty,
      protein: t.protein + food.protein * qty,
      carbs: t.carbs + food.carbs * qty,
      fat: t.fat + food.fat * qty,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** teen: 성장기면 간식 단백질을 우유·치즈·요거트 같은 칼슘 식품에서 고른다 */
export function buildMeal(slot: MealSlot, target: MacroTargets, foods: Food[], rnd: () => number, usedToday: Set<string>, teen = false): Meal {
  const of = (role: FoodRole) => foods.filter((f) => f.role === role && f.meals.includes(slot));
  const items: MealItem[] = [];

  // 1) 채소·과일 → 2) 탄수화물 목표만큼 밥/빵 → 3) 모자란 단백질을 단백질 음식으로 → 4) 남은 지방
  const protein = pick(slot === 'snack' ? (teen ? of('dairy') : [...of('protein'), ...of('dairy')]) : of('protein'), rnd, usedToday);

  if (slot === 'snack') {
    const side = pick([...of('fruit'), ...of('carb')], rnd, usedToday);
    if (side) items.push({ food: side, qty: 1 });
  } else {
    const veg = pick(of('veg'), rnd, usedToday);
    if (veg) items.push({ food: veg, qty: 1 });
    if (slot === 'breakfast') {
      const fruit = pick([...of('fruit'), ...of('dairy')], rnd, usedToday);
      if (fruit) items.push({ food: fruit, qty: 1 });
    }
    const carb = pick(of('carb'), rnd, usedToday);
    if (carb) {
      const carbsLeft = target.carbsG - totals(items).carbs;
      items.push({ food: carb, qty: step(carbsLeft / Math.max(carb.carbs, 1)) });
    }
  }

  if (protein) {
    const proteinLeft = target.proteinG - totals(items).protein;
    items.unshift({ food: protein, qty: step(proteinLeft / Math.max(protein.protein, 1)) });
  }

  const fatLeft = target.fatG - totals(items).fat;
  if (fatLeft > 5) {
    const fat = pick(of('fat'), rnd, usedToday);
    if (fat) items.push({ food: fat, qty: Math.min(2, step(fatLeft / Math.max(fat.fat, 1))) });
  }

  // 칼로리가 목표보다 8% 넘게 많으면, 넘친 영양소 쪽 음식부터 0.5인분씩 줄인다
  const proteinItem = items.find((i) => i.food.id === protein?.id);
  const carbItem = items.find((i) => i.food.role === 'carb');
  for (let guard = 0; guard < 10 && totals(items).kcal > target.calories * 1.08; guard++) {
    const t = totals(items);
    if (proteinItem && proteinItem.qty > 0.5 && t.protein > target.proteinG * 1.1) proteinItem.qty -= 0.5;
    else if (carbItem && carbItem.qty > 0.5) carbItem.qty -= 0.5;
    else break;
  }

  items.forEach((i) => usedToday.add(i.food.id));
  const t = totals(items);
  return {
    slot,
    title: MEAL_TITLES[slot],
    items,
    kcal: Math.round(t.kcal),
    protein: Math.round(t.protein),
    carbs: Math.round(t.carbs),
    fat: Math.round(t.fat),
  };
}

/** 성장기에는 보충제(프로틴 파우더 등)를 추천하지 않는다 */
function allowedFoods(avoid: string[], teen: boolean): Food[] {
  return FOODS.filter((f) => !isAvoided(f, avoid) && !(teen && f.tags.includes('보충제')));
}

export function buildMealPlan(targets: MacroTargets, avoid: string[], seed: number, teen = false): Meal[] {
  const foods = allowedFoods(avoid, teen);
  const rnd = seededRandom(seed);
  const used = new Set<string>();
  return (['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((slot) =>
    buildMeal(
      slot,
      { calories: targets.calories * SHARE[slot], proteinG: targets.proteinG * SHARE[slot], carbsG: targets.carbsG * SHARE[slot], fatG: targets.fatG * SHARE[slot] },
      foods,
      rnd,
      used,
      teen,
    ),
  );
}

export function planTotals(meals: Meal[]) {
  return meals.reduce(
    (t, m) => ({ kcal: t.kcal + m.kcal, protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function formatQty(item: MealItem): string {
  if (item.qty === 1) return item.food.serving;
  return `${item.food.serving} × ${item.qty}`;
}

export interface Totals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function sumEntries(entries: Pick<FoodEntry, 'kcal' | 'protein' | 'carbs' | 'fat'>[]): Totals {
  return entries.reduce(
    (t, e) => ({ kcal: t.kcal + e.kcal, protein: t.protein + e.protein, carbs: t.carbs + e.carbs, fat: t.fat + e.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

const SLOT_OF_SCHOOL = { '1': 'breakfast', '2': 'lunch', '3': 'dinner' } as const;

export type Recommendation =
  | { slot: MealSlot; kind: 'school'; school: SchoolMeal }
  | { slot: MealSlot; kind: 'plan'; meal: Meal };

/**
 * 오늘 아직 기록하지 않은 끼니에 무엇을 먹으면 좋을지 정한다.
 * 1) 기록한 음식의 영양을 목표에서 빼고
 * 2) 남은 끼니에 급식이 있으면 급식을 그 끼니로 잡고 그만큼 또 뺀 뒤
 * 3) 나머지 끼니에 남은 영양을 비율대로 나눠 음식을 고른다(날짜별로 고정된 선택)
 */
export function recommendRemaining({
  targets,
  entries,
  schoolMeals,
  avoid,
  seed,
  teen = false,
}: {
  targets: MacroTargets;
  entries: FoodEntry[];
  schoolMeals: SchoolMeal[];
  avoid: string[];
  seed: number;
  teen?: boolean;
}): { remaining: Totals; recommendations: Recommendation[] } {
  const eaten = sumEntries(entries);
  const logged = new Set(entries.map((e) => e.meal));
  const order: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const open = order.filter((s) => !logged.has(s));

  const recommendations: Recommendation[] = [];
  const schoolPlanned = schoolMeals.filter((m) => open.includes(SLOT_OF_SCHOOL[m.code]));
  for (const m of schoolPlanned) recommendations.push({ slot: SLOT_OF_SCHOOL[m.code], kind: 'school', school: m });
  const afterSchool = sumEntries(schoolPlanned);

  const left = (target: number, a: number, b: number) => Math.max(0, target - a - b);
  const remaining: Totals = {
    kcal: left(targets.calories, eaten.kcal, afterSchool.kcal),
    protein: left(targets.proteinG, eaten.protein, afterSchool.protein),
    carbs: left(targets.carbsG, eaten.carbs, afterSchool.carbs),
    fat: left(targets.fatG, eaten.fat, afterSchool.fat),
  };

  const planSlots = open.filter((s) => !schoolPlanned.some((m) => SLOT_OF_SCHOOL[m.code] === s));
  const shareSum = planSlots.reduce((sum, s) => sum + SHARE[s], 0);
  if (planSlots.length > 0 && remaining.kcal >= 120) {
    const foods = allowedFoods(avoid, teen);
    const rnd = seededRandom(seed);
    const used = new Set<string>();
    for (const slot of planSlots) {
      const r = SHARE[slot] / shareSum;
      const meal = buildMeal(
        slot,
        { calories: remaining.kcal * r, proteinG: remaining.protein * r, carbsG: remaining.carbs * r, fatG: remaining.fat * r },
        foods,
        rnd,
        used,
        teen,
      );
      if (meal.items.length) recommendations.push({ slot, kind: 'plan', meal });
    }
  }
  recommendations.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot));
  return { remaining, recommendations };
}

/** 지금 시각 기준으로 기본 끼니 고르기 */
export function slotForTime(date: Date = new Date()): MealSlot {
  const h = date.getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}
