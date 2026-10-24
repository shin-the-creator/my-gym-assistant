// 식단: 목표 대비 먹은 양 → 급식 → 먹은 음식 기록 → 남은 끼니 추천
// 추천은 무작위가 아니라 "목표 - 먹은 것 - 오늘 급식"으로 남은 영양을 계산해 채운다.

import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { FoodLogSection, SchoolMealSection, macroLine } from '@/components/food';
import { Button, Card, Empty, ListCard, ListRow, Metric, Row, Screen, SectionLabel, T, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-plan';
import { useSchoolMeals } from '@/hooks/use-school-meals';
import { useLayout } from '@/hooks/use-theme';
import { GOAL_LABELS, isTeen } from '@/lib/body';
import { MEAL_TITLES, formatQty, recommendRemaining, seedFrom, sumEntries } from '@/lib/diet';
import { useStore } from '@/store/useStore';

const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');

export default function DietScreen() {
  const profile = useStore((s) => s.profile);
  const foodLog = useStore((s) => s.foodLog);
  const today = useToday();
  const { columns } = useLayout();
  const date = today?.today ?? '';
  const { meals: schoolMeals } = useSchoolMeals(date);

  const entries = useMemo(() => foodLog.filter((f) => f.date === date), [foodLog, date]);
  const plan = useMemo(() => {
    if (!profile || !today) return null;
    return recommendRemaining({ targets: today.targets, entries, schoolMeals, avoid: profile.avoidFoods, seed: seedFrom(date), teen: isTeen(profile) });
  }, [profile, today, entries, schoolMeals, date]);

  if (!profile || !today || !plan) {
    return (
      <Screen>
        <Title>식단</Title>
        <Card>
          <Empty icon="person-circle-outline" title="내 정보를 먼저 입력해 주세요" action={<Button title="입력하기" onPress={() => router.push('/profile')} />} />
        </Card>
      </Screen>
    );
  }

  const t = today.targets;
  const eaten = sumEntries(entries);

  const gauges = (
    <View style={{ gap: Spacing.md }}>
      <Metric label="먹은 칼로리" value={eaten.kcal} unit="kcal" goal={t.calories} size="lg" />
      <Row gap={Spacing.md} style={{ alignItems: 'stretch' }}>
        <View style={{ flex: 1 }}>
          <Metric label="단백질" value={eaten.protein} unit="g" goal={t.proteinG} footnote={`목표 ${t.proteinG}g`} />
        </View>
        <View style={{ flex: 1 }}>
          <Metric label="탄수화물" value={eaten.carbs} unit="g" goal={t.carbsG} footnote={`목표 ${t.carbsG}g`} />
        </View>
      </Row>
      <Metric label="지방" value={eaten.fat} unit="g" goal={t.fatG} />
      <Row gap={Spacing.sm}>
        <Button title="사진으로 기록" icon="camera" onPress={() => router.push({ pathname: '/food', params: { date, mode: 'photo' } })} style={{ flex: 1 }} />
        <Button title="검색·입력" kind="secondary" icon="search" onPress={() => router.push({ pathname: '/food', params: { date, mode: 'search' } })} style={{ flex: 1 }} />
      </Row>
    </View>
  );

  const detail = (
    <View style={{ gap: Spacing.xl }}>
      <SchoolMealSection date={date} title="오늘 급식" />
      <FoodLogSection date={date} title="오늘 먹은 음식" />

      {isTeen(profile) ? (
        <View>
          <SectionLabel>성장기 영양 체크</SectionLabel>
          <ListCard>
            <ListRow marker="water-outline" title="칼슘 · 뼈를 튼튼하게" subtitle="우유·요거트·치즈·멸치볶음·두부를 하루 2~3번" />
            <ListRow marker="fitness-outline" title="철분 · 피를 만드는 재료" subtitle="소고기·돼지 살코기·달걀·시금치나물 — 비타민C(과일)와 같이 먹으면 더 잘 흡수돼요" />
            <ListRow marker="leaf-outline" title="비타민 · 몸의 컨디션 조절" subtitle="끼니마다 채소 한 접시, 하루 과일 1~2개" />
          </ListCard>
          <T kind="small" style={{ marginTop: Spacing.sm, paddingHorizontal: 4 }}>
            성장기에는 굶거나 칼로리를 줄이지 않고, 보충제 대신 고기·생선·달걀·두부 같은 음식으로 든든하게 먹어요.
          </T>
        </View>
      ) : null}

      <View>
        <SectionLabel right={plan.remaining.kcal > 0 ? `남은 ${fmt(plan.remaining.kcal)} kcal` : undefined}>남은 끼니 추천</SectionLabel>
        <ListCard>
          {plan.recommendations.length === 0 ? (
            <ListRow
              marker="checkmark"
              title={eaten.kcal >= t.calories * 0.9 ? '오늘 목표만큼 먹었어요' : '추천할 끼니가 없어요'}
              subtitle={eaten.kcal >= t.calories * 0.9 ? '배고프면 채소나 단백질 위주로 가볍게 드세요' : '끼니를 기록하면 남은 양에 맞춰 다시 계산해요'}
            />
          ) : null}
          {plan.recommendations.map((r) =>
            r.kind === 'school' ? (
              <ListRow
                key={r.slot}
                marker="school-outline"
                title={`${MEAL_TITLES[r.slot]} · 급식`}
                subtitle={`${r.school.dishes.slice(0, 4).join(', ')}${r.school.dishes.length > 4 ? ' 외' : ''}\n${macroLine(r.school)}`}
                value={fmt(r.school.kcal)}
                unit="kcal"
              />
            ) : (
              <ListRow
                key={r.slot}
                marker="restaurant-outline"
                title={MEAL_TITLES[r.slot]}
                subtitle={`${r.meal.items.map((i) => `${i.food.name} ${formatQty(i)}`).join(', ')}\n${macroLine(r.meal)}`}
                value={fmt(r.meal.kcal)}
                unit="kcal"
              />
            ),
          )}
        </ListCard>
        <T kind="small" style={{ marginTop: Spacing.sm, paddingHorizontal: 4 }}>
          {GOAL_LABELS[profile.goal]} 목표 기준 · 먹은 것과 급식을 빼고 남은 영양으로 계산해요. 영양 수치는 대략적인 값이에요.
        </T>
      </View>
    </View>
  );

  return (
    <Screen>
      <Title eyebrow={`목표 ${fmt(t.calories)} kcal · ${macroLine({ protein: t.proteinG, carbs: t.carbsG, fat: t.fatG })}`}>식단</Title>
      {columns > 1 ? (
        <View style={{ flexDirection: 'row', gap: Spacing.xl, alignItems: 'flex-start' }}>
          <View style={{ flex: 5 }}>{gauges}</View>
          <View style={{ flex: 7 }}>{detail}</View>
        </View>
      ) : (
        <>
          {gauges}
          {detail}
        </>
      )}
    </Screen>
  );
}
