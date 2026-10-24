// 운동 기록 중: 세트별 무게·반복 입력, 완료 체크, 휴식 타이머

import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button, Card, Empty, Grid, Icon, Notice, Row, Screen, T } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { getExercise } from '@/data/exercises';
import { useTheme } from '@/hooks/use-theme';
import { confirm, notify } from '@/lib/confirm';
import { volume } from '@/lib/session';
import { useStore } from '@/store/useStore';
import type { ExerciseLog, SetLog } from '@/types/models';

function NumberCell({ value, onChange, decimal, label }: { value: number; onChange: (n: number) => void; decimal?: boolean; label: string }) {
  const c = useTheme();
  const [text, setText] = useState(value ? String(value) : '');
  // 바깥에서 값이 바뀐 경우(이전 세트 값 복사 등)에는 그 값을 보여 준다
  const shown = parseFloat(text.replace(',', '.') || '0') === value ? text : value ? String(value) : '';
  return (
    <TextInput
      accessibilityLabel={label}
      value={shown}
      placeholder="0"
      placeholderTextColor={c.textSecondary}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      onChangeText={(t) => {
        setText(t);
        const n = parseFloat(t.replace(',', '.'));
        onChange(Number.isFinite(n) ? n : 0);
      }}
      selectTextOnFocus
      style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: Radius.sm, paddingVertical: 8, backgroundColor: c.background }}
    />
  );
}

