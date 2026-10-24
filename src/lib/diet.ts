// 식단 생성기: 목표 칼로리·탄단지에 맞춰 끼니별로 음식을 고르고 양을 조절한다.

import { FOODS, type Food, type FoodRole, type MealSlot, isAvoided } from '@/data/foods';
import type { MacroTargets } from './body';

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

const SHARE: Record<MealSlot, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };

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

function buildMeal(slot: MealSlot, target: MacroTargets, foods: Food[], rnd: () => number, usedToday: Set<string>): Meal {
  const of = (role: FoodRole) => foods.filter((f) => f.role === role && f.meals.includes(slot));
  const items: MealItem[] = [];

  // 1) 채소·과일 → 2) 탄수화물 목표만큼 밥/빵 → 3) 모자란 단백질을 단백질 음식으로 → 4) 남은 지방
  const protein = pick(slot === 'snack' ? [...of('protein'), ...of('dairy')] : of('protein'), rnd, usedToday);

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

export function buildMealPlan(targets: MacroTargets, avoid: string[], seed: number): Meal[] {
  const foods = FOODS.filter((f) => !isAvoided(f, avoid));
  const rnd = seededRandom(seed);
  const used = new Set<string>();
  return (['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((slot) =>
    buildMeal(
      slot,
      { calories: targets.calories * SHARE[slot], proteinG: targets.proteinG * SHARE[slot], carbsG: targets.carbsG * SHARE[slot], fatG: targets.fatG * SHARE[slot] },
      foods,
      rnd,
      used,
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
