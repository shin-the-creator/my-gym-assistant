import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111418',
    textSecondary: '#5B6470',
    background: '#F4F6F8',
    card: '#FFFFFF',
    border: '#E2E6EA',
    primary: '#1E6BFF',
    primaryText: '#FFFFFF',
    primarySoft: '#E6EEFF',
    good: '#12A150',
    goodSoft: '#E3F6EA',
    warn: '#D97706',
    warnSoft: '#FDF1DE',
    danger: '#DC2626',
    dangerSoft: '#FDE7E7',
    water: '#0EA5E9',
    waterSoft: '#E0F4FD',
  },
  dark: {
    text: '#F2F4F7',
    textSecondary: '#A3ACB8',
    background: '#0E1114',
    card: '#181C21',
    border: '#2A3038',
    primary: '#5B92FF',
    primaryText: '#0E1114',
    primarySoft: '#1B2A47',
    good: '#3DD68C',
    goodSoft: '#16301F',
    warn: '#F5A524',
    warnSoft: '#35280F',
    danger: '#F87171',
    dangerSoft: '#3A1A1A',
    water: '#38BDF8',
    waterSoft: '#10293A',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

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
