// 설정: Claude API 키, 알림, 데이터 초기화

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Switch, View } from 'react-native';

import { Button, Card, Field, Notice, Row, Screen, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clearApiKey, getApiKey, setApiKey } from '@/lib/ai';
import { confirm, notify } from '@/lib/confirm';
import { ensurePermission } from '@/lib/notifications';
import { useStore } from '@/store/useStore';
import type { Settings } from '@/types/models';

export default function SettingsScreen() {
  const c = useTheme();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k));
  }, []);

  const saveKey = async () => {
    if (!key.trim().startsWith('sk-')) {
      notify('API 키 확인', 'Claude API 키는 보통 sk-ant- 로 시작해요.');
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
      <Card title="AI 기능 (Claude)" icon="sparkles">
        <View style={{ gap: Spacing.md }}>
          <T kind="secondary">
            기구 사진 인식과 AI 코치는 Anthropic의 Claude를 사용해요. console.anthropic.com 에서 발급한 본인 API 키를 넣어 주세요. 키는 이 기기의 보안 저장소에만 저장되고, 사진과 질문은 분석할 때만 Anthropic으로 전송돼요.
          </T>
          {hasKey ? <Notice tone="good">API 키가 저장되어 있어요.</Notice> : <Notice tone="warn">API 키가 없어요. 없어도 기구를 직접 체크하면 모든 기본 기능을 쓸 수 있어요.</Notice>}
          <Field label={hasKey ? '새 키로 바꾸기' : 'API 키'} value={key} onChangeText={setKey} placeholder="sk-ant-..." autoCapitalize="none" autoCorrect={false} secureTextEntry />
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
