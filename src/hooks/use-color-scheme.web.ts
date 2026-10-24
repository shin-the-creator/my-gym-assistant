import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const noop = () => () => {};

/**
 * 웹 정적 렌더링을 위해 클라이언트에서 다시 계산한다(서버에서는 light)
 */
export function useColorScheme() {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const colorScheme = useRNColorScheme();
  return hydrated ? colorScheme : 'light';
}
