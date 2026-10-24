import { useWindowDimensions } from 'react-native';

import { Colors, type Palette, TabletBreakpoint } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme(): Palette {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

/** 화면 크기에 따른 레이아웃 정보 — 아이패드에서는 여러 열로 배치한다 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= TabletBreakpoint || width >= 900;
  const columns = width >= 1200 ? 3 : width >= 700 ? 2 : 1;
  return { width, height, isTablet, columns, landscape: width > height };
}
