// AI 코치: 내 정보·루틴·기록을 아는 트레이너에게 질문
// 기본은 폰 안의 Gemma 3(무료·오프라인), 설정에서 Gemini(키 필요)로 바꿀 수 있다.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, ChipRow, Field, Notice, Progress, Row, Screen, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useProgram } from '@/hooks/use-plan';
import { askCoach } from '@/lib/ai';
import { ageFrom } from '@/lib/body';
import { COACH_DOES, COACH_DOESNT, TEEN_COACH_DOES, TEEN_COACH_DOESNT, coachRoleInstruction } from '@/lib/coach-role';
import { coachContext } from '@/lib/context';
import { askLocalCoach, deviceMemory, isInstalled, localAiSupported, stopLocal } from '@/lib/local-ai';
import { getLocalModel, recommendModel } from '@/lib/local-models';
import { EATING_DISORDER_REPLY, hasEatingDisorderRisk } from '@/lib/safety';
import { useStore } from '@/store/useStore';

const SUGGESTIONS = [
  '오늘 어깨가 좀 뻐근한데 루틴을 어떻게 바꿀까요?',
  '철봉만 있는 곳에서 가슴 운동을 더 세게 하려면?',
  '체중이 2주째 그대로예요. 뭘 바꿔야 할까요?',
  '편의점에서 살 수 있는 단백질 간식 추천해 주세요.',
  '턱걸이를 한 개도 못 하는데 언제쯤 할 수 있을까요?',
];

interface QA {
  q: string;
  a?: string;
  error?: string;
  done?: boolean;
}

