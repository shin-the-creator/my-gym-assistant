// AI 코치 엔진: 폰 안 Gemma 3 모델 받기·지우기, 엔진 고르기

import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, ChipRow, ListCard, ListRow, Notice, Progress, Row, Screen, SectionLabel, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { cancelDownload, deleteModel, deviceMemory, downloadModel, isInstalled, localAiSupported } from '@/lib/local-ai';
import { LOCAL_MODELS, type LocalModel, getLocalModel, recommendModel } from '@/lib/local-models';
import { useStore } from '@/store/useStore';

export default function AiModelScreen() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const recommended = recommendModel(deviceMemory);
  const selected = getLocalModel(settings.localModelId) ?? recommended;
  const engine = settings.coachEngine ?? 'local';

  const [installed, setInstalled] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const entries = await Promise.all(LOCAL_MODELS.map(async (m) => [m.id, await isInstalled(m)] as const));
    setInstalled(Object.fromEntries(entries));
  };
  useEffect(() => {
    // 화면이 열릴 때 기기에 받아 둔 모델을 확인한다
    let alive = true;
    Promise.all(LOCAL_MODELS.map(async (m) => [m.id, await isInstalled(m)] as const)).then((entries) => {
      if (alive) setInstalled(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, []);

  const start = async (model: LocalModel) => {
    setError(null);
    setProgress(0);
    setDownloading(model.id);
    try {
      await downloadModel(model, setProgress);
      updateSettings({ localModelId: model.id, coachEngine: 'local' });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(null);
      refresh();
    }
  };

  const ramGb = deviceMemory ? Math.round((deviceMemory / 1024 ** 3) * 10) / 10 : null;

  if (!localAiSupported) {
    return (
      <Screen narrow edges={['bottom']}>
        <Notice tone="warn">폰 안에서 도는 AI는 안드로이드 앱에서만 쓸 수 있어요.</Notice>
      </Screen>
    );
  }

  return (
    <Screen narrow edges={['bottom']}>
      <View style={{ gap: Spacing.sm }}>
        <SectionLabel>AI 코치 엔진</SectionLabel>
        <ChipRow>
          <Chip icon="phone-portrait-outline" label="폰 안 Gemma (무료·오프라인)" selected={engine === 'local'} onPress={() => updateSettings({ coachEngine: 'local' })} />
          <Chip icon="cloud-outline" label="Gemini (키 필요)" selected={engine === 'gemini'} onPress={() => updateSettings({ coachEngine: 'gemini' })} />
        </ChipRow>
        <T kind="small">
          {engine === 'local'
            ? '키·계정 없이 폰 안에서 답해요. 질문과 내 정보가 폰 밖으로 나가지 않아요. 처음 한 번 모델을 받아야 해요.'
            : 'Google Gemini 무료 API로 답해요. 설정에 Gemini 키가 있어야 하고, 만 18세 이상만 키를 받을 수 있어요.'}
        </T>
      </View>

      <View style={{ gap: Spacing.sm }}>
        <SectionLabel right={ramGb ? `이 폰 메모리 ${ramGb}GB` : undefined}>모델</SectionLabel>
        <ListCard>
          {LOCAL_MODELS.map((m) => {
            const isIn = installed[m.id];
            const isSel = selected.id === m.id;
            const busy = downloading === m.id;
            return (
              <View key={m.id} style={{ paddingHorizontal: 18, paddingVertical: 16, gap: 10 }}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontWeight: '600' }}>
                      {m.name}
                      {m.id === recommended.id ? <T kind="small">  · 이 폰에 추천</T> : null}
                    </T>
                    <T kind="small">{`${m.summary} · 약 ${m.sizeMB >= 1000 ? `${(m.sizeMB / 1024).toFixed(1)}GB` : `${m.sizeMB}MB`}`}</T>
                  </View>
                  {isIn && isSel ? <T kind="small">사용 중</T> : null}
                </Row>
                {busy ? (
                  <View style={{ gap: 6 }}>
                    <Progress value={progress} />
                    <Row>
                      <T kind="small" style={{ flex: 1 }}>{`내려받는 중 ${Math.round(progress * 100)}% · 와이파이를 유지하고 앱을 켜 두세요`}</T>
                      <Button small kind="ghost" title="취소" onPress={() => cancelDownload()} />
                    </Row>
                  </View>
                ) : isIn ? (
                  <Row gap={Spacing.sm}>
                    {!isSel ? <Button small title="이 모델 쓰기" onPress={() => updateSettings({ localModelId: m.id, coachEngine: 'local' })} /> : null}
                    <Button
                      small
                      kind="danger"
                      title="삭제"
                      icon="trash-outline"
                      onPress={() => confirm('모델 삭제', `${m.name}을(를) 지울까요? 다시 쓰려면 다시 받아야 해요.`, async () => { await deleteModel(m); refresh(); }, '삭제')}
                    />
                  </Row>
                ) : (
                  <Button small kind={m.id === recommended.id ? 'primary' : 'secondary'} icon="download-outline" title="내려받기" onPress={() => start(m)} disabled={!!downloading} style={{ alignSelf: 'flex-start' }} />
                )}
              </View>
            );
          })}
        </ListCard>
        {error ? <Notice tone="warn">{error}</Notice> : null}
      </View>

      <ListCard>
        <ListRow marker="wifi-outline" title="와이파이에서 받으세요" subtitle="모델 파일이 커서 데이터 요금이 많이 나올 수 있어요" />
        <ListRow marker="speedometer-outline" title="첫 답변은 조금 느려요" subtitle="모델을 메모리에 올리는 데 몇 초~수십 초 걸리고, 이후엔 더 빨라요" />
        <ListRow marker="alert-circle-outline" title="작은 모델이라 틀릴 수 있어요" subtitle="중요한 건 확인하고, 통증·질환은 병원에서 상담하세요" />
        <ListRow marker="document-text-outline" title="Gemma 이용 약관" subtitle="Gemma는 Google의 Gemma Terms of Use를 따르는 공개 모델이에요(ai.google.dev/gemma/terms)" />
      </ListCard>
    </Screen>
  );
}
