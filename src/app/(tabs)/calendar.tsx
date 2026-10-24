// 달력: 날짜별 운동·식단·급식·물·체중을 한곳에서 보고 기록한다

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FoodLogSection, SchoolMealSection } from '@/components/food';
import { usePlannedWorkouts } from '@/hooks/use-plan';
import { EVENT_KINDS, type PlannedWorkout, eventsOn, postponeOneDay, resetAdjust, skipWorkout } from '@/lib/scheduler';
import { formatDays, formatTimeKo, hasFixedDays } from '@/lib/workout-slots';
import { DatePickerSheet } from '@/components/pickers';
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
      {item(<View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: c.text }} />, '운동함')}
      {item(<View style={{ width: 14, height: 3, borderRadius: 2, borderWidth: 1, borderColor: c.textSecondary }} />, '운동 예정')}
      {item(<View style={{ width: 5, height: 5, borderRadius: 1, backgroundColor: c.text }} />, '일정')}
      {item(<View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.textSecondary }} />, '식단 기록')}
      {item(<View style={{ width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: c.textSecondary }} />, '물 목표 달성')}
    </Row>
  );
}

function DayDetail({ date, planned }: { date: string; planned: PlannedWorkout[] }) {
  const c = useTheme();
  const allEvents = useStore((s) => s.events);
  const dayEvents = eventsOn(allEvents, date);
  const adjust = useStore((s) => s.workoutAdjust);
  const setAdjust = useStore((s) => s.setWorkoutAdjust);
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
        <SectionLabel>일정</SectionLabel>
        <ListCard>
          {dayEvents.map((e) => (
            <ListRow
              key={e.id}
              marker="calendar-outline"
              title={e.title}
              subtitle={[EVENT_KINDS[e.kind], e.repeatDays?.length ? `매주 ${formatDays(e.repeatDays)}` : null, e.remindMin ? '알림' : null, e.memo].filter(Boolean).join(' · ')}
              value={e.time ? formatTimeKo(e.time) : '종일'}
              onPress={() => router.push({ pathname: '/event', params: { id: e.id } })}
            />
          ))}
          <View style={{ padding: 14 }}>
            <Button title="일정 추가" kind="secondary" icon="add" onPress={() => router.push({ pathname: '/event', params: { date } })} />
          </View>
        </ListCard>
      </View>

      <View>
        <SectionLabel>운동</SectionLabel>
        <ListCard>
          {planned.map((p) => (
            <View key={`${p.from}-${p.time}`} style={{ paddingHorizontal: 18, paddingVertical: 14, gap: 10 }}>
              <Row>
                <View style={{ flex: 1 }}>
                  <T style={{ fontWeight: '600' }}>{`운동 예정${p.dayName ? ` · ${p.dayName}` : ''}`}</T>
                  <T kind="small">{`${formatTimeKo(p.time)}${p.label ? ` · ${p.label}` : ''}${p.moved ? ` · ${formatLongDate(p.from)}에서 옮김` : ''}`}</T>
                </View>
              </Row>
              <Row gap={Spacing.sm}>
                <Button small kind="secondary" title="하루 미루기" icon="arrow-forward" onPress={() => setAdjust(postponeOneDay(adjust, p.from, p.date))} />
                <Button small kind="ghost" title="건너뛰기" onPress={() => setAdjust(skipWorkout(adjust, p.from))} />
                {p.moved ? <Button small kind="ghost" title="원래대로" onPress={() => setAdjust(resetAdjust(adjust, p.from))} /> : null}
              </Row>
            </View>
          ))}
          {adjust[date]?.movedTo && adjust[date].movedTo !== date ? (
            <ListRow
              marker="arrow-forward-circle-outline"
              title={`이 날 운동을 ${formatLongDate(adjust[date].movedTo!)}로 옮겼어요`}
              right={<Button small kind="ghost" title="되돌리기" onPress={() => setAdjust(resetAdjust(adjust, date))} />}
            />
          ) : null}
          {adjust[date]?.skip ? (
            <ListRow marker="remove-circle-outline" title="이 날 운동은 건너뛰기로 했어요" subtitle="분할 순서는 다음 운동으로 그대로 이어져요" right={<Button small kind="ghost" title="되돌리기" onPress={() => setAdjust(resetAdjust(adjust, date))} />} />
          ) : null}
          {workouts.length === 0 && planned.length === 0 && !adjust[date] ? (
            <ListRow
              marker="barbell-outline"
              title={isFuture ? '운동 예정이 없어요' : '운동 기록이 없어요'}
              subtitle={isFuture ? (profile && hasFixedDays(profile) ? '쉬는 날이에요' : '내 정보에서 운동 요일을 정하면 예정이 표시돼요') : '쉬는 날도 회복에 필요해요'}
            />
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
  const [picking, setPicking] = useState(false);
  const jumpTo = (date: string) => {
    const d = new Date(`${date}T00:00:00`);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(date);
  };

  const workouts = useStore((s) => s.workouts);
  const foodLog = useStore((s) => s.foodLog);
  const water = useStore((s) => s.water);
  const profile = useStore((s) => s.profile);

  const events = useStore((s) => s.events);
  const marks = useMemo(() => {
    const workoutDays = new Set(workouts.map((w) => w.date));
    const foodDays = new Set(foodLog.map((f) => f.date));
    return { workoutDays, foodDays };
  }, [workouts, foodLog]);

  const weeks = monthMatrix(cursor.year, cursor.month);
  const lastVisible = weeks[weeks.length - 1][6].date;
  // 이번 달 화면 끝(다음 달로 넘어가면 그 달 끝)까지의 운동 예정
  const planned = usePlannedWorkouts(lastVisible > selected ? lastVisible : selected);
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
                    {marks.workoutDays.has(cell.date) ? (
                      <View style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: c.text }} />
                    ) : planned[cell.date] ? (
                      <View style={{ width: 12, height: 3, borderRadius: 2, borderWidth: 1, borderColor: c.textSecondary }} />
                    ) : null}
                    {eventsOn(events, cell.date).length > 0 ? <View style={{ width: 5, height: 5, borderRadius: 1, backgroundColor: c.text }} /> : null}
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
      <Pressable onPress={() => setPicking(true)} hitSlop={10} accessibilityLabel="날짜로 이동" style={{ padding: 6 }}>
        <Icon name="calendar-outline" size={20} color={c.text} />
      </Pressable>
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
      <Title eyebrow={`${cursor.year}년 · 달력`} right={header}>
        {`${cursor.month + 1}월`}
      </Title>
      {columns > 1 ? (
        <View style={{ flexDirection: 'row', gap: Spacing.xl, alignItems: 'flex-start' }}>
          <View style={{ flex: 6 }}>{grid}</View>
          <View style={{ flex: 5 }}>
            <DayDetail key={selected} date={selected} planned={planned[selected] ?? []} />
          </View>
        </View>
      ) : (
        <>
          {grid}
          <DayDetail key={selected} date={selected} planned={planned[selected] ?? []} />
        </>
      )}
      <DatePickerSheet visible={picking} value={selected} title="날짜로 이동" onClose={() => setPicking(false)} onConfirm={jumpTo} />
      {!profile ? <Button title="내 정보 입력하기" kind="secondary" onPress={() => router.push('/profile')} /> : null}
    </Screen>
  );
}
