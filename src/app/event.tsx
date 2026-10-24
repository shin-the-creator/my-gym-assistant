// 일정 추가·수정: 제목, 종류, 날짜, 시간(선택), 매주 반복, 알림, 메모

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DateField, TimeField } from '@/components/pickers';
import { Button, Card, Chip, ChipRow, Field, Row, Screen, T, WeekdayPicker } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { confirm, notify } from '@/lib/confirm';
import { EVENT_KINDS, REMIND_OPTIONS } from '@/lib/scheduler';
import { dateKey } from '@/lib/time';
import { useStore } from '@/store/useStore';
import type { EventKind } from '@/types/models';

export default function EventScreen() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const existing = useStore((s) => s.events.find((e) => e.id === params.id));
  const saveEvent = useStore((s) => s.saveEvent);
  const removeEvent = useStore((s) => s.removeEvent);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [kind, setKind] = useState<EventKind>(existing?.kind ?? 'study');
  const [date, setDate] = useState(existing?.date ?? params.date ?? dateKey());
  const [hasTime, setHasTime] = useState(existing ? !!existing.time : true);
  const [time, setTime] = useState(existing?.time ?? '18:00');
  const [repeat, setRepeat] = useState<number[]>(existing?.repeatDays ?? []);
  const [remindMin, setRemindMin] = useState<number | undefined>(existing?.remindMin);
  const [memo, setMemo] = useState(existing?.memo ?? '');

  const save = () => {
    if (!title.trim()) return notify('일정 확인', '일정 이름을 입력해 주세요.');
    saveEvent({
      id: existing?.id,
      title: title.trim(),
      kind,
      date,
      time: hasTime ? time : undefined,
      repeatDays: repeat.length ? [...repeat].sort() : undefined,
      remindMin: hasTime ? remindMin : undefined,
      memo: memo.trim() || undefined,
    });
    router.back();
  };

  return (
    <Screen
      narrow
      edges={['bottom']}
      footer={
        <Row gap={Spacing.sm}>
          {existing ? (
            <Button
              title="삭제"
              kind="danger"
              onPress={() =>
                confirm('일정 삭제', `"${existing.title}" 일정을 지울까요?${existing.repeatDays?.length ? ' 반복되는 모든 날에서 지워져요.' : ''}`, () => {
                  removeEvent(existing.id);
                  router.back();
                }, '삭제')
              }
            />
          ) : null}
          <Button title={existing ? '저장' : '일정 추가'} onPress={save} disabled={!title.trim()} style={{ flex: 1 }} />
        </Row>
      }>
      <Card>
        <View style={{ gap: Spacing.lg }}>
          <Field label="일정" value={title} onChangeText={setTitle} placeholder="예: 수학 학원, 중간고사, 친구 약속" autoFocus={!existing} />
          <View style={{ gap: Spacing.sm }}>
            <T kind="label">종류</T>
            <ChipRow>
              {(Object.keys(EVENT_KINDS) as EventKind[]).map((k) => (
                <Chip key={k} label={EVENT_KINDS[k]} selected={kind === k} onPress={() => setKind(k)} />
              ))}
            </ChipRow>
          </View>
          <DateField label={repeat.length ? '시작 날짜' : '날짜'} value={date} onChange={setDate} />
          <View style={{ gap: Spacing.sm }}>
            <T kind="label">시간</T>
            <ChipRow>
              <Chip label="시간 정하기" selected={hasTime} onPress={() => setHasTime(true)} />
              <Chip label="하루 종일" selected={!hasTime} onPress={() => setHasTime(false)} />
            </ChipRow>
            {hasTime ? <TimeField label="시작 시간" value={time} onChange={setTime} /> : null}
          </View>
          <View style={{ gap: Spacing.sm }}>
            <T kind="label">매주 반복</T>
            <WeekdayPicker value={repeat} onChange={setRepeat} />
            <T kind="small">{repeat.length ? '고른 요일마다 반복돼요.' : '요일을 고르지 않으면 한 번만 있는 일정이에요.'}</T>
          </View>
          {hasTime ? (
            <View style={{ gap: Spacing.sm }}>
              <T kind="label">알림</T>
              <ChipRow>
                {REMIND_OPTIONS.map((o) => (
                  <Chip key={o.label} label={o.label} selected={remindMin === o.min} onPress={() => setRemindMin(o.min)} />
                ))}
              </ChipRow>
            </View>
          ) : null}
          <Field label="메모(선택)" value={memo} onChangeText={setMemo} placeholder="준비물, 장소 등" multiline />
        </View>
      </Card>
    </Screen>
  );
}
