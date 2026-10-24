// 공통 UI 컴포넌트

import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentProps, type ReactNode, Children, useState } from 'react';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useLayout, useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({ children, scroll = true, edges = ['top'] }: { children: ReactNode; scroll?: boolean; edges?: ('top' | 'bottom')[] }) {
  const c = useTheme();
  const { isTablet } = useLayout();
  const pad = isTablet ? Spacing.xl : Spacing.lg;
  const inner = <View style={[styles.inner, { padding: pad, gap: Spacing.lg }]}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.background }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

export function Title({ children, subtitle, right }: { children: ReactNode; subtitle?: string; right?: ReactNode }) {
  const c = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: c.text }]}>{children}</Text>
        {subtitle ? <Text style={{ color: c.textSecondary, marginTop: 2 }}>{subtitle}</Text> : null}
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
    small: { fontSize: 12, color: c.textSecondary },
    heading: { fontSize: 17, fontWeight: '700', color: c.text },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    big: { fontSize: 26, fontWeight: '800', color: c.text },
  };
  return (
    <Text style={[map[kind], style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Card({ children, title, icon, right, style, tone }: { children?: ReactNode; title?: string; icon?: IconName; right?: ReactNode; style?: ViewStyle; tone?: 'primary' }) {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: tone === 'primary' ? c.primarySoft : c.card, borderColor: c.border }, style]}>
      {title ? (
        <View style={[styles.row, { marginBottom: Spacing.md }]}>
          {icon ? <Ionicons name={icon} size={18} color={c.primary} style={{ marginRight: 6 }} /> : null}
          <T kind="heading" style={{ flex: 1 }}>
            {title}
          </T>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** 아이패드에서는 여러 열, 폰에서는 한 열 */
export function Grid({ children, min }: { children: ReactNode; min?: number }) {
  const { columns } = useLayout();
  const cols = Math.min(columns, min ?? columns);
  const items = Children.toArray(children).filter(Boolean);
  if (cols === 1) return <View style={{ gap: Spacing.lg }}>{items}</View>;
  const rows: ReactNode[][] = [];
  items.forEach((child, i) => {
    if (i % cols === 0) rows.push([]);
    rows[rows.length - 1].push(child);
  });
  return (
    <View style={{ gap: Spacing.lg }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: Spacing.lg, alignItems: 'stretch' }}>
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
  const bg = { primary: c.primary, secondary: c.primarySoft, ghost: 'transparent', danger: c.dangerSoft }[kind];
  const fg = { primary: c.primaryText, secondary: c.primary, ghost: c.primary, danger: c.danger }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.75 : 1, paddingVertical: small ? 7 : 12, paddingHorizontal: small ? 12 : 16 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} size="small" /> : icon ? <Ionicons name={icon} size={small ? 15 : 18} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 15 }}>{title}</Text>
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
        { backgroundColor: selected ? c.primary : c.card, borderColor: selected ? c.primary : c.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      {icon ? <Ionicons name={icon} size={14} color={selected ? c.primaryText : c.textSecondary} /> : null}
      <Text style={{ color: selected ? c.primaryText : c.text, fontSize: 14, fontWeight: selected ? '700' : '500' }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>{children}</View>;
}

export function Field({ label, hint, suffix, ...props }: TextInputProps & { label: string; hint?: string; suffix?: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: 4, flex: 1, minWidth: 120 }}>
      <T kind="label">{label}</T>
      <View style={[styles.input, { borderColor: c.border, backgroundColor: c.card }]}>
        <TextInput placeholderTextColor={c.textSecondary} style={{ flex: 1, minWidth: 0, width: '100%', color: c.text, fontSize: 16, paddingVertical: 10 }} {...props} />
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

export function Stat({ label, value, unit, sub, tone }: { label: string; value: string; unit?: string; sub?: string; tone?: 'good' | 'warn' | 'info' }) {
  const c = useTheme();
  const color = tone === 'good' ? c.good : tone === 'warn' ? c.warn : c.text;
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]}>
      <T kind="label">{label}</T>
      <Text style={{ fontSize: 24, fontWeight: '800', color, marginTop: 4 }}>
        {value}
        {unit ? <Text style={{ fontSize: 14, fontWeight: '600', color: c.textSecondary }}> {unit}</Text> : null}
      </Text>
      {sub ? <T kind="small" style={{ marginTop: 2 }}>{sub}</T> : null}
    </View>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md }}>{children}</View>;
}

export function Progress({ value, color }: { value: number; color?: string }) {
  const c = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height: 10, borderRadius: Radius.pill, backgroundColor: c.border, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color ?? c.primary, borderRadius: Radius.pill }} />
    </View>
  );
}

export function Notice({ tone = 'info', children, icon }: { tone?: 'good' | 'info' | 'warn'; children: ReactNode; icon?: IconName }) {
  const c = useTheme();
  const bg = tone === 'good' ? c.goodSoft : tone === 'warn' ? c.warnSoft : c.primarySoft;
  const fg = tone === 'good' ? c.good : tone === 'warn' ? c.warn : c.primary;
  const name: IconName = icon ?? (tone === 'good' ? 'checkmark-circle' : tone === 'warn' ? 'alert-circle' : 'information-circle');
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Ionicons name={name} size={18} color={fg} style={{ marginTop: 1 }} />
      <T style={{ flex: 1 }}>{children}</T>
    </View>
  );
}

export function Empty({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm }}>
      <Ionicons name={icon} size={40} color={c.textSecondary} />
      <T kind="heading">{title}</T>
      {body ? <T kind="secondary" style={{ textAlign: 'center' }}>{body}</T> : null}
      {action}
    </View>
  );
}

export function ListItem({ title, subtitle, icon, right, onPress }: { title: string; subtitle?: string; icon?: IconName; right?: ReactNode; onPress?: () => void }) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.listItem, { borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}>
      {icon ? (
        <View style={[styles.iconBubble, { backgroundColor: c.primarySoft }]}>
          <Ionicons name={icon} size={18} color={c.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: '600' }}>{title}</T>
        {subtitle ? <T kind="small" style={{ marginTop: 2 }}>{subtitle}</T> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={c.textSecondary} /> : null)}
    </Pressable>
  );
}

export function Icon({ name, size = 18, color }: { name: IconName; size?: number; color?: string }) {
  const c = useTheme();
  return <Ionicons name={name} size={size} color={color ?? c.textSecondary} />;
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800' },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 12, borderRadius: Radius.pill, borderWidth: 1 },
  input: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, gap: 6 },
  stat: { flexGrow: 1, flexBasis: 140, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg },
  notice: { flexDirection: 'row', gap: 8, padding: Spacing.md, borderRadius: Radius.md },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBubble: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
