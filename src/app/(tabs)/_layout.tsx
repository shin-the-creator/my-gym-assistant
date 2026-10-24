import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';

import type { IconName } from '@/components/ui';
import { useLayout, useTheme } from '@/hooks/use-theme';

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: '오늘', icon: 'today-outline', iconActive: 'today' },
  { name: 'workout', title: '운동', icon: 'barbell-outline', iconActive: 'barbell' },
  { name: 'places', title: '장소', icon: 'location-outline', iconActive: 'location' },
  { name: 'diet', title: '식단', icon: 'restaurant-outline', iconActive: 'restaurant' },
  { name: 'calendar', title: '달력', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'body', title: '내 몸', icon: 'body-outline', iconActive: 'body' },
];

export default function TabLayout() {
  const c = useTheme();
  const { isTablet, landscape } = useLayout();
  // 아이패드: 왼쪽 사이드바(가로 모드에서는 라벨까지 보이는 넓은 사이드바)
  const sidebar = isTablet;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.faint,
        tabBarActiveBackgroundColor: sidebar ? c.primarySoft : 'transparent',
        tabBarStyle: { backgroundColor: c.background, borderColor: c.border, ...(sidebar ? { width: landscape ? 220 : 96, minWidth: landscape ? 220 : 96 } : {}) },
        tabBarPosition: sidebar ? 'left' : 'bottom',
        tabBarVariant: sidebar ? 'material' : 'uikit',
        tabBarLabelPosition: sidebar && landscape ? 'beside-icon' : 'below-icon',
        tabBarLabelStyle: { fontSize: sidebar ? 14 : 10, fontWeight: '600' },
        sceneStyle: { backgroundColor: c.background },
        // 탭을 바꿀 때 살짝 밀리며 페이드되는 전환
        animation: 'shift',
        // 탭을 미리 그려 두어 전환 중에 빈 화면이 보이지 않게 한다
        lazy: false,
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? t.iconActive : t.icon} color={String(color)} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
