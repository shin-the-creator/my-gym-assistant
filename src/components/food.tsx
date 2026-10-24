// 식단·달력 화면에서 같이 쓰는 급식 카드와 먹은 음식 목록

import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, ListCard, ListRow, Row, SectionLabel, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSchoolMeals } from '@/hooks/use-school-meals';
import { confirm } from '@/lib/confirm';
import { MEAL_TITLES, sumEntries } from '@/lib/diet';
import { SCHOOL_MEAL_SLOT } from '@/lib/neis';
import { useStore } from '@/store/useStore';
import type { MealSlotKey, SchoolMeal } from '@/types/models';

const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');

export function macroLine(t: { protein: number; carbs: number; fat: number }) {
  return `단 ${Math.round(t.protein)}g · 탄 ${Math.round(t.carbs)}g · 지 ${Math.round(t.fat)}g`;
}

/** 그날의 급식(조·중·석식). "먹었어요"로 바로 기록할 수 있다 */
export function SchoolMealSection({ date, title = '급식' }: { date: string; title?: string }) {
  const { meals, loading, error, hasSchool } = useSchoolMeals(date);
  const school = useStore((s) => s.school);
  const foodLog = useStore((s) => s.foodLog);
  const addFood = useStore((s) => s.addFood);

  const eat = (m: SchoolMeal, ratio: number) => {
    addFood([
      {
        date,
        meal: SCHOOL_MEAL_SLOT[m.code] as MealSlotKey,
        name: `급식 ${m.name}${ratio < 1 ? ' (반)' : ''}`,
        kcal: Math.round(m.kcal * ratio),
        protein: Math.round(m.protein * ratio * 10) / 10,
        carbs: Math.round(m.carbs * ratio * 10) / 10,
        fat: Math.round(m.fat * ratio * 10) / 10,
        source: 'school',
      },
    ]);
  };

  if (!hasSchool) {
    return (
      <View>
        <SectionLabel>{title}</SectionLabel>
        <ListCard>
          <ListRow marker="school-outline" title="학교를 등록하면 급식표가 자동으로 나와요" subtitle="메뉴·칼로리·탄단지를 나이스에서 불러와요" onPress={() => router.push('/school')} />
        </ListCard>
      </View>
    );
  }

  return (
    <View>
      <SectionLabel right={school?.name}>{title}</SectionLabel>
      <ListCard>
        {loading ? <ListRow marker="time-outline" title="급식표를 불러오는 중…" /> : null}
        {error ? <ListRow marker="alert-circle-outline" title="급식표를 불러오지 못했어요" subtitle={error} /> : null}
        {!loading && !error && meals.length === 0 ? <ListRow marker="calendar-outline" title="이 날은 급식이 없어요" subtitle="주말·공휴일·방학이거나 아직 식단이 올라오지 않았어요" /> : null}
        {meals.map((m) => {
          const eaten = foodLog.some((f) => f.date === date && f.source === 'school' && f.name.startsWith(`급식 ${m.name}`));
          return (
            <View key={m.code} style={{ paddingHorizontal: 18, paddingVertical: 14, gap: 8 }}>
              <Row>
                <T style={{ fontWeight: '600', flex: 1 }}>{m.name}</T>
                <T style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                  {fmt(m.kcal)}
                  <T kind="small"> kcal</T>
                </T>
              </Row>
              <T kind="secondary">{m.dishes.join(' · ')}</T>
              <T kind="small">{macroLine(m)}</T>
              {eaten ? (
                <T kind="small">✓ 기록함</T>
              ) : (
                <Row gap={Spacing.sm}>
                  <Button small kind="secondary" title="다 먹었어요" onPress={() => eat(m, 1)} />
                  <Button small kind="ghost" title="반만 먹었어요" onPress={() => eat(m, 0.5)} />
                </Row>
              )}
            </View>
          );
        })}
      </ListCard>
    </View>
  );
}

/** 그날 먹은 음식 목록(끼니별). 길게 누르면 삭제 */
export function FoodLogSection({ date, title = '먹은 음식' }: { date: string; title?: string }) {
  const entries = useStore((s) => s.foodLog).filter((f) => f.date === date);
  const removeFood = useStore((s) => s.removeFood);
  const total = sumEntries(entries);
  const order: MealSlotKey[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const sorted = [...entries].sort((a, b) => order.indexOf(a.meal) - order.indexOf(b.meal) || a.createdAt - b.createdAt);

  return (
    <View>
      <SectionLabel right={entries.length ? `${fmt(total.kcal)} kcal` : undefined}>{title}</SectionLabel>
      <ListCard>
        {sorted.length === 0 ? <ListRow marker="restaurant-outline" title="아직 기록이 없어요" subtitle="사진·검색·직접 입력으로 기록하세요" /> : null}
        {sorted.map((f) => (
          <ListRow
            key={f.id}
            marker={f.source === 'photo' ? 'camera-outline' : f.source === 'school' ? 'school-outline' : 'restaurant-outline'}
            title={f.name}
            subtitle={`${MEAL_TITLES[f.meal]} · ${macroLine(f)}`}
            value={fmt(f.kcal)}
            unit="kcal"
            caption="삭제"
            onPress={() => confirm('기록 삭제', `"${f.name}" 기록을 지울까요?`, () => removeFood(f.id), '삭제')}
          />
        ))}
        <View style={{ padding: 14 }}>
          <Button title="음식 기록하기" kind="secondary" icon="add" onPress={() => router.push({ pathname: '/food', params: { date } })} />
        </View>
      </ListCard>
      {sorted.length > 0 ? <T kind="small" style={{ marginTop: Spacing.sm, paddingHorizontal: 4 }}>항목을 누르면 삭제할 수 있어요</T> : null}
    </View>
  );
}
