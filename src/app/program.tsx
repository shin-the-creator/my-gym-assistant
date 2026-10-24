// 루틴 직접 정하기: 분할(미는 날·당기는 날…)과 그날 할 운동 부위·순서·운동을 내가 정한다.
// 운동은 "부위(움직임)" 단위로 저장되고, 장소마다 그 곳 기구로 할 수 있는 운동으로 바뀐다.
// 특정 운동을 고르면 그 장소에서 할 수 있을 때 그 운동을 먼저 쓴다.

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Chip, ChipRow, Field, Icon, ListCard, Notice, Row, Screen, SectionLabel, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { EXERCISES, PATTERN_NAMES, type Pattern, getExercise } from '@/data/exercises';
import { useProgram } from '@/hooks/use-plan';
import { useTheme } from '@/hooks/use-theme';
import { confirm, notify } from '@/lib/confirm';
import { PROGRAM_PRESETS, type ProgramDay, type Slot, programFocus } from '@/lib/routine';
import { useStore } from '@/store/useStore';

const ROLE_LABEL: Record<Slot['role'], string> = { main: '메인', accessory: '보조', finisher: '마무리' };
const PATTERNS = Object.keys(PATTERN_NAMES) as Pattern[];

const clone = (days: ProgramDay[]): ProgramDay[] => days.map((d) => ({ ...d, slots: d.slots.map((s) => ({ ...s })) }));

