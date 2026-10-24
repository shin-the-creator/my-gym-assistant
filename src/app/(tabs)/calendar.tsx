// 달력: 날짜별 운동·식단·급식·물·체중을 한곳에서 보고 기록한다

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FoodLogSection, SchoolMealSection } from '@/components/food';
import { Button, Field, Icon, ListCard, ListRow, Row, Screen, SectionLabel, T, Title } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { getExercise } from '@/data/exercises';
import { useLayout, useTheme } from '@/hooks/use-theme';
import { waterTargetMl } from '@/lib/body';
import { WEEKDAY_SHORT, formatLongDate, monthMatrix } from '@/lib/calendar';
import { sumEntries } from '@/lib/diet';
import { volume } from '@/lib/session';
import { dateKey } from '@/lib/time';
import { useStore } from '@/store/useStore';

const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');

function Legend() {
  const c = useTheme();
  const item = (mark: React.ReactNode, label: string) => (
    <Row gap={6}>
      {mark}
      <T kind="small">{label}</T>
    </Row>
  );
  return (
    <Row gap={Spacing.lg} wrap style={{ paddingHorizontal: 4 }}>
      {item(<View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: c.text }} />, '운동')}
      {item(<View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.textSecondary }} />, '식단 기록')}
      {item(<View style={{ width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: c.textSecondary }} />, '물 목표 달성')}
    </Row>
  );
}