export default function CoachScreen() {
  const profile = useStore((s) => s.profile);
  const places = useStore((s) => s.places);
  const workouts = useStore((s) => s.workouts);
  const weights = useStore((s) => s.weights);
  const settings = useStore((s) => s.settings);
  const { program } = useProgram();
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<QA[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState<number | null>(null);
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [showRole, setShowRole] = useState(false);

  // 웹·키 사용 설정이 아니면 폰 안 Gemma가 기본
  const engine = !localAiSupported ? 'gemini' : (settings.coachEngine ?? 'local');
  const model = getLocalModel(settings.localModelId) ?? recommendModel(deviceMemory);

  // 모델 화면에서 받고 돌아오면 다시 확인한다
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (engine === 'local') isInstalled(model).then((ok) => alive && setModelReady(ok));
      return () => {
        alive = false;
      };
    }, [engine, model]),
  );

  const teen = profile ? ageFrom(profile.birthYear) < 19 : false;
  const does = teen ? TEEN_COACH_DOES : COACH_DOES;
  const doesnt = teen ? TEEN_COACH_DOESNT : COACH_DOESNT;

  if (!profile) {
    return (
      <Screen narrow edges={['bottom']}>
        <Notice tone="warn">내 정보를 먼저 입력해야 맞춤 답변을 드릴 수 있어요.</Notice>
        <Button title="내 정보 입력" onPress={() => router.push('/profile')} />
      </Screen>
    );
  }

  const setFirst = (patch: Partial<QA>) => setHistory((h) => h.map((item, i) => (i === 0 ? { ...item, ...patch } : item)));

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setQuestion('');
    setBusy(true);
    setHistory((h) => [{ q: text }, ...h]);
    // 섭식장애 위험 신호는 AI에게 넘기지 않고 바로 상담을 권한다
    if (hasEatingDisorderRisk(text)) {
      setFirst({ a: EATING_DISORDER_REPLY, done: true });
      setBusy(false);
      return;
    }
    const context = coachContext(profile, program, places, workouts, weights);
    const role = coachRoleInstruction(ageFrom(profile.birthYear));
    try {
      if (engine === 'local') {
        const a = await askLocalCoach(model, text, context, role, (soFar) => setFirst({ a: soFar }), (p) => setLoading(p < 1 ? p : null));
        setFirst({ a, done: true });
      } else {
        setFirst({ a: await askCoach(text, context, role), done: true });
      }
    } catch (e) {
      setFirst({ error: e instanceof Error ? e.message : String(e), done: true });
    } finally {
      setLoading(null);
      setBusy(false);
    }
  };

  const needsModel = engine === 'local' && modelReady === false;

  return (
    <Screen narrow edges={['bottom']}>
      {needsModel ? (
        <Card tone="primary">
          <View style={{ gap: Spacing.md }}>
            <T kind="heading">폰 안에서 도는 무료 AI 코치</T>
            <T kind="secondary">{`${model.name} 모델(약 ${model.sizeMB >= 1000 ? `${(model.sizeMB / 1024).toFixed(1)}GB` : `${model.sizeMB}MB`})을 한 번 받으면 키·계정·인터넷 없이 질문할 수 있어요.`}</T>
            <Button title="AI 모델 받으러 가기" icon="download-outline" onPress={() => router.push('/ai-model')} />
          </View>
        </Card>
      ) : null}

      <Card title="AI 코치가 도와주는 일" icon="chatbubbles" right={<Button small kind="ghost" title={showRole ? '접기' : '펼치기'} onPress={() => setShowRole(!showRole)} />}>
        {showRole ? (
          <View style={{ gap: 6 }}>
            {does.map((d) => (
              <T key={d} kind="secondary">{`✓ ${d}`}</T>
            ))}
            <View style={{ height: 6 }} />
            {doesnt.map((d) => (
              <T key={d} kind="secondary">{`✕ ${d}`}</T>
            ))}
          </View>
        ) : (
          <T kind="secondary">
            {teen
              ? '성장기 기준으로 코칭해요. 굶거나 보충제를 먹는 대신, 골고루 든든하게 먹고 즐겁게 운동하는 법을 알려 줘요.'
              : '운동·식단·수면·습관을 내 기록에 맞춰 코칭해요. 진단이나 처방은 하지 않아요.'}
          </T>
        )}
      </Card>

      <Card>
        <View style={{ gap: Spacing.md }}>
          <Field label="질문" value={question} onChangeText={setQuestion} placeholder="무엇이든 물어보세요" multiline onSubmitEditing={() => ask(question)} />
          <Row gap={Spacing.sm}>
            <Button title={busy ? '답하는 중…' : '물어보기'} icon="send" loading={busy} onPress={() => ask(question)} disabled={!question.trim() || needsModel} style={{ flex: 1 }} />
            {busy && engine === 'local' ? <Button title="멈추기" kind="secondary" onPress={() => stopLocal()} /> : null}
          </Row>
          {loading !== null ? (
            <View style={{ gap: 6 }}>
              <Progress value={loading} />
              <T kind="small">AI 모델을 준비하는 중이에요(처음 한 번만 오래 걸려요)</T>
            </View>
          ) : null}
          <ChipRow>
            {SUGGESTIONS.map((s) => (
              <Chip key={s} label={s} onPress={() => ask(s)} />
            ))}
          </ChipRow>
          <T kind="small">
            {engine === 'local'
              ? `${model.name} · 폰 안에서 답해요(무료·오프라인). 작은 모델이라 틀릴 수 있고, 의학적 진단을 대신하지 않아요.`
              : 'Google Gemini 무료 API로 답해요. 설정에 키가 있어야 하고 하루 사용량에 한도가 있어요. 의학적 진단을 대신하지 않아요.'}
          </T>
          {localAiSupported ? <Button small kind="ghost" title="AI 엔진·모델 바꾸기" icon="options-outline" onPress={() => router.push('/ai-model')} style={{ alignSelf: 'flex-start' }} /> : null}
        </View>
      </Card>

      {history.map((item, i) => (
        <Card key={`${history.length - i}-${item.q}`} title={item.q} icon="chatbubble-ellipses">
          {item.a ? <T>{item.a + (item.done ? '' : ' ▍')}</T> : item.error ? null : <T kind="secondary">답변을 준비하고 있어요…</T>}
          {item.error ? <Notice tone="warn">{item.error}</Notice> : null}
          {item.error?.includes('API 키') || item.error?.includes('키를') ? <Button title="설정으로 이동" kind="secondary" onPress={() => router.push('/settings')} style={{ marginTop: Spacing.md }} /> : null}
        </Card>
      ))}
    </Screen>
  );
}
