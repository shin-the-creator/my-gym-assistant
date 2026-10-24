// 식단: 목표 칼로리·탄단지에 맞춘 오늘의 식단

import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Button, Card, Empty, Grid, Notice, Row, Screen, Stat, StatRow, T, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-plan';
import { GOAL_LABELS } from '@/lib/body';
import { buildMealPlan, formatQty, planTotals, seedFrom } from '@/lib/diet';
import { useStore } from '@/store/useStore';

const TIPS: Record<string, string[]> = {
  fat_loss: ['배고플 땐 채소와 단백질을 먼저 드세요.', '음료 칼로리(라떼·주스·술)를 먼저 줄이는 게 가장 쉬워요.', '주 1회 정도는 목표 칼로리 근처에서 편하게 먹어도 괜찮아요.'],
  muscle_gain: ['끼니를 거르지 말고 간식으로 칼로리를 채우세요.', '운동 전후 탄수화물을 넉넉히 드세요.', '자기 전 그릭요거트·우유 같은 천천히 흡수되는 단백질이 좋아요.'],
  strength: ['운동하는 날에는 탄수화물을 충분히 드세요.', '단백질은 끼니마다 20~40g씩 나눠 드세요.'],
  maintain: ['접시의 절반은 채소, 1/4은 단백질, 1/4은 밥으로.', '단백질은 끼니마다 고르게 나눠 드세요.'],
};

export default function DietScreen() {
  const profile = useStore((s) => s.profile);
  const shuffle = useStore((s) => s.shuffleMeals);
  const shuffleCount = useStore((s) => s.mealShuffle);
  const today = useToday();

  const meals = useMemo(() => {
    if (!profile || !today) return [];
    return buildMealPlan(today.targets, profile.avoidFoods, seedFrom(`${today.today}:${shuffleCount[today.today] ?? 0}`));
  }, [profile, today, shuffleCount]);

  if (!profile || !today) {
    return (
      <Screen>
        <Title>식단</Title>
        <Card>
          <Empty icon="person-circle-outline" title="내 정보를 먼저 입력해 주세요" action={<Button title="입력하기" onPress={() => router.push('/profile')} />} />
        </Card>
      </Screen>
    );
  }

  const totals = planTotals(meals);
  const t = today.targets;
  const mealTimes = today.schedule.filter((s) => s.kind === 'meal' || s.kind === 'snack');
  const timeFor = (i: number) => (i < 3 ? mealTimes.filter((m) => m.kind === 'meal')[i]?.time : mealTimes.find((m) => m.kind === 'snack')?.time);

  return (
    <Screen>
      <Title subtitle={`${GOAL_LABELS[profile.goal]} 목표에 맞춘 오늘의 식단`} right={<Button small kind="secondary" icon="shuffle" title="다시 짜기" onPress={() => shuffle()} />}>
        식단
      </Title>

      <StatRow>
        <Stat label="칼로리" value={t.calories.toLocaleString()} unit="kcal" sub={`식단 합계 ${totals.kcal.toLocaleString()}`} />
        <Stat label="단백질" value={String(t.proteinG)} unit="g" sub={`식단 ${totals.protein}g`} />
        <Stat label="탄수화물" value={String(t.carbsG)} unit="g" sub={`식단 ${totals.carbs}g`} />
        <Stat label="지방" value={String(t.fatG)} unit="g" sub={`식단 ${totals.fat}g`} />
      </StatRow>

      <Grid>
        {meals.map((m, i) => (
          <Card key={m.slot} title={m.title} icon={m.slot === 'snack' ? 'nutrition' : 'restaurant'} right={<T kind="small">{timeFor(i) ?? ''}</T>}>
            <View style={{ gap: 6 }}>
              {m.items.map((it) => (
                <Row key={it.food.id}>
                  <T style={{ flex: 1 }}>{it.food.name}</T>
                  <T kind="secondary">{formatQty(it)}</T>
                </Row>
              ))}
              <T kind="small" style={{ marginTop: Spacing.sm }}>
                {m.kcal} kcal · 단 {m.protein}g · 탄 {m.carbs}g · 지 {m.fat}g
              </T>
            </View>
          </Card>
        ))}
      </Grid>

      <Card title="식단 팁" icon="bulb">
        <View style={{ gap: Spacing.sm }}>
          {(TIPS[profile.goal] ?? []).map((tip) => (
            <T key={tip}>• {tip}</T>
          ))}
          {today.workoutDay ? <Notice>오늘은 운동하는 날이에요. 운동 1~2시간 전 가벼운 탄수화물, 운동 후 단백질을 챙기세요.</Notice> : null}
          {profile.avoidFoods.length ? <T kind="small">제외한 음식: {profile.avoidFoods.join(', ')}</T> : null}
          <T kind="small">영양 수치는 대략적인 값이에요. 질환이 있다면 전문가와 상의하세요.</T>
        </View>
      </Card>
    </Screen>
  );
}