function DayDetail({ date }: { date: string }) {
  const c = useTheme();
  const workouts = useStore((s) => s.workouts).filter((w) => w.date === date);
  const places = useStore((s) => s.places);
  const water = useStore((s) => s.water[date] ?? 0);
  const weight = useStore((s) => s.weights.find((w) => w.date === date));
  const profile = useStore((s) => s.profile);
  const addWater = useStore((s) => s.addWater);
  const addWeight = useStore((s) => s.addWeight);
  const [weightInput, setWeightInput] = useState('');
  const isFuture = date > dateKey();
  const waterGoal = profile ? waterTargetMl(profile.weightKg, workouts.length > 0) : 2000;

  const saveWeight = () => {
    const v = parseFloat(weightInput.replace(',', '.'));
    if (Number.isFinite(v) && v > 25 && v < 300) {
      addWeight(v, date);
      setWeightInput('');
    }
  };

  return (
    <View style={{ gap: Spacing.xl }}>
      <T kind="heading" style={{ fontSize: 20 }}>
        {formatLongDate(date)}
      </T>

      <View>
        <SectionLabel>운동</SectionLabel>
        <ListCard>
          {workouts.length === 0 ? (
            <ListRow marker="barbell-outline" title={isFuture ? '예정된 기록이 없어요' : '운동 기록이 없어요'} subtitle={isFuture ? undefined : '쉬는 날도 회복에 필요해요'} />
          ) : null}
          {workouts.map((w) => {
            const mins = w.finishedAt ? Math.round((w.finishedAt - w.startedAt) / 60000) : 0;
            const vol = volume(w);
            return (
              <ListRow
                key={w.id}
                marker="barbell"
                state="done"
                title={`${w.dayName} · ${places.find((p) => p.id === w.placeId)?.name ?? '삭제된 장소'}`}
                subtitle={w.exercises.map((e) => getExercise(e.exerciseId)?.name ?? e.exerciseId).join(', ')}
                value={String(mins)}
                unit="분"
                caption={vol > 0 ? `${fmt(vol)}kg` : `${w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)}세트`}
              />
            );
          })}
        </ListCard>
      </View>

      <SchoolMealSection date={date} />
      {!isFuture ? <FoodLogSection date={date} /> : null}

      {!isFuture ? (
        <View>
          <SectionLabel>물 · 체중</SectionLabel>
          <ListCard>
            <View style={{ paddingHorizontal: 18, paddingVertical: 14, gap: 10 }}>
              <Row>
                <T style={{ fontWeight: '600', flex: 1 }}>물</T>
                <Text style={{ color: c.text, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                  {fmt(water)}
                  <Text style={{ color: c.faint, fontSize: 12 }}> / {fmt(waterGoal)}ml</Text>
                </Text>
              </Row>
              <Row gap={Spacing.sm}>
                <Button small kind="secondary" title="+ 250ml" onPress={() => addWater(250, date)} style={{ flex: 1 }} />
                <Button small kind="secondary" title="+ 500ml" onPress={() => addWater(500, date)} style={{ flex: 1 }} />
                <Button small kind="ghost" title="되돌리기" onPress={() => addWater(-250, date)} />
              </Row>
            </View>
            <View style={{ paddingHorizontal: 18, paddingVertical: 14, gap: 10 }}>
              <Row>
                <T style={{ fontWeight: '600', flex: 1 }}>체중</T>
                <T style={{ fontWeight: '600' }}>{weight ? `${weight.weightKg}kg` : '기록 없음'}</T>
              </Row>
              <Row style={{ alignItems: 'flex-end' }}>
                <Field label="이 날 체중" suffix="kg" value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" placeholder={weight ? String(weight.weightKg) : '예: 70.5'} onSubmitEditing={saveWeight} />
                <Button title="저장" onPress={saveWeight} disabled={!weightInput} />
              </Row>
            </View>
          </ListCard>
        </View>
      ) : null}
    </View>
  );
}

export default function CalendarScreen() {
  const c = useTheme();
  const { columns } = useLayout();
  const today = dateKey();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);

  const workouts = useStore((s) => s.workouts);
  const foodLog = useStore((s) => s.foodLog);
  const water = useStore((s) => s.water);
  const profile = useStore((s) => s.profile);

  const marks = useMemo(() => {
    const workoutDays = new Set(workouts.map((w) => w.date));
    const foodDays = new Set(foodLog.map((f) => f.date));
    return { workoutDays, foodDays };
  }, [workouts, foodLog]);

  const weeks = monthMatrix(cursor.year, cursor.month);
  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  // 이번 달 요약
  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
  const monthWorkouts = new Set(workouts.filter((w) => w.date.startsWith(monthPrefix)).map((w) => w.date)).size;
  const monthFood = foodLog.filter((f) => f.date.startsWith(monthPrefix));
  const foodDays = new Set(monthFood.map((f) => f.date)).size;
  const avgKcal = foodDays ? sumEntries(monthFood).kcal / foodDays : 0;

  const grid = (
    <View style={{ gap: Spacing.md }}>
      <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: Radius.lg, backgroundColor: c.card, padding: Spacing.md }}>
        <Row style={{ marginBottom: Spacing.sm }}>
          {WEEKDAY_SHORT.map((w, i) => (
            <T key={w} kind="small" style={{ flex: 1, textAlign: 'center', color: i === 0 ? c.textSecondary : c.faint }}>
              {w}
            </T>
          ))}
        </Row>
        {weeks.map((week, wi) => (
          <View key={wi} style={{ flexDirection: 'row' }}>
            {week.map((cell) => {
              const isSel = cell.date === selected;
              const isToday = cell.date === today;
              const drank = water[cell.date] ?? 0;
              const waterMet = profile ? drank >= waterTargetMl(profile.weightKg, marks.workoutDays.has(cell.date)) * 0.9 : false;
              return (
                <Pressable
                  key={cell.date}
                  onPress={() => setSelected(cell.date)}
                  accessibilityLabel={formatLongDate(cell.date)}
                  style={({ pressed }) => ({ flex: 1, alignItems: 'center', paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSel ? c.text : 'transparent',
                      borderWidth: isToday && !isSel ? 1 : 0,
                      borderColor: c.text,
                    }}>
                    <Text style={{ fontSize: 15, fontWeight: isSel || isToday ? '700' : '500', color: isSel ? c.primaryText : cell.inMonth ? c.text : c.faint, fontVariant: ['tabular-nums'] }}>
                      {cell.day}
                    </Text>
                  </View>
                  <View style={{ height: 10, flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                    {marks.workoutDays.has(cell.date) ? <View style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: c.text }} /> : null}
                    {marks.foodDays.has(cell.date) ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.textSecondary }} /> : null}
                    {waterMet ? <View style={{ width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: c.textSecondary }} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Legend />
      <Row gap={Spacing.md} style={{ paddingHorizontal: 4 }}>
        <T kind="small">이번 달 운동 {monthWorkouts}일</T>
        <T kind="small">식단 기록 {foodDays}일{foodDays ? ` · 하루 평균 ${fmt(avgKcal)}kcal` : ''}</T>
      </Row>
    </View>
  );

  const header = (
    <Row gap={Spacing.sm}>
      <Pressable onPress={() => move(-1)} hitSlop={10} accessibilityLabel="이전 달" style={{ padding: 6 }}>
        <Icon name="chevron-back" size={22} color={c.text} />
      </Pressable>
      <Pressable onPress={() => move(1)} hitSlop={10} accessibilityLabel="다음 달" style={{ padding: 6 }}>
        <Icon name="chevron-forward" size={22} color={c.text} />
      </Pressable>
      {selected !== today || cursor.month !== new Date().getMonth() ? (
        <Button
          small
          kind="secondary"
          title="오늘"
          onPress={() => {
            const d = new Date();
            setCursor({ year: d.getFullYear(), month: d.getMonth() });
            setSelected(today);
          }}
        />
      ) : null}
    </Row>
  );

  return (
    <Screen>
      <Title eyebrow="기록 달력" right={header}>
        {`${cursor.year}년 ${cursor.month + 1}월`}
      </Title>
      {columns > 1 ? (
        <View style={{ flexDirection: 'row', gap: Spacing.xl, alignItems: 'flex-start' }}>
          <View style={{ flex: 6 }}>{grid}</View>
          <View style={{ flex: 5 }}>
            <DayDetail key={selected} date={selected} />
          </View>
        </View>
      ) : (
        <>
          {grid}
          <DayDetail key={selected} date={selected} />
        </>
      )}
      {!profile ? <Button title="내 정보 입력하기" kind="secondary" onPress={() => router.push('/profile')} /> : null}
    </Screen>
  );
}
