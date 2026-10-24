// 시간·날짜 선택 UI: 아래에서 올라오는 시트 + 돌려서 고르는 휠 + 달력
// 입력칸(TimeField, DateField, YearField)을 누르면 시트가 열린다.

import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentRef, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, type NativeScrollEvent, type NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Row, T } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEEKDAY_SHORT, formatLongDate, monthMatrix } from '@/lib/calendar';
import { dateKey, fromMinutes, toMinutes } from '@/lib/time';
import { formatTimeKo } from '@/lib/workout-slots';

const ITEM_H = 44;
const VISIBLE = 5;
const NUM = { fontVariant: ['tabular-nums' as const] };

/** 아래에서 올라오는 시트 */
export function Sheet({ visible, onClose, title, children, footer }: { visible: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
        <View
          style={{
            backgroundColor: c.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderWidth: 1,
            borderColor: c.border,
            paddingTop: 10,
            paddingHorizontal: Spacing.xl,
            paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.sm,
            width: '100%',
            maxWidth: 520,
            alignSelf: 'center',
            gap: Spacing.lg,
          }}>
          <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: c.border }} />
          <T kind="label">{title}</T>
          {children}
          {footer}
        </View>
      </View>
    </Modal>
  );
}

/** 돌려서 고르는 휠 한 줄. 손을 떼면 가장 가까운 칸에 맞춰 멈춘다 */
export function Wheel({ items, index, onChange, width = 72, label }: { items: string[]; index: number; onChange: (i: number) => void; width?: number; label: string }) {
  const c = useTheme();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [live, setLive] = useState(index);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clamp = (i: number) => Math.max(0, Math.min(items.length - 1, i));

  useEffect(() => {
    // 처음 열 때와 바깥에서 값이 바뀔 때 해당 칸으로 이동
    const t = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM_H, animated: false }), 0);
    return () => clearTimeout(t);
  }, [index]);

  const settle = (y: number) => {
    const i = clamp(Math.round(y / ITEM_H));
    ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
    setLive(i);
    if (i !== index) onChange(i);
  };
  const later = (y: number, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => settle(y), ms);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setLive(clamp(Math.round(y / ITEM_H)));
    // 웹에는 관성 스크롤 끝 이벤트가 없어 잠시 멈추면 맞춘다
    if (Platform.OS === 'web') later(y, 140);
  };

  return (
    <View style={{ width, height: ITEM_H * VISIBLE }} accessibilityLabel={`${label} ${items[live]}`}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ITEM_H * 2, height: ITEM_H, borderRadius: Radius.sm, backgroundColor: c.primarySoft }} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollEndDrag={(e) => later(e.nativeEvent.contentOffset.y, 120)}
        onMomentumScrollBegin={() => timer.current && clearTimeout(timer.current)}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        nestedScrollEnabled>
        {items.map((item, i) => {
          const d = Math.abs(i - live);
          return (
            <Pressable key={`${item}-${i}`} onPress={() => settle(i * ITEM_H)} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[NUM, { color: d === 0 ? c.text : d === 1 ? c.textSecondary : c.faint, fontSize: d === 0 ? 22 : 18, fontWeight: d === 0 ? '700' : '500' }]}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i));

/** 시간 고르기 시트(오전/오후 · 시 · 분) */
export function TimePickerSheet({
  visible,
  value,
  onClose,
  onConfirm,
  title = '시간',
  minuteStep = 5,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (hhmm: string) => void;
  title?: string;
  minuteStep?: number;
}) {
  const minutes = useMemo(() => Array.from({ length: 60 / minuteStep }, (_, i) => String(i * minuteStep).padStart(2, '0')), [minuteStep]);
  const toParts = (v: string) => {
    const total = toMinutes(v);
    const h = Math.floor(total / 60);
    return { pm: h >= 12 ? 1 : 0, h12: h % 12, m: Math.min(minutes.length - 1, Math.round((total % 60) / minuteStep)) };
  };
  const [parts, setParts] = useState(() => toParts(value));
  const [openedWith, setOpenedWith] = useState(value);
  // 다른 값으로 다시 열리면 그 값으로 맞춘다
  if (visible && openedWith !== value) {
    setOpenedWith(value);
    setParts(toParts(value));
  }
  const hhmm = fromMinutes((parts.h12 + parts.pm * 12) * 60 + parts.m * minuteStep);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <Row gap={Spacing.sm}>
          <Button title="취소" kind="secondary" onPress={onClose} style={{ flex: 1 }} />
          <Button title="확인" onPress={() => { onConfirm(hhmm); onClose(); }} style={{ flex: 2 }} />
        </Row>
      }>
      <T style={{ fontSize: 34, fontWeight: '700', textAlign: 'center', ...NUM }}>{formatTimeKo(hhmm)}</T>
      <Row gap={Spacing.sm} style={{ justifyContent: 'center' }}>
        <Wheel label="오전 오후" items={['오전', '오후']} index={parts.pm} onChange={(pm) => setParts((p) => ({ ...p, pm }))} width={80} />
        <Wheel label="시" items={HOURS_12} index={parts.h12} onChange={(h12) => setParts((p) => ({ ...p, h12 }))} />
        <T kind="heading">:</T>
        <Wheel label="분" items={minutes} index={parts.m} onChange={(m) => setParts((p) => ({ ...p, m }))} />
      </Row>
    </Sheet>
  );
}