function move<T>(list: T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export default function ProgramScreen() {
  const c = useTheme();
  const { program, isCustom } = useProgram();
  const setCustomProgram = useStore((s) => s.setCustomProgram);
  const [days, setDays] = useState<ProgramDay[]>(() => clone(program));
  const [adding, setAdding] = useState<number | null>(null);
  const [picking, setPicking] = useState<string | null>(null); // "day-slot"
  const [dirty, setDirty] = useState(false);

  const update = (next: ProgramDay[]) => {
    setDays(next);
    setDirty(true);
  };
  const updateDay = (i: number, patch: Partial<ProgramDay>) => update(days.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const updateSlots = (i: number, slots: Slot[]) => updateDay(i, { slots, focus: programFocus(slots) });

  const save = () => {
    const names = days.map((d) => d.name.trim());
    if (days.length === 0) return notify('루틴 확인', '운동하는 날을 하나 이상 만들어 주세요.');
    if (names.some((n) => !n)) return notify('루틴 확인', '이름이 비어 있는 날이 있어요.');
    if (new Set(names).size !== names.length) return notify('루틴 확인', '같은 이름의 날이 있어요. 이름을 다르게 해 주세요(순서를 이어 갈 때 이름으로 구분해요).');
    if (days.some((d) => d.slots.length === 0)) return notify('루틴 확인', '운동 부위가 없는 날이 있어요. 부위를 추가하거나 그 날을 지워 주세요.');
    setCustomProgram(days.map((d) => ({ ...d, name: d.name.trim(), focus: programFocus(d.slots) })));
    router.back();
  };

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Row gap={Spacing.sm}>
          {isCustom ? (
            <Button
              title="자동 추천으로"
              kind="secondary"
              onPress={() =>
                confirm('자동 추천으로 되돌리기', '직접 만든 루틴을 지우고 내 정보(주당 횟수·목표·경력)에 맞춘 추천 루틴을 쓸까요?', () => {
                  setCustomProgram(null);
                  router.back();
                }, '되돌리기')
              }
            />
          ) : null}
          <Button title={dirty || !isCustom ? '이 루틴으로 저장' : '저장됨'} onPress={save} disabled={isCustom && !dirty} style={{ flex: 1 }} />
        </Row>
      }>
      <Notice icon="information-circle-outline">
        {isCustom ? '직접 만든 루틴을 쓰고 있어요.' : '지금은 내 정보로 자동 추천한 루틴이에요. 고치고 저장하면 내 루틴이 돼요.'} 순서대로 돌아가며, 어느 장소에서 하든 다음 날로 이어져요.
      </Notice>

      <View style={{ gap: Spacing.sm }}>
        <SectionLabel>템플릿으로 시작하기</SectionLabel>
        <ChipRow>
          {PROGRAM_PRESETS.map((p) => (
            <Chip key={p.id} label={p.name} onPress={() => update(clone(p.days))} />
          ))}
        </ChipRow>
      </View>

      {days.map((day, di) => (
        <Card key={di}>
          <View style={{ gap: Spacing.md }}>
            <Row>
              <T kind="label" style={{ flex: 1 }}>{`${di + 1}번째 날 · ${programFocus(day.slots)}`}</T>
              <Button small kind="ghost" title="" icon="arrow-up" onPress={() => update(move(days, di, -1))} disabled={di === 0} />
              <Button small kind="ghost" title="" icon="arrow-down" onPress={() => update(move(days, di, 1))} disabled={di === days.length - 1} />
              <Button small kind="ghost" title="" icon="trash-outline" onPress={() => update(days.filter((_, j) => j !== di))} />
            </Row>
            <Field label="이름" value={day.name} onChangeText={(name) => updateDay(di, { name })} placeholder="예: 미는 날, 당기는 날, 하체 날" />

            <ListCard>
              {day.slots.length === 0 ? (
                <View style={{ padding: 18 }}>
                  <T kind="secondary">아직 운동이 없어요. 아래에서 부위를 추가하세요.</T>
                </View>
              ) : null}
              {day.slots.map((slot, si) => {
                const key = `${di}-${si}`;
                const preferred = slot.preferred ? getExercise(slot.preferred) : undefined;
                const options = EXERCISES.filter((e) => e.pattern === slot.pattern);
                return (
                  <View key={key} style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 8 }}>
                    <Row gap={10}>
                      <T kind="small" style={{ width: 18, fontVariant: ['tabular-nums'] }}>{si + 1}</T>
                      <Pressable style={{ flex: 1 }} onPress={() => setPicking(picking === key ? null : key)} accessibilityRole="button">
                        <T style={{ fontWeight: '600' }}>{PATTERN_NAMES[slot.pattern]}</T>
                        <T kind="small">{preferred ? `${preferred.name} 우선` : '장소에 맞게 자동 선택'} · 눌러서 운동 고르기</T>
                      </Pressable>
                      <Chip
                        label={ROLE_LABEL[slot.role]}
                        selected={slot.role === 'main'}
                        onPress={() => updateSlots(di, day.slots.map((s, j) => (j === si ? { ...s, role: s.role === 'main' ? 'accessory' : 'main' } : s)))}
                      />
                    </Row>
                    <Row gap={4} style={{ justifyContent: 'flex-end' }}>
                      <Button small kind="ghost" title="" icon="arrow-up" onPress={() => updateSlots(di, move(day.slots, si, -1))} disabled={si === 0} />
                      <Button small kind="ghost" title="" icon="arrow-down" onPress={() => updateSlots(di, move(day.slots, si, 1))} disabled={si === day.slots.length - 1} />
                      <Button small kind="ghost" title="" icon="close" onPress={() => updateSlots(di, day.slots.filter((_, j) => j !== si))} />
                    </Row>
                    {picking === key ? (
                      <ChipRow>
                        <Chip label="장소에 맞게 자동" selected={!slot.preferred} onPress={() => { updateSlots(di, day.slots.map((s, j) => (j === si ? { ...s, preferred: undefined } : s))); setPicking(null); }} />
                        {options.map((e) => (
                          <Chip key={e.id} label={e.name} selected={slot.preferred === e.id} onPress={() => { updateSlots(di, day.slots.map((s, j) => (j === si ? { ...s, preferred: e.id } : s))); setPicking(null); }} />
                        ))}
                      </ChipRow>
                    ) : null}
                  </View>
                );
              })}
            </ListCard>

            {adding === di ? (
              <View style={{ gap: Spacing.sm }}>
                <T kind="label">추가할 부위</T>
                <ChipRow>
                  {PATTERNS.map((p) => (
                    <Chip
                      key={p}
                      label={PATTERN_NAMES[p]}
                      onPress={() => {
                        const role: Slot['role'] = p === 'cardio' ? 'finisher' : day.slots.some((s) => s.role === 'main') ? 'accessory' : 'main';
                        updateSlots(di, [...day.slots, { pattern: p, role }]);
                      }}
                    />
                  ))}
                </ChipRow>
                <Button small kind="secondary" title="다 골랐어요" onPress={() => setAdding(null)} style={{ alignSelf: 'flex-start' }} />
              </View>
            ) : (
              <Button small kind="secondary" title="운동 부위 추가" icon="add" onPress={() => setAdding(di)} style={{ alignSelf: 'flex-start' }} />
            )}
          </View>
        </Card>
      ))}

      <Pressable
        onPress={() => update([...days, { name: `${days.length + 1}일차`, focus: '', slots: [] }])}
        style={({ pressed }) => ({ borderWidth: 1, borderStyle: 'dashed', borderColor: c.border, borderRadius: 16, padding: 18, alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
        accessibilityRole="button">
        <Row gap={6}>
          <Icon name="add" color={c.text} />
          <T style={{ fontWeight: '600' }}>운동하는 날 추가</T>
        </Row>
      </Pressable>

      <T kind="small">
        메인은 무겁게(적은 횟수·긴 휴식), 보조는 가볍게(많은 횟수) 처방돼요. 운동을 직접 골라도 그 장소에 기구가 없으면 할 수 있는 운동으로 자동으로 바뀌어요.
      </T>
    </Screen>
  );
}
