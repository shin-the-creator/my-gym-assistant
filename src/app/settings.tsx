// 설정: 무료 AI(Gemini) 키, 알림, 데이터 초기화

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Switch, View } from 'react-native';

import { Button, Card, Field, ListRow, Notice, Row, Screen, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BUILT_IN_KEY, clearApiKey, getSavedApiKey, setApiKey } from '@/lib/ai';
import { confirm, notify } from '@/lib/confirm';
import { ensurePermission } from '@/lib/notifications';
import { useStore } from '@/store/useStore';
import type { Settings } from '@/types/models';

export default function SettingsScreen() {
  const c = useTheme();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const school = useStore((s) => s.school);
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    getSavedApiKey().then((k) => setHasKey(!!k));
  }, []);

  const saveKey = async () => {
    if (key.trim().length < 20) {
      notify('API 키 확인', 'Google AI Studio에서 받은 키 전체를 붙여 넣어 주세요. 보통 AIza 로 시작해요.');
      return;
    }
    await setApiKey(key);
    setKey('');
    setHasKey(true);
    updateSettings({ apiKeyConfigured: true });
  };

  const toggle = async (field: keyof Omit<Settings, 'apiKeyConfigured'>, value: boolean) => {
    // 실제 알림 등록은 앱 루트의 ReminderSync가 설정 변화를 보고 처리한다
    if (value && !(await ensurePermission())) {
      notify('알림 권한', '알림 권한이 없어요. 휴대폰 설정에서 이 앱의 알림을 허용해 주세요.');
      return;
    }
    updateSettings({ [field]: value });
  };

  const reminderRow = (field: keyof Omit<Settings, 'apiKeyConfigured'>, title: string, desc: string) => (
    <Row style={{ paddingVertical: Spacing.sm }}>
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: '600' }}>{title}</T>
        <T kind="small">{desc}</T>
      </View>
      <Switch value={settings[field]} onValueChange={(v) => toggle(field, v)} disabled={Platform.OS === 'web'} trackColor={{ true: c.primary }} />
    </Row>
  );

  return (
    <Screen edges={['bottom']}>
      <Card title="AI 기능 (무료 · Google Gemini)" icon="sparkles">
        <View style={{ gap: Spacing.md }}>
          <T kind="secondary">
            기구 사진 인식과 AI 코치는 Google의 Gemini API 무료 등급을 사용해요. 구글 계정으로 aistudio.google.com/apikey 에 들어가 ‘API 키 만들기’를 누르면 카드 등록 없이 무료 키를 받을 수 있어요. 키는 이 기기의 보안 저장소에만 저장돼요.
          </T>
          <Notice tone="warn">무료 등급에서는 보낸 사진과 질문이 구글의 모델 개선에 쓰일 수 있어요(유럽·영국 제외). 얼굴이나 개인정보가 나온 사진은 보내지 마세요. 하루 사용량을 다 쓰면 다음 날 다시 쓸 수 있어요.</Notice>
          {hasKey ? (
            <Notice tone="good">직접 입력한 API 키를 쓰고 있어요.</Notice>
          ) : BUILT_IN_KEY ? (
            <Notice tone="good">앱에 미리 넣어 둔 API 키를 쓰고 있어요. 따로 입력하지 않아도 돼요.</Notice>
          ) : (
            <Notice tone="warn">API 키가 없어요. 없어도 기구를 직접 체크하면 모든 기본 기능을 쓸 수 있어요.</Notice>
          )}
          <Field label={hasKey || BUILT_IN_KEY ? '다른 키로 바꾸기' : 'API 키'} value={key} onChangeText={setKey} placeholder="AIza..." autoCapitalize="none" autoCorrect={false} secureTextEntry />
          <Row wrap>
            <Button title="저장" icon="key" onPress={saveKey} disabled={!key.trim()} />
            {hasKey ? (
              <Button
                title="키 삭제"
                kind="danger"
                onPress={async () => {
                  await clearApiKey();
                  setHasKey(false);
                  updateSettings({ apiKeyConfigured: false });
                }}
              />
            ) : null}
          </Row>
        </View>
      </Card>

      <Card title="알림" icon="notifications">
        {Platform.OS === 'web' ? <Notice tone="warn">알림은 아이폰·아이패드·안드로이드 앱에서만 동작해요.</Notice> : null}
        {reminderRow('waterReminders', '물 마시기 알림', '하루 목표량을 나눠 시간마다 알려 줘요')}
        {reminderRow('mealReminders', '식사·간식 알림', '식사와 운동 전후 간식 시간')}
        {reminderRow('sleepReminder', '취침 알림', '잠들 준비 1시간 전 + 취침 시각')}
        <T kind="small">알림 시각은 내 정보의 기상·운동 시간으로 계산되고, 정보를 바꾸면 자동으로 다시 맞춰져요.</T>
      </Card>

      <Card title="급식 · 의견" icon="school">
        <ListRow marker="school-outline" title="학교 급식 연결" subtitle={school ? school.name : '학교를 등록하면 급식 메뉴·영양이 식단과 달력에 나와요'} onPress={() => router.push('/school')} />
        <ListRow marker="mail-outline" title="의견 보내기" subtitle="불편한 점이나 원하는 기능을 알려 주세요" onPress={() => router.push('/feedback')} />
      </Card>

      <Card title="데이터" icon="server">
        <View style={{ gap: Spacing.md }}>
          <T kind="secondary">모든 기록은 이 기기에만 저장돼요.</T>
          <Button title="내 정보 수정" kind="secondary" icon="person" onPress={() => router.push('/profile')} />
          <Button
            title="모든 데이터 초기화"
            kind="danger"
            icon="trash"
            onPress={() =>
              confirm('초기화', '프로필, 장소, 운동 기록을 모두 지울까요? 되돌릴 수 없어요.', () => {
                resetAll();
                router.replace('/');
              }, '모두 지우기')
            }
          />
        </View>
      </Card>
    </Screen>
  );
}