export default function SessionScreen() {
  const c = useTheme();
  const active = useStore((s) => s.activeWorkout);
  const place = useStore((s) => s.places.find((p) => p.id === s.activeWorkout?.placeId));
  const update = useStore((s) => s.updateActiveExercises);
  const finish = useStore((s) => s.finishWorkout);
  const discard = useStore((s) => s.discardWorkout);

  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!restUntil) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [restUntil]);

  if (!active) {
    return (
      <Screen edges={['bottom']}>
        <Empty icon="barbell-outline" title="진행 중인 운동이 없어요" action={<Button title="운동 탭으로" onPress={() => router.replace('/workout')} />} />
      </Screen>
    );
  }

  const setExercise = (i: number, next: ExerciseLog) => update(active.exercises.map((e, j) => (j === i ? next : e)));
  const setSet = (i: number, k: number, patch: Partial<SetLog>) => {
    const ex = active.exercises[i];
    setExercise(i, { ...ex, sets: ex.sets.map((s, j) => (j === k ? { ...s, ...patch } : s)) });
  };

  const toggleDone = (i: number, k: number) => {
    const ex = active.exercises[i];
    const done = !ex.sets[k].done;
    // 완료하면 다음 세트에 같은 값을 미리 채워 둔다
    const sets = ex.sets.map((s, j) => (j === k ? { ...s, done } : j === k + 1 && done && !s.done ? { ...s, weightKg: ex.sets[k].weightKg, reps: s.reps || ex.sets[k].reps } : s));
    setExercise(i, { ...ex, sets });
    if (done && ex.restSec) {
      setRestUntil(Date.now() + ex.restSec * 1000);
      setNow(Date.now());
    }
  };

  const doneSets = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const totalSets = active.exercises.reduce((n, e) => n + e.sets.length, 0);
  const restLeft = restUntil ? Math.max(0, Math.ceil((restUntil - now) / 1000)) : 0;

  const onFinish = () => {
    if (doneSets === 0) {
      confirm('기록 없음', '완료한 세트가 없어요. 운동을 취소할까요?', () => {
        discard();
        router.back();
      });
      return;
    }
    const mins = Math.round((Date.now() - active.startedAt) / 60000);
    const vol = Math.round(volume(active));
    finish();
    notify('운동 완료! 💪', `${mins}분 동안 ${doneSets}세트${vol > 0 ? `, 총 ${vol.toLocaleString()}kg` : ''}를 해냈어요.\n운동 후 2시간 안에 단백질을 챙겨 드세요.`);
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          title: active.dayName,
          headerRight: () => (
            <Pressable onPress={() => confirm('운동 취소', '이번 운동 기록을 버릴까요?', () => { discard(); router.back(); }, '버리기')} hitSlop={10}>
              <T style={{ color: c.danger, fontWeight: '600' }}>취소</T>
            </Pressable>
          ),
        }}
      />

      <Row>
        <View style={{ flex: 1 }}>
          <T kind="secondary">{place?.name ?? ''}</T>
          <T kind="heading">
            {doneSets} / {totalSets} 세트 완료
          </T>
        </View>
        <Button title="운동 끝내기" icon="flag" onPress={onFinish} />
      </Row>

      {restLeft > 0 ? (
        <Card tone="primary">
          <Row>
            <Icon name="timer-outline" size={26} color={c.primary} />
            <T kind="big" style={{ flex: 1, color: c.primary }}>
              휴식 {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, '0')}
            </T>
            <Button small kind="secondary" title="+30초" onPress={() => setRestUntil((restUntil ?? Date.now()) + 30000)} />
            <Button small kind="ghost" title="건너뛰기" onPress={() => setRestUntil(null)} />
          </Row>
        </Card>
      ) : null}

      <Grid min={2}>
        {active.exercises.map((ex, i) => {
          const info = getExercise(ex.exerciseId);
          const weighted = info?.load === 'weighted';
          const unit = info?.load === 'time' ? (info.pattern === 'cardio' ? '분' : '초') : '회';
          return (
            <Card key={`${ex.exerciseId}-${i}`} title={`${i + 1}. ${info?.name ?? ex.exerciseId}`} right={<T kind="small">{ex.target}</T>}>
              <View style={{ gap: Spacing.sm }}>
                {ex.note ? <Notice icon="trending-up">{ex.note}</Notice> : null}
                {info?.cue ? <T kind="small">자세 팁: {info.cue}</T> : null}
                <Row gap={Spacing.sm}>
                  <T kind="label" style={{ width: 36 }}>세트</T>
                  {weighted ? <T kind="label" style={{ flex: 1, textAlign: 'center' }}>kg</T> : null}
                  <T kind="label" style={{ flex: 1, textAlign: 'center' }}>{unit}</T>
                  <View style={{ width: 40 }} />
                </Row>
                {ex.sets.map((s, k) => (
                  <Row key={k} gap={Spacing.sm}>
                    <T style={{ width: 36, fontWeight: '700' }}>{k + 1}</T>
                    {weighted ? <NumberCell label={`${k + 1}세트 무게`} decimal value={s.weightKg} onChange={(n) => setSet(i, k, { weightKg: n })} /> : null}
                    <NumberCell label={`${k + 1}세트 반복`} value={s.reps} onChange={(n) => setSet(i, k, { reps: n })} />
                    <Pressable onPress={() => toggleDone(i, k)} hitSlop={6} accessibilityLabel={`${k + 1}세트 완료`} style={{ width: 40, alignItems: 'center' }}>
                      <Icon name={s.done ? 'checkmark-circle' : 'ellipse-outline'} size={32} color={s.done ? c.good : c.textSecondary} />
                    </Pressable>
                  </Row>
                ))}
                <Row gap={Spacing.sm}>
                  <Button
                    small
                    kind="ghost"
                    icon="add"
                    title="세트 추가"
                    onPress={() => {
                      const last = ex.sets[ex.sets.length - 1];
                      setExercise(i, { ...ex, sets: [...ex.sets, { reps: last?.reps ?? 10, weightKg: last?.weightKg ?? 0, done: false }] });
                    }}
                  />
                  {ex.sets.length > 1 ? <Button small kind="ghost" icon="remove" title="세트 삭제" onPress={() => setExercise(i, { ...ex, sets: ex.sets.slice(0, -1) })} /> : null}
                </Row>
              </View>
            </Card>
          );
        })}
      </Grid>

      <Button title="운동 끝내기" icon="flag" onPress={onFinish} />
    </Screen>
  );
}
