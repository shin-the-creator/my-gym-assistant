// 공통 UI 컴포넌트 — 매트 다크 · 모노톤 · 큰 숫자 · 얇은 경계선

import Ionicons from '@expo/vector-icons/Ionicons';
import { useScrollToTop } from 'expo-router';
import { type ComponentProps, type ComponentRef, type ReactNode, Children, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useLayout, useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const NUM: TextStyle = { fontVariant: ['tabular-nums'], letterSpacing: -0.5 };

/** 화면 틀. footer를 주면 하단에 고정된 액션 영역이 생긴다 */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  footer,
  narrow,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  footer?: ReactNode;
  /** 폼·메뉴 화면: 태블릿에서도 읽기 좋은 폭(720)으로 가운데 정렬 */
  narrow?: boolean;
}) {
  const c = useTheme();
  const { isTablet } = useLayout();
  const pad = isTablet ? Spacing.xl : Spacing.lg;
  // 이미 보고 있는 탭을 다시 누르면 맨 위로 부드럽게 스크롤한다
  const webScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const keyboardScrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  useScrollToTop(webScrollRef);
  useScrollToTop(keyboardScrollRef);
  const width = narrow ? { maxWidth: 720 } : null;
  const inner = <View style={[styles.inner, width, { paddingHorizontal: pad, paddingTop: pad, gap: Spacing.xl }]}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.background }}>
      {scroll ? (
        // 입력칸을 누르면 키보드 위로 올라오도록 스크롤한다(웹은 브라우저가 처리)
        Platform.OS === 'web' ? (
          <ScrollView ref={webScrollRef} contentContainerStyle={{ paddingBottom: Spacing.xxl }} keyboardShouldPersistTaps="handled">
            {inner}
          </ScrollView>
        ) : (
          <KeyboardAwareScrollView ref={keyboardScrollRef} bottomOffset={24} contentContainerStyle={{ paddingBottom: Spacing.xxl }} keyboardShouldPersistTaps="handled">
            {inner}
          </KeyboardAwareScrollView>
        )
      ) : (
        inner
      )}
      {footer ? (
        <View style={{ borderTopWidth: 1, borderColor: c.border, backgroundColor: c.background, paddingHorizontal: pad, paddingVertical: Spacing.md }}>
          <View style={[styles.inner, width]}>{footer}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/** 상단 영역: 작은 회색 보조 문구 + 차분한 큰 제목 */
export function Title({ children, subtitle, eyebrow, right }: { children: ReactNode; subtitle?: string; eyebrow?: string; right?: ReactNode }) {
  const c = useTheme();
  return (
    <View style={[styles.row, { alignItems: 'flex-start' }]}>
      <View style={{ flex: 1, gap: 6 }}>
        {eyebrow ? <Text style={{ color: c.textSecondary, fontSize: 15, fontWeight: '500' }}>{eyebrow}</Text> : null}
        <Text style={[styles.title, { color: c.text }]}>{children}</Text>
        {subtitle ? <Text style={{ color: c.textSecondary, fontSize: 14 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

type TextKind = 'body' | 'secondary' | 'small' | 'heading' | 'label' | 'big';

export function T({ children, kind = 'body', style, numberOfLines }: { children: ReactNode; kind?: TextKind; style?: TextStyle; numberOfLines?: number }) {
  const c = useTheme();
  const map: Record<TextKind, TextStyle> = {
    body: { fontSize: 15, color: c.text, lineHeight: 21 },
    secondary: { fontSize: 14, color: c.textSecondary, lineHeight: 20 },
    small: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
    heading: { fontSize: 17, fontWeight: '600', color: c.text },
    label: { fontSize: 12, fontWeight: '600', color: c.textSecondary, letterSpacing: 0.3 },
    big: { fontSize: 30, fontWeight: '700', color: c.text, ...NUM },
  };
  return (
    <Text style={[map[kind], style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/** 카드 바깥 위에 붙는 작은 섹션 제목 */
export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={[styles.row, { paddingHorizontal: 4, marginBottom: Spacing.sm }]}>
      <T kind="label" style={{ flex: 1 }}>
        {children}
      </T>
      {typeof right === 'string' ? <T kind="small" style={NUM}>{right}</T> : right}
    </View>
  );
}

export function Card({ children, title, icon, right, style, tone }: { children?: ReactNode; title?: string; icon?: IconName; right?: ReactNode; style?: ViewStyle; tone?: 'primary' }) {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: tone === 'primary' ? c.textSecondary : c.border }, style]}>
      {title ? (
        <View style={[styles.row, { marginBottom: Spacing.md, gap: 8 }]}>
          {icon ? <Ionicons name={icon} size={15} color={c.textSecondary} /> : null}
          <T kind="label" style={{ flex: 1 }}>
            {title}
          </T>
          {typeof right === 'string' ? <T kind="small">{right}</T> : right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** 태블릿에서는 여러 열, 폰에서는 한 열 */
export function Grid({ children, min, gap = Spacing.md }: { children: ReactNode; min?: number; gap?: number }) {
  const { columns } = useLayout();
  const cols = Math.min(columns, min ?? columns);
  const items = Children.toArray(children).filter(Boolean);
  if (cols === 1) return <View style={{ gap }}>{items}</View>;
  const rows: ReactNode[][] = [];
  items.forEach((child, i) => {
    if (i % cols === 0) rows.push([]);
    rows[rows.length - 1].push(child);
  });
  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap, alignItems: 'stretch' }}>
          {row.map((child, i) => (
            <View key={i} style={{ flex: 1 }}>
              {child}
            </View>
          ))}
          {Array.from({ length: cols - row.length }).map((_, i) => (
            <View key={`pad${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: ViewStyle;
}) {
  const c = useTheme();
  // primary: 흰 면 / secondary: 얇은 테두리 / ghost: 글자만 / danger: 붉은 글자 + 테두리
  const bg = { primary: c.primary, secondary: 'transparent', ghost: 'transparent', danger: 'transparent' }[kind];
  const fg = { primary: c.primaryText, secondary: c.text, ghost: c.textSecondary, danger: c.danger }[kind];
  const border = { primary: c.primary, secondary: c.border, ghost: 'transparent', danger: c.dangerSoft }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title || undefined}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.3 : pressed ? 0.7 : 1,
          minHeight: small ? 34 : 52,
          paddingHorizontal: small ? 12 : 20,
        },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} size="small" /> : icon ? <Ionicons name={icon} size={small ? 15 : 17} color={fg} /> : null}
      {title ? <Text style={{ color: fg, fontWeight: '600', fontSize: small ? 13 : 17 }}>{title}</Text> : null}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? c.primary : 'transparent', borderColor: selected ? c.primary : c.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      {icon ? <Ionicons name={icon} size={13} color={selected ? c.primaryText : c.textSecondary} /> : null}
      <Text style={{ color: selected ? c.primaryText : c.text, fontSize: 14, fontWeight: selected ? '600' : '400' }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>{children}</View>;
}

export function Field({ label, hint, suffix, style, ...props }: TextInputProps & { label: string; hint?: string; suffix?: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: 6, flex: 1, minWidth: 120 }}>
      <T kind="label">{label}</T>
      <View style={[styles.input, { borderColor: c.border, backgroundColor: c.background }]}>
        <TextInput
          placeholderTextColor={c.faint}
          selectionColor={c.text}
          {...props}
          style={[{ flex: 1, minWidth: 0, width: '100%', color: c.text, fontSize: 16, paddingVertical: 12 }, style]}
        />
        {suffix ? <T kind="secondary">{suffix}</T> : null}
      </View>
      {hint ? <T kind="small">{hint}</T> : null}
    </View>
  );
}

/** 입력을 마치면(포커스가 빠지거나 완료를 누르면) onCommit을 부르는 입력칸 */
export function CommitField({ initial, onCommit, ...props }: Omit<ComponentProps<typeof Field>, 'value' | 'onChangeText'> & { initial: string; onCommit: (text: string) => void }) {
  const [text, setText] = useState(initial);
  const commit = () => {
    if (text !== initial) onCommit(text);
  };
  return <Field {...props} value={text} onChangeText={setText} onBlur={commit} onSubmitEditing={commit} />;
}

export function Row({ children, gap = Spacing.md, style, wrap }: { children: ReactNode; gap?: number; style?: ViewStyle; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

/** 작은 숫자 타일 */
export function Stat({ label, value, unit, sub, tone }: { label: string; value: string; unit?: string; sub?: string; tone?: 'good' | 'warn' | 'info' }) {
  const c = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.row}>
        <T kind="label" style={{ flex: 1 }}>
          {label}
        </T>
        {tone === 'warn' ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.warn }} /> : null}
      </View>
      <Text style={{ marginTop: 10 }}>
        <Text style={[{ fontSize: 30, fontWeight: '700', color: c.text }, NUM]}>{value}</Text>
        {unit ? <Text style={{ fontSize: 14, fontWeight: '500', color: c.faint }}> {unit}</Text> : null}
      </Text>
      {sub ? <T kind="small" style={{ marginTop: 4 }}>{sub}</T> : null}
    </View>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md }}>{children}</View>;
}

/** 큰 숫자 + 목표 대비 흰색 게이지. 대시보드의 핵심 수치용 */
export function Metric({
  label,
  value,
  unit,
  goal,
  goalText,
  size = 'md',
  footnote,
}: {
  label: string;
  value: number | null;
  unit: string;
  goal: number;
  goalText?: string;
  size?: 'sm' | 'md' | 'lg';
  footnote?: string;
}) {
  const c = useTheme();
  const big = size === 'lg';
  const small = size === 'sm';
  const v = value ?? 0;
  const pct = goal > 0 ? Math.min(1, v / goal) : 0;
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, padding: big ? Spacing.xl : small ? 14 : 20, gap: small ? 10 : 16 }]}>
      <View style={styles.row}>
        <T kind="label" style={{ flex: 1 }}>
          {label}
        </T>
        <Text style={[{ color: c.textSecondary, fontSize: 13, fontWeight: '500' }, NUM]}>{value === null ? '' : `${Math.round(pct * 100)}%`}</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit>
        <Text style={[{ color: value === null ? c.faint : c.text, fontSize: big ? 64 : small ? 26 : 40, fontWeight: '700', letterSpacing: big ? -2 : -1 }, NUM]}>
          {value === null ? '--' : Math.round(v).toLocaleString('ko-KR')}
        </Text>
        <Text style={{ color: c.faint, fontSize: big ? 18 : small ? 12 : 15, fontWeight: '500' }}> {unit}</Text>
      </Text>
      <View style={{ gap: 8 }}>
        <Progress value={pct} />
        <T kind="small" style={NUM}>
          {footnote ?? goalText ?? (v >= goal ? `목표 ${goal.toLocaleString('ko-KR')}${unit} 달성` : `목표까지 ${Math.round(goal - v).toLocaleString('ko-KR')}${unit}`)}
        </T>
      </View>
    </View>
  );
}

export function Progress({ value, color }: { value: number; color?: string }) {
  const c = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height: 4, borderRadius: Radius.pill, backgroundColor: c.track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color ?? c.text, borderRadius: Radius.pill }} />
    </View>
  );
}

/** 안내 문구. 색 대신 아이콘 모양으로 성격을 구분한다 */
export function Notice({ tone = 'info', children, icon }: { tone?: 'good' | 'info' | 'warn'; children: ReactNode; icon?: IconName }) {
  const c = useTheme();
  const name: IconName = icon ?? (tone === 'good' ? 'checkmark-circle-outline' : tone === 'warn' ? 'alert-circle-outline' : 'information-circle-outline');
  return (
    <View style={[styles.notice, { borderColor: tone === 'warn' ? c.textSecondary : c.border }]}>
      <Ionicons name={name} size={17} color={tone === 'info' ? c.textSecondary : c.text} style={{ marginTop: 2 }} />
      <T style={{ flex: 1 }}>{children}</T>
    </View>
  );
}

export function Empty({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm }}>
      <Ionicons name={icon} size={36} color={c.faint} />
      <T kind="heading">{title}</T>
      {body ? <T kind="secondary" style={{ textAlign: 'center' }}>{body}</T> : null}
      {action}
    </View>
  );
}

/** 얇은 구분선으로 나뉜 목록 카드 */
export function ListCard({ children }: { children: ReactNode }) {
  const c = useTheme();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.listCard, { backgroundColor: c.card, borderColor: c.border }]}>
      {items.map((child, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border } : undefined}>
          {child}
        </View>
      ))}
    </View>
  );
}

/**
 * 목록 한 줄. marker로 순서 번호/완료 체크를 왼쪽 원 안에 표시하고,
 * value(오른쪽 숫자)와 caption(그 아래 상태)을 정렬해 보여 준다
 */
export function ListRow({
  title,
  subtitle,
  marker,
  state = 'idle',
  value,
  unit,
  caption,
  onPress,
  right,
}: {
  title: string;
  subtitle?: string;
  marker?: string | IconName;
  state?: 'done' | 'current' | 'idle';
  value?: string;
  unit?: string;
  caption?: string;
  onPress?: () => void;
  right?: ReactNode;
}) {
  const c = useTheme();
  const done = state === 'done';
  const isIcon = typeof marker === 'string' && marker.length > 2;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.listRow, { opacity: pressed ? 0.6 : 1 }]}>
      {marker !== undefined ? (
        <View
          style={[
            styles.marker,
            {
              borderColor: done || state === 'current' ? c.text : c.border,
              backgroundColor: done ? c.text : 'transparent',
            },
          ]}>
          {done ? (
            <Ionicons name="checkmark" size={14} color={c.primaryText} />
          ) : isIcon ? (
            <Ionicons name={marker as IconName} size={14} color={state === 'current' ? c.text : c.textSecondary} />
          ) : (
            <Text style={[{ fontSize: 12, fontWeight: '600', color: state === 'current' ? c.text : c.textSecondary }, NUM]}>{marker}</Text>
          )}
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '600', color: done ? c.faint : c.text }}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} style={{ fontSize: 13, color: done ? c.faint : c.textSecondary, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value !== undefined ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Text>
            <Text style={[{ fontSize: 17, fontWeight: '600', color: done ? c.faint : c.text }, NUM]}>{value}</Text>
            {unit ? <Text style={{ fontSize: 12, color: c.faint }}>{unit}</Text> : null}
          </Text>
          {caption ? <Text style={{ fontSize: 11, color: c.faint, marginTop: 2 }}>{caption}</Text> : null}
        </View>
      ) : null}
      {right ?? (onPress && value === undefined ? <Ionicons name="chevron-forward" size={16} color={c.faint} /> : null)}
    </Pressable>
  );
}

/** 요일 고르기: 월~일 7칸 동그라미(한 줄에 딱 맞게) */
export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const c = useTheme();
  const order = [1, 2, 3, 4, 5, 6, 0];
  const names = ['일', '월', '화', '수', '목', '금', '토'];
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {order.map((d) => {
        const on = value.includes(d);
        return (
          <Pressable
            key={d}
            onPress={() => onChange(on ? value.filter((x) => x !== d) : [...value, d])}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${names[d]}요일`}
            style={({ pressed }) => ({
              flex: 1,
              aspectRatio: 1,
              maxWidth: 48,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: on ? c.text : c.border,
              backgroundColor: on ? c.text : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}>
            <Text style={{ color: on ? c.primaryText : c.text, fontWeight: on ? '700' : '500', fontSize: 14 }}>{names[d]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 더보기 메뉴의 한 묶음: 회색 섹션 제목 + 구분선 목록 */
export function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <SectionLabel>{title}</SectionLabel>
      <ListCard>{children}</ListCard>
    </View>
  );
}

/** 더보기 메뉴 한 줄: 아이콘 · 이름 · 오른쪽 현재 값 · 화살표(또는 스위치 등) */
export function MenuRow({
  icon,
  title,
  value,
  onPress,
  right,
  danger,
}: {
  icon?: IconName;
  title: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${title} ${value}` : title}
      style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.6 : 1 }]}>
      {icon ? <Ionicons name={icon} size={19} color={danger ? c.danger : c.textSecondary} /> : null}
      <Text style={{ flex: 1, fontSize: 16, color: danger ? c.danger : c.text }} numberOfLines={1}>
        {title}
      </Text>
      {value ? (
        <Text style={{ fontSize: 14, color: c.textSecondary, maxWidth: '55%' }} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right ?? (onPress && !danger ? <Ionicons name="chevron-forward" size={16} color={c.faint} /> : null)}
    </Pressable>
  );
}

/** 이전 화면들에서 쓰던 단순 목록 줄 */
export function ListItem({ title, subtitle, icon, right, onPress }: { title: string; subtitle?: string; icon?: IconName; right?: ReactNode; onPress?: () => void }) {
  return <ListRow title={title} subtitle={subtitle} marker={icon} right={right} onPress={onPress} />;
}

export function Icon({ name, size = 18, color }: { name: IconName; size?: number; color?: string }) {
  const c = useTheme();
  return <Ionicons name={name} size={size} color={color ?? c.textSecondary} />;
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, lineHeight: 34 },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: 20 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, borderWidth: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 12, borderRadius: Radius.pill, borderWidth: 1 },
  input: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, gap: 6 },
  stat: { flexGrow: 1, flexBasis: 140, borderRadius: Radius.lg, borderWidth: 1, padding: 18 },
  notice: { flexDirection: 'row', gap: 10, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  listCard: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 14 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, minHeight: 54, paddingVertical: 12 },
  marker: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
