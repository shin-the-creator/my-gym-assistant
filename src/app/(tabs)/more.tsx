// 더보기: 앱 설정과 관리 메뉴를 한곳에 — 내 정보, 운동, 식단, AI, 알림, 도움말, 정보, 데이터

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, Switch, View } from 'react-native';

import { Icon, MenuRow, MenuSection, Screen, T, Title } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useProgram } from '@/hooks/use-plan';
import { useTheme } from '@/hooks/use-theme';
import { getApiKey } from '@/lib/ai';
import { GOAL_LABELS, ageFrom } from '@/lib/body';
import { confirm, notify } from '@/lib/confirm';
import { deviceMemory, localAiSupported } from '@/lib/local-ai';
import { getLocalModel, recommendModel } from '@/lib/local-models';
import { ensurePermission } from '@/lib/notifications';
import { describeSlot, getSlots } from '@/lib/workout-slots';
import { useStore } from '@/store/useStore';

type ReminderKey = 'waterReminders' | 'mealReminders' | 'sleepReminder';

export default function MoreScreen() {
  const c = useTheme();
  const profile = useStore((s) => s.profile);
  const places = useStore((s) => s.places);
  const school = useStore((s) => s.school);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const { isCustom, program } = useProgram();
  const [hasKey, setHasKey] = useState(false);

  // 키 화면에서 돌아오면 다시 확인
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getApiKey().then((k) => alive && setHasKey(!!k));
      return () => {
        alive = false;
      };
    }, []),
  );

  const toggle = async (field: ReminderKey, value: boolean) => {
    if (value && !(await ensurePermission())) {
      notify('알림 권한', '알림 권한이 없어요. 휴대폰 설정에서 이 앱의 알림을 허용해 주세요.');
      return;
    }
    updateSettings({ [field]: value });
  };
  const reminder = (field: ReminderKey, icon: 'water-outline' | 'restaurant-outline' | 'moon-outline', title: string) => (
    <MenuRow
      icon={icon}
      title={title}
      right={<Switch value={settings[field]} onValueChange={(v) => toggle(field, v)} disabled={Platform.OS === 'web'} trackColor={{ true: c.text, false: c.track }} thumbColor={settings[field] ? c.background : c.textSecondary} />}
    />
  );

  const slots = profile ? getSlots(profile) : [];
  const engine = !localAiSupported ? 'gemini' : (settings.coachEngine ?? 'local');
  const model = getLocalModel(settings.localModelId) ?? recommendModel(deviceMemory);
  // 폰에서는 설치된 앱의 버전, 웹 미리보기에서는 설정 파일의 버전
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '-';

  return (
    <Screen narrow>
      <Title>더보기</Title>

      {/* 내 정보 요약 카드 */}
      <Pressable
        onPress={() => router.push('/profile')}
        accessibilityRole="button"
        accessibilityLabel="내 정보 수정"
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: 20, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="person" size={26} color={c.text} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T kind="heading">{profile ? `${profile.name || '회원'}님` : '내 정보를 입력해 주세요'}</T>
          <T kind="small">
            {profile
              ? `${ageFrom(profile.birthYear)}세 · ${profile.heightCm}cm · ${profile.weightKg}kg · ${GOAL_LABELS[profile.goal]}`
              : '몸 상태에 맞춘 루틴·식단·일정을 만들어 드려요'}
          </T>
        </View>
        <T kind="small">수정</T>
        <Icon name="chevron-forward" size={16} color={c.faint} />
      </Pressable>

      <MenuSection title="운동">
        <MenuRow icon="list-outline" title="내 루틴 정하기" value={isCustom ? `직접 만든 루틴 · ${program.length}일` : '자동 추천'} onPress={() => router.push('/program')} />
        <MenuRow icon="location-outline" title="운동 장소 관리" value={places.length ? `${places.length}곳` : '없음'} onPress={() => router.push('/places')} />
        <MenuRow
          icon="time-outline"
          title="운동 시간"
          value={slots.length > 1 ? `${slots.length}개 시간대` : slots[0] ? describeSlot(slots[0]) : undefined}
          onPress={() => router.push('/profile')}
        />
      </MenuSection>

      <MenuSection title="식단">
        <MenuRow icon="school-outline" title="학교 급식 연결" value={school ? school.name : '연결 안 됨'} onPress={() => router.push('/school')} />
        <MenuRow icon="ban-outline" title="못 먹는 음식" value={profile?.avoidFoods.length ? profile.avoidFoods.join(', ') : '없음'} onPress={() => router.push('/profile')} />
      </MenuSection>

      <MenuSection title="AI 코치">
        <MenuRow icon="chatbubbles-outline" title="AI 코치에게 묻기" onPress={() => router.push('/coach')} />
        {localAiSupported ? (
          <MenuRow icon="phone-portrait-outline" title="AI 엔진 · 모델" value={engine === 'local' ? model.name.split(' · ')[0] : 'Gemini'} onPress={() => router.push('/ai-model')} />
        ) : null}
        <MenuRow icon="key-outline" title="사진 분석 AI 키" value={hasKey ? '연결됨' : '없음'} onPress={() => router.push('/settings')} />
      </MenuSection>

      <MenuSection title="알림">
        {reminder('waterReminders', 'water-outline', '물 마시기 알림')}
        {reminder('mealReminders', 'restaurant-outline', '식사·간식 알림')}
        {reminder('sleepReminder', 'moon-outline', '취침 알림')}
      </MenuSection>
      {Platform.OS === 'web' ? <T kind="small" style={{ marginTop: -Spacing.md, paddingHorizontal: 4 }}>알림은 휴대폰 앱에서만 동작해요.</T> : null}

      <MenuSection title="도움말">
        <MenuRow icon="help-circle-outline" title="앱 사용 방법" onPress={() => router.push('/guide')} />
        <MenuRow icon="mail-outline" title="의견 보내기" onPress={() => router.push('/feedback')} />
      </MenuSection>

      <MenuSection title="정보">
        <MenuRow icon="information-circle-outline" title="버전 정보" value={version} />
        <MenuRow icon="lock-closed-outline" title="데이터 보관" value="이 기기에만 저장" />
      </MenuSection>

      <MenuSection title="데이터">
        <MenuRow
          icon="trash-outline"
          title="모든 데이터 초기화"
          danger
          onPress={() =>
            confirm('초기화', '내 정보, 장소, 운동·식단 기록을 모두 지울까요? 되돌릴 수 없어요.', () => {
              resetAll();
              router.replace('/');
            }, '모두 지우기')
          }
        />
      </MenuSection>
    </Screen>
  );
}
