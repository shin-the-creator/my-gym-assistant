import { bmi, bmiCategory, bmr, bodyInsights, macroTargets, navyBodyFat, waterTargetMl, weeklyWeightTrend } from '../body';
import { profile } from './fixtures';

const now = new Date('2026-10-24T09:00:00');

describe('body analysis', () => {
  it('computes BMI with Korean categories', () => {
    expect(bmi(72, 175)).toBeCloseTo(23.5, 1);
    expect(bmiCategory(22.9).label).toBe('정상');
    expect(bmiCategory(23.5).level).toBe('warn');
    expect(bmiCategory(17).level).toBe('low');
  });

  it('computes Mifflin-St Jeor BMR', () => {
    // 10*72 + 6.25*175 - 5*31 + 5
    expect(bmr(profile, now)).toBeCloseTo(1663.75, 2);
    expect(bmr({ ...profile, sex: 'female' }, now)).toBeCloseTo(1663.75 - 166, 2);
  });

  it('estimates body fat with the Navy formula', () => {
    const fat = navyBodyFat(profile)!;
    expect(fat).toBeGreaterThan(10);
    expect(fat).toBeLessThan(25);
    expect(navyBodyFat({ ...profile, waistCm: undefined })).toBeUndefined();
    expect(navyBodyFat({ ...profile, sex: 'female' })).toBeUndefined(); // 엉덩이 둘레 없음
  });

  it('macro targets add up to the calorie target', () => {
    const t = macroTargets(profile, now);
    const kcal = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
    expect(Math.abs(kcal - t.calories)).toBeLessThan(15);
    expect(t.proteinG).toBe(Math.round(72 * 1.8));
  });

  it('never targets below BMR when cutting', () => {
    const t = macroTargets({ ...profile, goal: 'fat_loss', activity: 'sedentary' }, now);
    expect(t.calories).toBeGreaterThanOrEqual(bmr(profile, now));
  });

  it('adds water on workout days', () => {
    expect(waterTargetMl(72, false)).toBe(2400);
    expect(waterTargetMl(72, true)).toBe(2900);
  });

  it('detects weekly weight trend', () => {
    const entries = [0, 7, 14, 21].map((d, i) => ({ date: `2026-10-${String(1 + d).padStart(2, '0')}`, weightKg: 72 + i * 0.3 }));
    expect(weeklyWeightTrend(entries)).toBeCloseTo(0.3, 5);
    expect(weeklyWeightTrend(entries.slice(0, 2))).toBeUndefined();
  });

  it('gives insights', () => {
    const insights = bodyInsights(profile, [], now);
    expect(insights.length).toBeGreaterThan(2);
    expect(insights.some((i) => i.text.includes('체지방률'))).toBe(true);
  });
});
