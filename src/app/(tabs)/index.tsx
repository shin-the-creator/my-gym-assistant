// 오늘: 차분한 상단 문구 → 핵심 수치(칼로리·시간·걸음) → 오늘의 루틴 → 하단 운동 시작 버튼

import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Empty, type IconName, ListCard, ListRow, Metric, Progress, Row, Screen, SectionLabel, T, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { PATTERN_NAMES } from '@/data/exercises';
import { useProgram, useToday } from '@/hooks/use-plan';
import { useTodaySteps } from '@/hooks/use-steps';
import { useLayout } from '@/hooks/use-theme';
import { activeKcalGoal, stepGoal, stepsKcal, workoutKcal, workoutMinutesOn } from '@/lib/activity';
import { planDay } from '@/lib/routine';
import type { ScheduleKind } from '@/lib/schedule';
import { EVENT_KINDS, eventsOn } from '@/lib/scheduler';
import { estimateMinutes, toExerciseLogs } from '@/lib/session';
import { dateKey, toMinutes } from '@/lib/time';
import { formatTimeKo } from '@/lib/workout-slots';
import { useStore } from '@/store/useStore';

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

const KIND_ICON: Record<ScheduleKind, IconName> = {
  wake: 'sunny-outline',
  water: 'water-outline',
  meal: 'restaurant-outline',
  snack: 'nutrition-outline',
  workout: 'barbell-outline',
  winddown: 'moon-outline',
  sleep: 'bed-outline',
};

