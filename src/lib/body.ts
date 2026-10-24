// 신체 분석: BMI, 기초대사량, 하루 소비 칼로리, 목표 칼로리·탄단지, 물 섭취량, 체지방 추정

import type { ActivityLevel, Goal, Profile, WeightEntry } from '@/types/models';

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: '거의 앉아서 생활',
  light: '가벼운 활동 (주 1~3회 운동)',
  moderate: '보통 (주 3~5회 운동)',
  active: '활동적 (주 6~7회 운동)',
  very_active: '매우 활동적 (육체 노동 + 운동)',
};

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const GOAL_LABELS: Record<Goal, string> = {
  fat_loss: '체지방 감량',
  maintain: '현재 체형 유지',
  muscle_gain: '근육량 증가',
  strength: '근력 향상',
};

export function ageFrom(birthYear: number, now: Date = new Date()): number {
  return now.getFullYear() - birthYear;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** 대한비만학회 기준(아시아-태평양) */
export function bmiCategory(value: number): { label: string; level: 'low' | 'normal' | 'warn' | 'high' } {
  if (value < 18.5) return { label: '저체중', level: 'low' };
  if (value < 23) return { label: '정상', level: 'normal' };
  if (value < 25) return { label: '비만 전단계(과체중)', level: 'warn' };
  if (value < 30) return { label: '1단계 비만', level: 'high' };
  if (value < 35) return { label: '2단계 비만', level: 'high' };
  return { label: '3단계 비만', level: 'high' };
}

/** Mifflin-St Jeor 공식 */
export function bmr(p: Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'birthYear'>, now?: Date): number {
  const age = ageFrom(p.birthYear, now);
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function tdee(p: Profile, now?: Date): number {
  return bmr(p, now) * ACTIVITY_FACTOR[p.activity];
}

/** 미 해군 둘레 공식으로 체지방률 추정. 필요한 둘레가 없으면 undefined */
export function navyBodyFat(p: Pick<Profile, 'sex' | 'heightCm' | 'waistCm' | 'neckCm' | 'hipCm'>): number | undefined {
  const { waistCm, neckCm, hipCm, heightCm } = p;
  if (!waistCm || !neckCm) return undefined;
  if (p.sex === 'male') {
    if (waistCm <= neckCm) return undefined;
    return 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
  }
  if (!hipCm || waistCm + hipCm <= neckCm) return undefined;
  return 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm)) - 450;
}

export function bodyFatCategory(pct: number, sex: Profile['sex']): string {
  const t = sex === 'male' ? [6, 14, 18, 25] : [14, 21, 25, 32];
  if (pct < t[0]) return '필수 지방 수준(매우 낮음)';
  if (pct < t[1]) return '운동선수 수준';
  if (pct < t[2]) return '탄탄한 편';
  if (pct < t[3]) return '평균';
  return '높음';
}

