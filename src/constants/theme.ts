import { Platform } from 'react-native';

// 매트 다크 모노톤. 유색은 삭제 버튼의 위험 표시 하나만 남기고,
// 진행 상태는 흰색 바, 상태 구분은 밝기 차이로만 표현한다.
const mono = {
  text: '#FFFFFF',
  textSecondary: '#9EA4B0',
  faint: '#5E636D',
  background: '#121214',
  card: '#1A1A1E',
  border: '#2A2A31',
  track: '#2C2C33',
  primary: '#FFFFFF',
  primaryText: '#121214',
  primarySoft: '#232328',
  good: '#FFFFFF',
  goodSoft: '#232328',
  warn: '#C9CDD4',
  warnSoft: '#232328',
  danger: '#E5484D',
  dangerSoft: '#2A1D1F',
  water: '#FFFFFF',
  waterSoft: '#232328',
} as const;

// 앱은 항상 다크 테마로 그린다(시스템 설정과 무관)
export const Colors = { light: mono, dark: mono } as const;

export type Palette = { [K in keyof typeof mono]: string };

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** 이 너비 이상이면 아이패드(태블릿) 레이아웃 */
export const TabletBreakpoint = 768;
export const MaxContentWidth = 1100;

export const Fonts = Platform.select({
  ios: { rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { rounded: 'normal', mono: 'monospace' },
});
