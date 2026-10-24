// 운동: 프로그램(분할) 확인 → 장소 선택 → 그 장소 기구로 짠 오늘 루틴 → 시작

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Chip, ChipRow, Empty, Grid, Icon, ListItem, Notice, Row, Screen, T, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { PATTERN_NAMES, getExercise } from '@/data/exercises';
import { PLACE_KINDS } from '@/data/places';
import { useProgram } from '@/hooks/use-plan';
import { useTheme } from '@/hooks/use-theme';
import { GOAL_LABELS } from '@/lib/body';
import { confirm } from '@/lib/confirm';
import { planDay } from '@/lib/routine';
import { toExerciseLogs, volume } from '@/lib/session';
import { useStore } from '@/store/useStore';

export default function WorkoutScreen() {
  const c = useTheme();
  const profile = useStore((s) => s.profile);
  const places = useStore((s) => s.places);
  const workouts = useStore((s) => s.workouts);
  const active = useStore((s) => s.activeWorkout);
  const lastPlaceId = useStore((s) => s.lastPlaceId);
  const startWorkout = useStore((s) => s.startWorkout);
  const removeWorkout = useStore((s) => s.removeWorkout);
  const { program, nextIndex, isCustom } = useProgram();

  const [placeId, setPlaceId] = useState<string | null>(null);
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [swapping, setSwapping] = useState<number | null>(null);

  const place = places.find((p) => p.id === (placeId ?? lastPlaceId)) ?? places[0];
  const dIndex = dayIndex ?? nextIndex;
  const day = program[dIndex];

  const plan = useMemo(() => (profile && place && day ? planDay(day, place, profile, workouts, overrides) : []), [profile, place, day, workouts, overrides]);

  if (!profile) {
    return (
      <Screen>
        <Title>운동</Title>
        <Card>
          <Empty icon="person-circle-outline" title="내 정보를 먼저 입력해 주세요" action={<Button title="입력하기" onPress={() => router.push('/profile')} />} />
        </Card>
      </Screen>
    );
  }

  const start = () => {
    if (!place || !day) return;
    const go = () => {
      startWorkout({ placeId: place.id, dayIndex: dIndex, dayName: day.name, exercises: toExerciseLogs(plan, place, workouts) });
      setOverrides({});
      router.push('/session');
    };
    if (active) confirm('진행 중인 운동', '진행 중인 운동 기록을 버리고 새로 시작할까요?', go, '새로 시작');
    else go();
  };

  const recent = [...workouts].sort((a, b) => b.startedAt - a.startedAt).slice(0, 8);

  return (
    <Screen>
      <Title subtitle={`${GOAL_LABELS[profile.goal]} · 주 ${profile.workoutDaysPerWeek}회 프로그램`}>운동</Title>

      {active ? (
        <Card tone="primary">
          <View style={{ gap: Spacing.md }}>
            <Notice icon="play-circle">{active.dayName} 운동이 진행 중이에요.</Notice>
            <Button title="이어서 기록하기" icon="play" onPress={() => router.push('/session')} />
          </View>
        </Card>
      ) : null}

      <Card
        title={isCustom ? '내가 만든 루틴' : '나의 분할 프로그램 · 자동 추천'}
        icon="calendar"
        right={<Button small kind="secondary" title={isCustom ? '루틴 편집' : '직접 정하기'} icon="create-outline" onPress={() => router.push('/program')} />}>
        <T kind="small" style={{ marginBottom: Spacing.sm }}>
          어느 장소에서 하든 이 순서대로 이어집니다. 장소가 바뀌면 같은 부위를 그 곳 기구로 바꿔서 해요.
        </T>
        <ChipRow>
          {program.map((d, i) => (
            <Chip key={d.name} label={`${i === nextIndex ? '▶ ' : ''}${d.name}`} selected={i === dIndex} onPress={() => { setDayIndex(i); setOverrides({}); }} />
          ))}
        </ChipRow>
      </Card>

      {places.length === 0 ? (
        <Card>
          <Empty icon="location-outline" title="운동 장소를 등록해 주세요" body="장소의 기구를 알아야 루틴을 짤 수 있어요." action={<Button title="장소 추가" icon="add" onPress={() => router.push('/place/new')} />} />
        </Card>
      ) : (
        <Grid>
          <View style={{ gap: Spacing.lg }}>
            <Card title="어디서 운동하나요?" icon="location" right={<Button small kind="ghost" title="장소 관리" onPress={() => router.push('/places')} />}>
              <ChipRow>
                {places.map((p) => (
                  <Chip key={p.id} icon={PLACE_KINDS[p.kind].icon} label={p.name} selected={p.id === place?.id} onPress={() => { setPlaceId(p.id); setOverrides({}); }} />
                ))}
              </ChipRow>
            </Card>

            {day && place ? (
              <Card title={`${day.name} @ ${place.name}`} icon="barbell" right={<T kind="small">{day.focus}</T>}>
                {plan.map((item, i) => {
                  // 기본 선택 이유(가장 효과적인 운동)는 매번 반복되니 숨기고, 특별한 이유만 보여 준다
                  const note = item.exercise && !item.reason.startsWith('이 장소 기구로 할 수 있는') ? item.reason : !item.exercise ? item.reason : '';
                  const rx = item.prescription;
                  return (
                    <View key={i} style={{ paddingVertical: 12, borderBottomWidth: i < plan.length - 1 ? StyleSheet.hairlineWidth : 0, borderColor: c.border, gap: 8 }}>
                      <Row gap={12}>
                        <T kind="small" style={{ width: 18, fontVariant: ['tabular-nums'] }}>{i + 1}</T>
                        <View style={{ flex: 1 }}>
                          <T style={{ fontWeight: '600', color: item.exercise ? c.text : c.faint }}>{item.exercise ? item.exercise.name : PATTERN_NAMES[item.slot.pattern]}</T>
                          <T kind="small">
                            {rx ? `${PATTERN_NAMES[item.slot.pattern]} · ${rx.sets}세트 × ${rx.target}${rx.restSec ? ` · 휴식 ${rx.restSec}초` : ''}` : '이 장소에선 생략'}
                            {note ? ` · ${note}` : ''}
                          </T>
                        </View>
                        {item.slot.role === 'main' && item.exercise ? <T kind="small" style={{ color: c.text }}>메인</T> : null}
                        {item.alternatives.length > 0 ? (
                          <Button small kind="ghost" title="" icon="swap-horizontal" onPress={() => setSwapping(swapping === i ? null : i)} />
                        ) : null}
                      </Row>
                      {swapping === i ? (
                        <ChipRow>
                          {item.alternatives.map((alt) => (
                            <Chip
                              key={alt.id}
                              label={alt.name}
                              onPress={() => {
                                setOverrides({ ...overrides, [i]: alt.id });
                                setSwapping(null);
                              }}
                            />
                          ))}
                        </ChipRow>
                      ) : null}
                    </View>
                  );
                })}
                <Button title="이 루틴으로 운동 시작" icon="play" onPress={start} style={{ marginTop: Spacing.md }} />
              </Card>
            ) : null}
          </View>

          <Card title="최근 운동 기록" icon="stats-chart">
            {recent.length === 0 ? <T kind="secondary">아직 기록이 없어요. 첫 운동을 시작해 보세요!</T> : null}
            {recent.map((w) => {
              const where = places.find((p) => p.id === w.placeId)?.name ?? '삭제된 장소';
              const mins = w.finishedAt ? Math.round((w.finishedAt - w.startedAt) / 60000) : 0;
              return (
                <ListItem
                  key={w.id}
                  icon="checkmark-done"
                  title={`${w.date} · ${w.dayName}`}
                  subtitle={`${where} · ${w.exercises.map((e) => getExercise(e.exerciseId)?.name ?? e.exerciseId).slice(0, 3).join(', ')}${w.exercises.length > 3 ? ' 외' : ''} · ${mins}분${volume(w) > 0 ? ` · ${Math.round(volume(w)).toLocaleString()}kg` : ''}`}
                  right={<Button small kind="ghost" title="" icon="trash-outline" onPress={() => confirm('기록 삭제', '이 운동 기록을 지울까요?', () => removeWorkout(w.id))} />}
                />
              );
            })}
            {recent.length > 0 ? (
              <Row style={{ marginTop: Spacing.sm }}>
                <Icon name="information-circle-outline" />
                <T kind="small" style={{ flex: 1 }}>다음 루틴의 무게·반복 수는 이 기록을 바탕으로 자동 제안돼요.</T>
              </Row>
            ) : null}
          </Card>
        </Grid>
      )}
    </Screen>
  );
}