export interface MacroTargets {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

/** 성장기(만 18세 이하, 출생연도 기준 19세 미만) — 식단·코칭에 청소년 기준을 쓴다 */
export function isTeen(p: Pick<Profile, 'birthYear'>, now?: Date): boolean {
  return ageFrom(p.birthYear, now) < 19;
}

export function targetCalories(p: Profile, now?: Date): number {
  const t = tdee(p, now);
  if (isTeen(p, now)) {
    // 성장기에는 칼로리를 줄이지 않는다(감량 목표여도 유지량). 너무 적게 먹지 않도록 최소량을 둔다
    const teenAdjust: Record<Goal, number> = { fat_loss: 0, maintain: 0, muscle_gain: 0.1, strength: 0.05 };
    const floor = p.sex === 'male' ? 1800 : 1600;
    return Math.round(Math.max(t * (1 + teenAdjust[p.goal]), floor) / 10) * 10;
  }
  const adjust: Record<Goal, number> = {
    fat_loss: -0.18,
    maintain: 0,
    muscle_gain: 0.1,
    strength: 0.05,
  };
  const target = t * (1 + adjust[p.goal]);
  // 기초대사량 아래로 떨어지지 않게 한다
  return Math.round(Math.max(target, bmr(p, now) * 1.05) / 10) * 10;
}

export function macroTargets(p: Profile, now?: Date): MacroTargets {
  const calories = targetCalories(p, now);
  const proteinPerKg: Record<Goal, number> = {
    fat_loss: 2.0,
    maintain: 1.6,
    muscle_gain: 1.8,
    strength: 1.8,
  };
  // 성장기는 고기·생선·달걀·두부 같은 자연식으로 채울 수 있는 양(체중 1kg당 1.2~1.4g)
  const perKg = isTeen(p, now) ? (p.goal === 'muscle_gain' || p.goal === 'strength' ? 1.4 : 1.2) : proteinPerKg[p.goal];
  const proteinG = Math.round(p.weightKg * perKg);
  const fatG = Math.round(Math.max(p.weightKg * 0.8, (calories * 0.25) / 9));
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return { calories, proteinG, fatG, carbsG };
}

/** 하루 물 섭취 목표(ml): 체중×33ml + 운동하는 날 500ml */
export function waterTargetMl(weightKg: number, workoutDay: boolean): number {
  const base = weightKg * 33 + (workoutDay ? 500 : 0);
  return Math.round(base / 100) * 100;
}

/** 키 기준 건강 체중 범위(BMI 18.5~22.9) */
export function healthyWeightRange(heightCm: number): [number, number] {
  const m = heightCm / 100;
  return [Math.round(18.5 * m * m * 10) / 10, Math.round(22.9 * m * m * 10) / 10];
}

/** 제지방량 지수 — 근육량 지표 */
export function ffmi(weightKg: number, heightCm: number, bodyFatPct: number): number {
  const lean = weightKg * (1 - bodyFatPct / 100);
  const m = heightCm / 100;
  return lean / (m * m) + 6.1 * (1.8 - m);
}

export function waistToHeight(waistCm: number, heightCm: number): number {
  return waistCm / heightCm;
}

/** 최근 기록으로 주간 체중 변화(kg/주) 추정 — 단순 선형회귀 */
export function weeklyWeightTrend(entries: WeightEntry[]): number | undefined {
  const recent = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-28);
  if (recent.length < 3) return undefined;
  const t0 = new Date(`${recent[0].date}T00:00:00`).getTime();
  const xs = recent.map((e) => (new Date(`${e.date}T00:00:00`).getTime() - t0) / 86400000);
  const ys = recent.map((e) => e.weightKg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return undefined;
  return (num / den) * 7;
}

export interface Insight {
  tone: 'good' | 'info' | 'warn';
  text: string;
}

/** 수치를 사람이 읽을 수 있는 조언으로 바꾼다 */
/** 성장기용 분석: 성인 BMI·체지방 공식으로 판단하지 않고, 감량 조언을 하지 않는다 */
function teenInsights(p: Profile, weights: WeightEntry[]): Insight[] {
  const out: Insight[] = [
    { tone: 'info', text: '청소년은 성인 BMI 기준이 아니라 나이·성별 성장도표로 판단해요. 학교 건강검진이나 소아청소년과에서 확인할 수 있어요.' },
  ];
  if (p.waistCm) {
    const r = waistToHeight(p.waistCm, p.heightCm);
    out.push(
      r < 0.5
        ? { tone: 'good', text: `허리/키 비율 ${r.toFixed(2)} — 건강한 범위예요.` }
        : { tone: 'info', text: `허리/키 비율 ${r.toFixed(2)} — 굶지 말고, 단 음료·과자를 줄이고 몸을 많이 움직이면 충분해요.` },
    );
  }
  const trend = weeklyWeightTrend(weights);
  if (trend !== undefined && trend < -0.2) {
    out.push({ tone: 'warn', text: `최근 체중이 줄고 있어요(주 ${trend.toFixed(2)}kg). 성장기에 체중이 계속 줄면 몸이 힘들 수 있어요. 골고루 든든히 먹고, 계속 줄면 부모님과 병원에서 확인해 보세요.` });
  } else {
    out.push({ tone: 'good', text: '성장기에는 키가 크면서 체중이 느는 게 자연스러워요. 체중 숫자보다 운동 기록과 컨디션을 봐 주세요.' });
  }
  out.push({ tone: 'info', text: '뼈와 근육이 자라는 시기라 하루 8~10시간 자고, 우유·멸치 같은 칼슘 음식을 챙겨 주세요.' });
  return out;
}

export function bodyInsights(p: Profile, weights: WeightEntry[], now?: Date): Insight[] {
  if (isTeen(p, now)) return teenInsights(p, weights);
  const out: Insight[] = [];
  const b = bmi(p.weightKg, p.heightCm);
  const cat = bmiCategory(b);
  const fat = p.bodyFatPct ?? navyBodyFat(p);
  const [lo, hi] = healthyWeightRange(p.heightCm);

  if (cat.level === 'normal') {
    out.push({ tone: 'good', text: `BMI ${b.toFixed(1)}로 정상 범위예요.` });
  } else if (cat.level === 'low') {
    out.push({ tone: 'warn', text: `BMI ${b.toFixed(1)}로 저체중이에요. 건강 체중은 ${lo}~${hi}kg 입니다. 근육량 증가 목표를 추천해요.` });
  } else {
    const muscular = fat !== undefined && fat < (p.sex === 'male' ? 18 : 25);
    out.push({
      tone: muscular ? 'info' : 'warn',
      text: muscular
        ? `BMI ${b.toFixed(1)} — ${cat.label} 범위지만 체지방률이 낮아 근육량이 많은 체형이에요. BMI보다 체지방률을 기준으로 보세요.`
        : `BMI ${b.toFixed(1)} — ${cat.label}. 건강 체중 범위는 ${lo}~${hi}kg 입니다.`,
    });
  }

  if (fat !== undefined) {
    out.push({ tone: 'info', text: `체지방률 ${fat.toFixed(1)}% — ${bodyFatCategory(fat, p.sex)}.` });
    const f = ffmi(p.weightKg, p.heightCm, fat);
    out.push({ tone: 'info', text: `근육량 지수(FFMI) ${f.toFixed(1)} — ${f < 18 ? '근육량을 늘릴 여지가 커요' : f < 21 ? '평균 이상이에요' : f < 23 ? '꾸준히 운동한 몸이에요' : '상위권 근육량이에요'}.` });
  }

  if (p.waistCm) {
    const r = waistToHeight(p.waistCm, p.heightCm);
    out.push(
      r < 0.5
        ? { tone: 'good', text: `허리/키 비율 ${r.toFixed(2)} — 복부 비만 위험 낮음.` }
        : { tone: 'warn', text: `허리/키 비율 ${r.toFixed(2)} — 0.5 이상이면 복부 지방 관리가 필요해요.` },
    );
  }

  const trend = weeklyWeightTrend(weights);
  if (trend !== undefined) {
    const pctPerWeek = (trend / p.weightKg) * 100;
    if (p.goal === 'fat_loss') {
      if (trend > -0.1) out.push({ tone: 'warn', text: `최근 체중이 거의 줄지 않아요(주 ${trend.toFixed(2)}kg). 하루 150~200kcal 더 줄이거나 걷기를 늘려 보세요.` });
      else if (pctPerWeek < -1) out.push({ tone: 'warn', text: `체중이 너무 빨리 줄고 있어요(주 ${trend.toFixed(2)}kg). 근손실을 막으려면 조금 더 먹어도 괜찮아요.` });
      else out.push({ tone: 'good', text: `주 ${trend.toFixed(2)}kg 속도로 순조롭게 감량 중이에요.` });
    } else if (p.goal === 'muscle_gain') {
      if (trend < 0.05) out.push({ tone: 'warn', text: `체중이 늘지 않고 있어요(주 ${trend.toFixed(2)}kg). 하루 200kcal 정도 더 드세요.` });
      else if (pctPerWeek > 0.5) out.push({ tone: 'warn', text: `체중이 빠르게 늘고 있어요(주 +${trend.toFixed(2)}kg). 지방이 함께 늘 수 있으니 조금 줄이세요.` });
      else out.push({ tone: 'good', text: `주 +${trend.toFixed(2)}kg 속도로 건강하게 증량 중이에요.` });
    } else {
      out.push({ tone: Math.abs(trend) < 0.25 ? 'good' : 'info', text: `최근 체중 변화: 주 ${trend >= 0 ? '+' : ''}${trend.toFixed(2)}kg.` });
    }
  } else {
    out.push({ tone: 'info', text: '체중을 3번 이상 기록하면 변화 추세를 분석해 드려요.' });
  }

  const age = ageFrom(p.birthYear, now);
  if (age >= 40) out.push({ tone: 'info', text: '40대 이후에는 근육이 빠르게 줄어요. 단백질을 끼니마다 나눠 먹고 하체 운동을 빼먹지 마세요.' });

  return out;
}