/** 운동 중일 때 수치가 실시간으로 오르도록 30초마다 다시 그린다 */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export default function TodayScreen() {
  const profile = useStore((s) => s.profile);
  const places = useStore((s) => s.places);
  const workouts = useStore((s) => s.workouts);
  const events = useStore((s) => s.events);
  const active = useStore((s) => s.activeWorkout);
  const lastPlaceId = useStore((s) => s.lastPlaceId);
  const addWater = useStore((s) => s.addWater);
  const startWorkout = useStore((s) => s.startWorkout);
  const today = useToday();
  const { program, nextIndex } = useProgram();
  const steps = useTodaySteps();
  const now = useNow(!!active);
  const { columns } = useLayout();

  const place = places.find((p) => p.id === lastPlaceId) ?? places[0];
  const day = program[nextIndex];
  const plan = useMemo(() => (profile && place && day ? planDay(day, place, profile, workouts) : []), [profile, place, day, workouts]);

  const date = new Date(now);
  const dateText = `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}`;


  if (!profile || !today) {
    return (
      <Screen>
        <Title eyebrow={dateText}>
          내 정보를 알려 주세요.
        </Title>
        <Card>
          <Empty
            icon="person-circle-outline"
            title="몸 상태에 맞춘 하루를 준비해요"
            body="키·몸무게·목표·기상 시간을 입력하면 운동 루틴, 식단, 물·수면 일정을 만들어 드려요."
            action={<Button title="내 정보 입력하기" onPress={() => router.push('/profile')} style={{ marginTop: Spacing.md, alignSelf: 'stretch' }} />}
          />
        </Card>
      </Screen>
    );
  }

  // 핵심 수치
  const minutes = workoutMinutesOn(today.today, workouts, active, now);
  const kcal = workoutKcal(minutes, profile.weightKg) + stepsKcal(steps ?? 0, profile.weightKg);
  const planned = plan.length ? estimateMinutes(plan) : 45;
  const minuteGoal = today.workoutDay ? planned : 30;
  const doneToday = workouts.some((w) => w.date === today.today);

  // 오늘의 루틴 상태: 진행 중 기록 또는 오늘 마친 기록에 들어 있으면 완료
  const doneIds = new Set<string>([
    ...workouts.filter((w) => w.date === today.today).flatMap((w) => w.exercises.map((e) => e.exerciseId)),
    ...(active?.exercises.filter((e) => e.sets.length > 0 && e.sets.every((s) => s.done)).map((e) => e.exerciseId) ?? []),
  ]);
  const rows = plan.filter((p) => p.exercise && p.prescription);
  const firstPending = rows.findIndex((p) => !doneIds.has(p.exercise!.id));
  const doneCount = rows.filter((p) => doneIds.has(p.exercise!.id)).length;
  const warmedUp = doneToday || doneCount > 0 || !!active;

  const headline = active
    ? `${active.dayName} 운동이 진행 중입니다.`
    : doneToday
      ? '오늘 운동을 마쳤어요.'
      : today.workoutDay
        ? '오늘 운동을 시작하세요.'
        : '오늘은 회복하는 날이에요.';

  // 오늘 일정에 잡힌 운동 시각(여러 번일 수 있음)
  const workoutTimes = today.schedule.filter((i) => i.kind === 'workout').map((i) => formatTimeKo(i.time));
  const nowMin = date.getHours() * 60 + date.getMinutes();
  // 하루 일과와 달력에 넣은 오늘 일정(종일 일정은 맨 위)을 시간 순으로 합친다
  const upcoming = [
    ...eventsOn(events, dateKey(date))
      .filter((e) => !e.time || toMinutes(e.time) >= nowMin)
      .map((e) => ({ key: e.id, minutes: e.time ? toMinutes(e.time) : -1, marker: 'calendar-outline' as IconName, title: e.title, subtitle: EVENT_KINDS[e.kind], value: e.time ?? '종일', id: e.id })),
    ...today.schedule
      .filter((i) => i.minutes >= nowMin)
      .map((i, n) => ({ key: `${i.time}-${n}`, minutes: i.minutes, marker: KIND_ICON[i.kind], title: i.amountMl ? `${i.title} ${i.amountMl}ml` : i.title, subtitle: i.detail, value: i.time, id: undefined })),
  ]
    .sort((a, b) => a.minutes - b.minutes)
    .slice(0, 6);

  const start = () => {
    if (active) return router.push('/session');
    if (!place) return router.push('/place/new');
    if (!day) return;
    startWorkout({ placeId: place.id, dayIndex: nextIndex, dayName: day.name, exercises: toExerciseLogs(plan, place, workouts) });
    router.push('/session');
  };

  const actionTitle = active ? '이어서 기록하기' : !place ? '운동 장소 등록하기' : doneToday || !today.workoutDay ? '그래도 운동하기' : '운동 시작';

  const stats = (
    <View style={{ gap: Spacing.md }}>
      <Metric label="활동 칼로리" value={kcal} unit="kcal" goal={activeKcalGoal(profile.goal)} size="lg" />
      <Row gap={Spacing.md} style={{ alignItems: 'stretch' }}>
        <View style={{ flex: 1 }}>
          <Metric label="운동 시간" value={minutes} unit="분" goal={minuteGoal} />
        </View>
        <View style={{ flex: 1 }}>
          <Metric
            label="걸음 수"
            value={steps}
            unit="걸음"
            goal={stepGoal(profile.goal)}
            footnote={steps === null ? '이 기기에선 측정 불가' : undefined}
          />
        </View>
      </Row>
      {/* 물: 한 장의 작은 카드에 숫자·게이지·버튼을 함께 */}
      <Card>
        <View style={{ gap: 10 }}>
          <Row>
            <T kind="label" style={{ flex: 1 }}>물</T>
            <T style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {today.waterDrunk.toLocaleString('ko-KR')}
              <T kind="small">{` / ${today.waterTarget.toLocaleString('ko-KR')}ml`}</T>
            </T>
          </Row>
          <Progress value={today.waterDrunk / today.waterTarget} />
          <Row gap={Spacing.sm}>
            <Button small kind="secondary" title="+ 250ml" onPress={() => addWater(250)} style={{ flex: 1 }} />
            <Button small kind="secondary" title="+ 500ml" onPress={() => addWater(500)} style={{ flex: 1 }} />
            <Button small kind="ghost" title="되돌리기" onPress={() => addWater(-250)} />
          </Row>
        </View>
      </Card>
    </View>
  );

  const routine = (
    <View style={{ gap: Spacing.xl }}>
      <View>
        <SectionLabel right={rows.length ? `${workoutTimes.length ? `${workoutTimes.join(', ')} · ` : ''}${doneCount}/${rows.length} 완료 · 약 ${planned}분` : undefined}>
          {day ? `오늘의 루틴 · ${day.name}` : '오늘의 루틴'}
        </SectionLabel>
        {!place ? (
          <ListCard>
            <ListRow marker="add" title="운동 장소를 등록하세요" subtitle="장소의 기구에 맞춰 루틴을 짜 드려요" onPress={() => router.push('/place/new')} />
          </ListCard>
        ) : !today.workoutDay && !doneToday && !active ? (
          <ListCard>
            <ListRow marker="1" state="current" title="가볍게 걷기" subtitle="대화가 가능한 속도 · 회복 촉진" value="30" unit="분" caption="권장" />
            <ListRow marker="2" title="전신 스트레칭" subtitle="고관절 · 흉추 · 햄스트링" value="10" unit="분" caption="권장" />
            <ListRow marker="arrow-forward" title={`다음 운동: ${day?.name ?? ''}`} subtitle={day?.focus} onPress={() => router.push('/workout')} />
          </ListCard>
        ) : (
          <ListCard>
            <ListRow marker="1" state={warmedUp ? 'done' : 'current'} title="워밍업 스트레칭" subtitle="관절 돌리기 · 가벼운 세트" value="5" unit="분" caption={warmedUp ? '완료' : '다음'} />
            {rows.map((p, i) => {
              const ex = p.exercise!;
              const rx = p.prescription!;
              const done = doneIds.has(ex.id);
              const current = warmedUp && !done && i === firstPending;
              return (
                <ListRow
                  key={ex.id}
                  marker={String(i + 2)}
                  state={done ? 'done' : current ? 'current' : 'idle'}
                  title={ex.name}
                  subtitle={`${PATTERN_NAMES[ex.pattern]} · ${rx.target}`}
                  value={String(rx.sets)}
                  unit="세트"
                  caption={done ? '완료' : current ? '다음' : '대기'}
                  onPress={() => router.push('/workout')}
                />
              );
            })}
          </ListCard>
        )}
        {place ? <T kind="small" style={{ marginTop: Spacing.sm, paddingHorizontal: 4 }}>{place.name} 기구 기준 · 운동 탭에서 장소와 종목을 바꿀 수 있어요</T> : null}
      </View>

      <View>
        <SectionLabel>남은 일정</SectionLabel>
        <ListCard>
          {upcoming.length === 0 ? <ListRow marker="moon-outline" title="오늘 남은 일정이 없어요" subtitle="푹 주무세요" /> : null}
          {upcoming.map((item) => (
            <ListRow
              key={item.key}
              marker={item.marker}
              title={item.title}
              subtitle={item.subtitle}
              value={item.value}
              onPress={item.id ? () => router.push({ pathname: '/event', params: { id: item.id } }) : undefined}
            />
          ))}
        </ListCard>
      </View>

      <View>
        <SectionLabel>바로가기</SectionLabel>
        <ListCard>
          <ListRow
            marker="restaurant-outline"
            title="오늘 식단"
            subtitle={`목표 ${today.targets.calories.toLocaleString('ko-KR')} kcal · 급식·사진으로 기록`}
            onPress={() => router.push('/diet')}
          />
          <ListRow marker="chatbubble-outline" title="AI 코치에게 묻기" subtitle="자세 · 통증 · 정체기 · 대체 음식" onPress={() => router.push('/coach')} />
          <ListRow marker="mail-outline" title="의견 보내기" subtitle="불편한 점·원하는 기능 알려 주기" onPress={() => router.push('/feedback')} />
        </ListCard>
      </View>
    </View>
  );

  const footer: ReactNode = (
    <Row gap={Spacing.lg}>
      {columns > 1 ? (
        <View style={{ flex: 1 }}>
          <T style={{ fontWeight: '600' }} numberOfLines={1}>
            {active ? active.dayName : day ? `${day.name} · ${day.focus}` : '오늘의 운동'}
          </T>
          <T kind="small">{place ? `${place.name} · 약 ${planned}분` : '장소를 등록하면 루틴이 만들어져요'}</T>
        </View>
      ) : null}
      <Button title={actionTitle} onPress={start} disabled={!!place && !day && !active} style={columns > 1 ? { minWidth: 220 } : { flex: 1 }} />
    </Row>
  );

  return (
    <Screen footer={footer}>
      <Title eyebrow={dateText}>
        {headline}
      </Title>
      {columns > 1 ? (
        <View style={{ flexDirection: 'row', gap: Spacing.xl, alignItems: 'flex-start' }}>
          <View style={{ flex: 7 }}>{stats}</View>
          <View style={{ flex: 5 }}>{routine}</View>
        </View>
      ) : (
        <>
          {stats}
          {routine}
        </>
      )}
    </Screen>
  );
}
