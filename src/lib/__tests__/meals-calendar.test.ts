import { parseFoodAnalysis } from '../ai-utils';
import { macroTargets } from '../body';
import { monthMatrix } from '../calendar';
import { recommendRemaining, sumEntries } from '../diet';
import { extractRows, parseDishes, parseKcal, parseNutrients, toSchoolMeal } from '../neis';
import { profile } from './fixtures';
import type { FoodEntry } from '@/types/models';

const now = new Date('2026-10-24T09:00:00');

// 나이스 급식 응답 형식(필드 이름·구분자는 실제 응답과 같다)
const NEIS_MEAL = {
  mealServiceDietInfo: [
    { head: [{ list_total_count: 1 }, { RESULT: { CODE: 'INFO-000', MESSAGE: '정상 처리되었습니다.' } }] },
    {
      row: [
        {
          MMEAL_SC_CODE: '2',
          MMEAL_SC_NM: '중식',
          MLSV_YMD: '20261026',
          DDISH_NM: '현미밥 <br/>*쇠고기미역국 (5.6.13.16.)<br/>닭갈비 (1.5.6.13.15.)<br/>배추김치 (9.13.)',
          CAL_INFO: '812.5 Kcal',
          NTR_INFO: '탄수화물(g) : 120.3<br/>단백질(g) : 35.2<br/>지방(g) : 22.1<br/>비타민A(R.E) : 210.5',
        },
      ],
    },
  ],
};

describe('NEIS meal parsing', () => {
  it('reads rows, dishes without allergy codes, calories and macros', () => {
    const rows = extractRows('mealServiceDietInfo', NEIS_MEAL);
    expect(rows).toHaveLength(1);
    const meal = toSchoolMeal(rows[0]);
    expect(meal).toEqual({ code: '2', name: '중식', dishes: ['현미밥', '쇠고기미역국', '닭갈비', '배추김치'], kcal: 813, carbs: 120.3, protein: 35.2, fat: 22.1 });
  });

  it('treats "no data" as an empty list and other results as errors', () => {
    expect(extractRows('mealServiceDietInfo', { RESULT: { CODE: 'INFO-200', MESSAGE: '해당하는 데이터가 없습니다.' } })).toEqual([]);
    expect(() => extractRows('mealServiceDietInfo', { RESULT: { CODE: 'ERROR-300', MESSAGE: '필수 값 누락' } })).toThrow('필수 값 누락');
  });

  it('tolerates odd values', () => {
    expect(parseDishes(undefined)).toEqual([]);
    expect(parseKcal('')).toBe(0);
    expect(parseNutrients('단백질(g) : 3')).toEqual({ carbs: 0, protein: 3, fat: 0 });
  });
});

const entry = (meal: FoodEntry['meal'], kcal: number, p: number, c: number, f: number): FoodEntry => ({
  id: meal,
  date: '2026-10-24',
  meal,
  name: meal,
  kcal,
  protein: p,
  carbs: c,
  fat: f,
  source: 'manual',
  createdAt: 0,
});

describe('recommendRemaining', () => {
  const targets = macroTargets(profile, now);
  const lunch = toSchoolMeal(extractRows('mealServiceDietInfo', NEIS_MEAL)[0]);

  it('uses school lunch for an unlogged lunch and plans the rest from what is left', () => {
    const entries = [entry('breakfast', 500, 25, 70, 12)];
    const { remaining, recommendations } = recommendRemaining({ targets, entries, schoolMeals: [lunch], avoid: [], seed: 1 });
    expect(recommendations.map((r) => `${r.slot}:${r.kind}`)).toEqual(['lunch:school', 'dinner:plan', 'snack:plan']);
    expect(remaining.kcal).toBeCloseTo(targets.calories - 500 - 813, 0);
    const planned = recommendations.filter((r) => r.kind === 'plan').reduce((s, r) => s + (r.kind === 'plan' ? r.meal.kcal : 0), 0);
    expect(planned).toBeGreaterThan(remaining.kcal * 0.7);
    expect(planned).toBeLessThan(remaining.kcal * 1.3);
  });

  it('does not plan a meal that was already logged, and stops when the target is met', () => {
    const entries = [entry('breakfast', 800, 40, 100, 25), entry('lunch', 900, 40, 120, 30), entry('dinner', 1300, 60, 190, 30)];
    const { recommendations, remaining } = recommendRemaining({ targets, entries, schoolMeals: [lunch], avoid: [], seed: 1 });
    expect(remaining.kcal).toBe(0);
    expect(recommendations).toEqual([]);
  });

  it('is the same for the same day', () => {
    const a = recommendRemaining({ targets, entries: [], schoolMeals: [], avoid: [], seed: 42 });
    const b = recommendRemaining({ targets, entries: [], schoolMeals: [], avoid: [], seed: 42 });
    expect(a).toEqual(b);
    expect(sumEntries([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe('monthMatrix', () => {
  it('lays out October 2026 starting on Thursday in Sunday-first weeks', () => {
    const weeks = monthMatrix(2026, 9);
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toEqual({ date: '2026-09-27', day: 27, inMonth: false });
    expect(weeks[0][4]).toEqual({ date: '2026-10-01', day: 1, inMonth: true });
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(31);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
});

describe('parseFoodAnalysis', () => {
  it('cleans numbers and drops empty names', () => {
    const r = parseFoodAnalysis(
      '```json\n{"foods":[{"name":" 제육볶음 ","amount":"1인분","kcal":512.6,"protein":28.44,"carbs":20,"fat":-3},{"name":"","amount":"","kcal":1,"protein":0,"carbs":0,"fat":0}],"note":"추정"}\n```',
    );
    expect(r.foods).toEqual([{ name: '제육볶음', amount: '1인분', kcal: 513, protein: 28.4, carbs: 20, fat: 0 }]);
  });
});
