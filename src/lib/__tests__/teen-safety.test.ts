import { bodyInsights, macroTargets, tdee } from '../body';
import { TEEN_ROLE, coachRoleInstruction } from '../coach-role';
import { buildMealPlan, recommendRemaining } from '../diet';
import { EATING_DISORDER_REPLY, hasEatingDisorderRisk } from '../safety';
import { profile } from './fixtures';
import type { Profile } from '@/types/models';

const now = new Date('2026-10-24T09:00:00');
const teen: Profile = { ...profile, birthYear: 2010, weightKg: 55, heightCm: 168, goal: 'fat_loss', activity: 'light' };
const teenGirl: Profile = { ...teen, sex: 'female', weightKg: 40, heightCm: 150, activity: 'sedentary' };

describe('teen nutrition', () => {
  it('never cuts calories for a teen, even with a fat-loss goal, and keeps a minimum', () => {
    const t = macroTargets(teen, now);
    expect(t.calories).toBeGreaterThanOrEqual(Math.round(tdee(teen, now) / 10) * 10 - 10);
    expect(macroTargets(teenGirl, now).calories).toBeGreaterThanOrEqual(1600);
    expect(t.calories).toBeGreaterThanOrEqual(1200);
  });

  it('uses natural-food protein amounts for teens', () => {
    expect(macroTargets(teen, now).proteinG).toBe(Math.round(55 * 1.2));
    expect(macroTargets({ ...teen, goal: 'muscle_gain' }, now).proteinG).toBe(Math.round(55 * 1.4));
  });

  it('never recommends supplements to teens and picks calcium foods for snacks', () => {
    const targets = macroTargets(teen, now);
    for (let seed = 1; seed <= 30; seed++) {
      const plan = buildMealPlan(targets, [], seed, true);
      expect(plan.flatMap((m) => m.items.map((i) => i.food.id))).not.toContain('protein_shake');
      const snackProtein = plan.find((m) => m.slot === 'snack')!.items.map((i) => i.food.role);
      expect(snackProtein).toContain('dairy');
      const { recommendations } = recommendRemaining({ targets, entries: [], schoolMeals: [], avoid: [], seed, teen: true });
      const ids = recommendations.flatMap((r) => (r.kind === 'plan' ? r.meal.items.map((i) => i.food.id) : []));
      expect(ids).not.toContain('protein_shake');
    }
  });

  it('gives teens growth-focused body insights without dieting advice', () => {
    const weights = [0, 7, 14, 21].map((d, i) => ({ date: `2026-10-${String(1 + d).padStart(2, '0')}`, weightKg: 55 + i * 0.3 }));
    const text = bodyInsights(teen, weights, now).map((i) => i.text).join(' ');
    expect(text).toContain('성장도표');
    expect(text).not.toMatch(/kcal 더 줄이|줄이거나/);
  });
});

describe('teen coach role', () => {
  it('applies the teen safety rules to users under 19', () => {
    expect(coachRoleInstruction(15)).toBe(TEEN_ROLE);
    for (const rule of ['1200kcal', '원푸드', '간헐적 단식', '키토', '프로틴 파우더', '자연식', '칼슘', '철분', '비타민', '부모님', '전문의', '굶을래요', '진단']) {
      expect(TEEN_ROLE).toContain(rule);
    }
    expect(coachRoleInstruction(30)).not.toBe(TEEN_ROLE);
  });
});

describe('eating-disorder safety check', () => {
  it('catches risky messages', () => {
    for (const q of ['프로아나 식단 알려줘', '뼈말라 되고 싶어요', '먹토 하면 살 빠져요?', '먹고 나서 토하면 괜찮아요?', '변비약 먹으면 살 빠지나요', '일주일 동안 굶으면 몇 kg 빠져요?', '폭식하고 너무 후회돼요']) {
      expect(hasEatingDisorderRisk(q)).toBe(true);
    }
  });

  it('lets normal questions through', () => {
    for (const q of ['턱걸이 늘리는 법', '급식 남겨도 돼요?', '하체 운동 추천', '토요일에 운동해도 돼요?', '토마토 먹어도 돼요?']) {
      expect(hasEatingDisorderRisk(q)).toBe(false);
    }
  });

  it('points to trusted adults, doctors and the 1388 youth line', () => {
    expect(EATING_DISORDER_REPLY).toContain('부모님');
    expect(EATING_DISORDER_REPLY).toContain('전문의');
    expect(EATING_DISORDER_REPLY).toContain('1388');
  });
});