/** 날짜 고르기 시트(달력) */
export function DatePickerSheet({
  visible,
  value,
  onClose,
  onConfirm,
  title = '날짜',
  min,
  max,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (date: string) => void;
  title?: string;
  min?: string;
  max?: string;
}) {
  const c = useTheme();
  const today = dateKey();
  const [selected, setSelected] = useState(value);
  const [cursor, setCursor] = useState(() => {
    const d = new Date(`${value}T00:00:00`);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [openedWith, setOpenedWith] = useState(value);
  if (visible && openedWith !== value) {
    const d = new Date(`${value}T00:00:00`);
    setOpenedWith(value);
    setSelected(value);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  }
  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const disabled = (d: string) => (min !== undefined && d < min) || (max !== undefined && d > max);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <Row gap={Spacing.sm}>
          <Button
            title="오늘"
            kind="secondary"
            onPress={() => {
              const d = new Date();
              setSelected(today);
              setCursor({ year: d.getFullYear(), month: d.getMonth() });
            }}
            disabled={disabled(today)}
            style={{ flex: 1 }}
          />
          <Button title="확인" onPress={() => { onConfirm(selected); onClose(); }} style={{ flex: 2 }} />
        </Row>
      }>
      <Row>
        <T style={{ fontSize: 22, fontWeight: '700', flex: 1 }}>{`${cursor.year}년 ${cursor.month + 1}월`}</T>
        <Pressable onPress={() => move(-1)} hitSlop={10} accessibilityLabel="이전 달" style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <Pressable onPress={() => move(1)} hitSlop={10} accessibilityLabel="다음 달" style={{ padding: 6 }}>
          <Ionicons name="chevron-forward" size={22} color={c.text} />
        </Pressable>
      </Row>
      <View>
        <Row gap={0} style={{ marginBottom: 4 }}>
          {WEEKDAY_SHORT.map((w) => (
            <T key={w} kind="small" style={{ flex: 1, textAlign: 'center' }}>
              {w}
            </T>
          ))}
        </Row>
        {monthMatrix(cursor.year, cursor.month).map((week, i) => (
          <View key={i} style={{ flexDirection: 'row' }}>
            {week.map((cell) => {
              const isSel = cell.date === selected;
              const off = disabled(cell.date);
              return (
                <Pressable key={cell.date} disabled={off} onPress={() => setSelected(cell.date)} style={{ flex: 1, alignItems: 'center', paddingVertical: 3 }} accessibilityLabel={formatLongDate(cell.date)}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSel ? c.text : 'transparent',
                      borderWidth: cell.date === today && !isSel ? 1 : 0,
                      borderColor: c.text,
                    }}>
                    <Text style={[NUM, { fontSize: 15, fontWeight: isSel ? '700' : '500', color: isSel ? c.primaryText : off || !cell.inMonth ? c.faint : c.text }]}>{cell.day}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <T kind="secondary" style={{ textAlign: 'center' }}>
        {formatLongDate(selected)}
      </T>
    </Sheet>
  );
}

/** 입력칸 모양의 버튼 — 누르면 시트가 열린다 */
function PickerButton({ label, text, hint, icon, onPress }: { label: string; text: string; hint?: string; icon: 'time-outline' | 'calendar-outline'; onPress: () => void }) {
  const c = useTheme();
  return (
    <View style={{ gap: 6, flex: 1, minWidth: 120 }}>
      <T kind="label">{label}</T>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${text}`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: c.background, opacity: pressed ? 0.7 : 1 })}>
        <Text style={[NUM, { flex: 1, color: c.text, fontSize: 16, fontWeight: '500' }]}>{text}</Text>
        <Ionicons name={icon} size={18} color={c.textSecondary} />
      </Pressable>
      {hint ? <T kind="small">{hint}</T> : null}
    </View>
  );
}

export function TimeField({ label, value, onChange, hint, minuteStep }: { label: string; value: string; onChange: (hhmm: string) => void; hint?: string; minuteStep?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PickerButton label={label} text={formatTimeKo(value)} hint={hint} icon="time-outline" onPress={() => setOpen(true)} />
      <TimePickerSheet visible={open} value={value} title={label} minuteStep={minuteStep} onClose={() => setOpen(false)} onConfirm={onChange} />
    </>
  );
}

export function DateField({ label, value, onChange, hint, min, max }: { label: string; value: string; onChange: (date: string) => void; hint?: string; min?: string; max?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PickerButton label={label} text={formatLongDate(value)} hint={hint} icon="calendar-outline" onPress={() => setOpen(true)} />
      <DatePickerSheet visible={open} value={value} title={label} min={min} max={max} onClose={() => setOpen(false)} onConfirm={onChange} />
    </>
  );
}

/** 연도 고르기(출생연도 등) */
export function YearField({ label, value, onChange, from, to }: { label: string; value: number | null; onChange: (year: number) => void; from: number; to: number }) {
  const [open, setOpen] = useState(false);
  const years = useMemo(() => Array.from({ length: to - from + 1 }, (_, i) => String(to - i)), [from, to]);
  const fallback = to - 20;
  const [pick, setPick] = useState(years.indexOf(String(value ?? fallback)));
  return (
    <>
      <PickerButton label={label} text={value ? `${value}년` : '선택하세요'} icon="calendar-outline" onPress={() => { setPick(Math.max(0, years.indexOf(String(value ?? fallback)))); setOpen(true); }} />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        footer={
          <Row gap={Spacing.sm}>
            <Button title="취소" kind="secondary" onPress={() => setOpen(false)} style={{ flex: 1 }} />
            <Button title="확인" onPress={() => { onChange(Number(years[pick])); setOpen(false); }} style={{ flex: 2 }} />
          </Row>
        }>
        <View style={{ alignItems: 'center' }}>
          <Wheel label="연도" items={years.map((y) => `${y}년`)} index={Math.max(0, pick)} onChange={setPick} width={140} />
        </View>
      </Sheet>
    </>
  );
}
