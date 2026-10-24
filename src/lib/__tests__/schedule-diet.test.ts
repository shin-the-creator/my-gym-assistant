import { waterTargetMl, macroTargets } from '../body';
import { buildMealPlan, planTotals } from '../diet';
import { bedtimeOptions, buildDailySchedule, recommendedBedtime, totalWaterMl } from '../schedule';
import { fromMinutes, toMinutes } from '../time';
import { profile } from './fixtures';

const now = new Date('2026-10-24T09:00:00');

describe('time helpers', () => {
  it('wraps around midnight', () => {
    expect(fromMinutes(toMinutes('07:00') - 465)).toBe('23:15');
    expect(fromMinutes(24 * 60 + 30)).toBe('00:30');
  });
});

describe('sleep', () => {
  it('counts back 90-minute cycles from wake time', () => {
    expect(recommendedBedtime('07:00', 30)).toBe('23:15');
    const opts = bedtimeOptions('06:00', 30);
    expect(opts.map((o) => o.time)).toEqual(['20:45', '22:15', '23:45']);
    expect(opts.find((o) => o.cycles === 4)?.recommended).toBe(false);
  });
});

describe('daily schedule', () => {
  it('spreads the water target through the day', () => {
    for (const workoutDay of [true, false]) {
      const items = buildDailySchedule(profile, workoutDay, now);
      const target = waterTargetMl(profile.weightKg, workoutDay);
      expect(Math.abs(totalWaterMl(items) - target)).toBeLessThanOrEqual(100);
      const minutes = items.map((i) => i.minutes);
      expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
    }
  });

  it('includes workout and post-workout nutrition on training days', () => {
    const items = buildDailySchedule(profile, true, now);
    expect(items.some((i) => i.kind === 'workout' && i.time === '19:00')).toBe(true);
    expect(items[items.length - 1].kind).toBe('sleep');
    const dinner = items.filter((i) => i.kind === 'meal').pop()!;
    const sleep = items.find((i) => i.kind === 'sleep')!;
    expect(sleep.minutes - dinner.minutes).toBeGreaterThanOrEqual(180);
  });
});

describe('meal plan', () => {
  const targets = macroTargets(profile, now);

  it('lands near the calorie target', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const t = planTotals(buildMealPlan(targets, [], seed));
      expect(t.kcal).toBeGreaterThan(targets.calories * 0.75);
      expect(t.kcal).toBeLessThan(targets.calories * 1.25);
      expect(t.protein).toBeGreaterThan(targets.proteinG * 0.6);
    }
  });

  it('is deterministic per seed and respects avoided foods', () => {
    expect(buildMealPlan(targets, [], 42)).toEqual(buildMealPlan(targets, [], 42));
    const plan = buildMealPlan(targets, ['우유', '닭'], 7);
    const names = plan.flatMap((m) => m.items.map((i) => i.food.name));
    expect(names.some((n) => n.includes('닭') || n.includes('우유'))).toBe(false);
  });
});

describe('meal plan macros', () => {
  it('keeps each macro within a reasonable band of its target', () => {
    const targets = macroTargets(profile, now);
    let worst = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const t = planTotals(buildMealPlan(targets, [], seed));
      worst = Math.max(worst, Math.abs(t.carbs - targets.carbsG) / targets.carbsG, Math.abs(t.fat - targets.fatG) / targets.fatG);
    }
    expect(worst).toBeLessThan(0.45);
  });
});

describe('meal plan protein', () => {
  it('does not overshoot protein wildly', () => {
    const targets = macroTargets(profile, now);
    for (let seed = 1; seed <= 50; seed++) {
      const t = planTotals(buildMealPlan(targets, [], seed));
      expect(t.protein).toBeLessThan(targets.proteinG * 1.35);
      expect(t.kcal).toBeLessThan(targets.calories * 1.15);
    }
  });
});
