// 오늘: 오늘의 운동, 물 마시기, 하루 일정 한눈에 보기

import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, Card, Empty, Grid, Icon, type IconName, Notice, Progress, Row, Screen, T, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useProgram, useToday } from '@/hooks/use-plan';
import { useTheme } from '@/hooks/use-theme';
import type { ScheduleKind } from '@/lib/schedule';
import { useStore } from '@/store/useStore';

const KIND_ICON: Record<ScheduleKind, IconName> = {
  wake: 'sunny-outline',
  water: 'water-outline',
  meal: 'restaurant-outline',
  snack: 'nutrition-outline',
  workout: 'barbell-outline',
  winddown: 'moon-outline',
  sleep: 'bed-outline',
};

export default function TodayScreen() {
  const c = useTheme();
  const profile = useStore((s) => s.profile);
  const places = useStore((s) => s.places);
  const active = useStore((s) => s.activeWorkout);
  const lastPlaceId = useStore((s) => s.lastPlaceId);
  const addWater = useStore((s) => s.addWater);
  const today = useToday();
  const { program, nextIndex } = useProgram();

  const settingsButton = (
    <Pressable onPress={() => router.push('/settings')} hitSlop={10} accessibilityLabel="설정">
      <Icon name="settings-outline" size={24} />
    </Pressable>
  );

  if (!profile || !today) {
    return (
      <Screen>
        <Title right={settingsButton}>나의 헬스 트레이너</Title>
        <Card>
          <Empty
            icon="person-circle-outline"
            title="먼저 내 정보를 알려 주세요"
            body="키·몸무게·목표·기상 시간을 입력하면 몸 상태 분석, 운동 루틴, 식단, 물·수면 일정을 만들어 드려요."
            action={<Button title="내 정보 입력하기" icon="create-outline" onPress={() => router.push('/profile')} style={{ marginTop: Spacing.md }} />}
          />
        </Card>
      </Screen>
    );
  }

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const upcoming = today.schedule.filter((i) => i.minutes >= nowMin).slice(0, 6);
  const nextDay = program[nextIndex];
  const lastPlace = places.find((p) => p.id === lastPlaceId) ?? places[0];
  const waterPct = today.waterDrunk / today.waterTarget;
  const hour = new Date().getHours();
  const greet = hour < 11 ? '좋은 아침이에요' : hour < 17 ? '좋은 오후예요' : '오늘 하루도 수고했어요';

  return (
    <Screen>
      <Title subtitle={`${greet}, ${profile.name || '회원'}님`} right={settingsButton}>
        오늘
      </Title>

      <Grid>
        <Card title="오늘의 운동" icon="barbell" tone={active ? 'primary' : undefined}>
          {active ? (
            <View style={{ gap: Spacing.md }}>
              <T>
                <T style={{ fontWeight: '700' }}>{active.dayName}</T> 운동이 진행 중이에요.
              </T>
              <Button title="이어서 기록하기" icon="play" onPress={() => router.push('/session')} />
            </View>
          ) : today.workoutDay && nextDay ? (
            <View style={{ gap: Spacing.md }}>
              <View>
                <T kind="big">{nextDay.name}</T>
                <T kind="secondary">{nextDay.focus}</T>
              </View>
              {places.length === 0 ? (
                <Notice tone="warn">운동할 장소를 먼저 등록하면 그 곳 기구에 맞춘 루틴을 짜 드려요.</Notice>
              ) : (
                <T kind="secondary">{lastPlace ? `최근 장소: ${lastPlace.name}` : ''}</T>
              )}
              <Row wrap>
                {places.length === 0 ? (
                  <Button title="장소 등록하기" icon="add" onPress={() => router.push('/place/new')} />
                ) : (
                  <Button title="루틴 보기 · 시작" icon="play" onPress={() => router.push('/workout')} />
                )}
              </Row>
            </View>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              <T kind="big">휴식일</T>
              <T kind="secondary">근육은 쉬는 동안 자라요. 가볍게 걷기(30분)나 스트레칭을 추천해요.</T>
              {nextDay ? <T kind="small">다음 운동: {nextDay.name}</T> : null}
              <Button title="그래도 운동하기" kind="secondary" icon="barbell-outline" onPress={() => router.push('/workout')} />
            </View>
          )}
        </Card>

        <Card title="물 마시기" icon="water" right={<T kind="secondary">{(today.waterTarget / 1000).toFixed(1)}L 목표</T>}>
          <View style={{ gap: Spacing.md }}>
            <Row>
              <T kind="big" style={{ color: c.water }}>
                {(today.waterDrunk / 1000).toFixed(2)}L
              </T>
              <T kind="secondary">{Math.round(waterPct * 100)}%</T>
            </Row>
            <Progress value={waterPct} color={c.water} />
            <Row wrap gap={Spacing.sm}>
              <Button small kind="secondary" title="+ 한 컵 250ml" onPress={() => addWater(250)} />
              <Button small kind="secondary" title="+ 500ml" onPress={() => addWater(500)} />
              <Button small kind="ghost" title="- 250ml" onPress={() => addWater(-250)} />
            </Row>
            {waterPct >= 1 ? <Notice tone="good">오늘 물 목표 달성! 👏</Notice> : null}
          </View>
        </Card>

        <Card title="오늘 먹을 양" icon="restaurant">
          <View style={{ gap: Spacing.sm }}>
            <T kind="big">{today.targets.calories.toLocaleString()} kcal</T>
            <T kind="secondary">
              단백질 {today.targets.proteinG}g · 탄수화물 {today.targets.carbsG}g · 지방 {today.targets.fatG}g
            </T>
            <Button title="오늘 식단 보기" kind="secondary" icon="list" onPress={() => router.push('/diet')} />
          </View>
        </Card>

        <Card title="AI 코치" icon="chatbubbles">
          <View style={{ gap: Spacing.sm }}>
            <T kind="secondary">자세, 통증, 정체기, 식단 대체 음식 등 무엇이든 물어보세요. 내 루틴과 몸 상태를 알고 답해요.</T>
            <Button title="질문하기" kind="secondary" icon="chatbubble-ellipses-outline" onPress={() => router.push('/coach')} />
          </View>
        </Card>
      </Grid>

      <Card title="오늘 일정" icon="time">
        {upcoming.length === 0 ? <T kind="secondary">오늘 남은 일정이 없어요. 푹 주무세요 🌙</T> : null}
        {upcoming.map((item, i) => (
          <Row key={`${item.time}-${i}`} style={{ paddingVertical: 8, alignItems: 'flex-start' }}>
            <T style={{ width: 52, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{item.time}</T>
            <Icon name={KIND_ICON[item.kind]} color={item.kind === 'water' ? c.water : c.primary} />
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '600' }}>
                {item.title}
                {item.amountMl ? ` ${item.amountMl}ml` : ''}
              </T>
              {item.detail ? <T kind="small">{item.detail}</T> : null}
            </View>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
