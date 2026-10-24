// 사진 분석 AI 키(Google Gemini 무료). 알림·데이터 등 나머지 설정은 더보기 탭에 있다

import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Field, Notice, Row, Screen, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { BUILT_IN_KEY, clearApiKey, getSavedApiKey, setApiKey } from '@/lib/ai';
import { notify } from '@/lib/confirm';
import { useStore } from '@/store/useStore';

export default function ApiKeyScreen() {
  const updateSettings = useStore((s) => s.updateSettings);
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

  return (
    <Screen narrow edges={['bottom']}>
      <Card title="Google Gemini 무료 키" icon="key">
        <View style={{ gap: Spacing.md }}>
          <T kind="secondary">
            기구 사진 인식과 음식 사진 분석은 Google의 Gemini API 무료 등급을 사용해요(AI 코치는 키 없이 폰 안에서도 쓸 수 있어요). 구글 계정으로 aistudio.google.com/apikey 에 들어가 ‘API 키 만들기’를 누르면 카드 등록 없이 무료 키를 받을 수 있어요. 만 18세 이상만 받을 수 있고, 키는 이 기기의 보안 저장소에만 저장돼요.
          </T>
          <Notice tone="warn">무료 등급에서는 보낸 사진이 구글의 모델 개선에 쓰일 수 있어요(유럽·영국 제외). 얼굴이나 개인정보가 나온 사진은 보내지 마세요. 하루 사용량을 다 쓰면 다음 날 다시 쓸 수 있어요.</Notice>
          {hasKey ? (
            <Notice tone="good">직접 입력한 API 키를 쓰고 있어요.</Notice>
          ) : BUILT_IN_KEY ? (
            <Notice tone="good">앱에 미리 넣어 둔 API 키를 쓰고 있어요. 따로 입력하지 않아도 돼요.</Notice>
          ) : (
            <Notice tone="warn">키가 없어요. 없어도 기구 직접 체크, 음식 검색·직접 입력, 급식 연동, 폰 안 AI 코치는 모두 쓸 수 있어요.</Notice>
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
    </Screen>
  );
}
