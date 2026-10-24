// AI 코치: 내 정보·루틴·기록을 아는 트레이너에게 질문

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, ChipRow, Field, Notice, Screen, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useProgram } from '@/hooks/use-plan';
import { askCoach } from '@/lib/ai';
import { coachContext } from '@/lib/context';
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
}

export default function CoachScreen() {
  const profile = useStore((s) => s.profile);
  const places = useStore((s) => s.places);
  const workouts = useStore((s) => s.workouts);
  const weights = useStore((s) => s.weights);
  const { program } = useProgram();
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<QA[]>([]);
  const [busy, setBusy] = useState(false);

  if (!profile) {
    return (
      <Screen edges={['bottom']}>
        <Notice tone="warn">내 정보를 먼저 입력해야 맞춤 답변을 드릴 수 있어요.</Notice>
        <Button title="내 정보 입력" onPress={() => router.push('/profile')} />
      </Screen>
    );
  }

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setQuestion('');
    setBusy(true);
    setHistory((h) => [{ q: text }, ...h]);
    try {
      const a = await askCoach(text, coachContext(profile, program, places, workouts, weights));
      setHistory((h) => h.map((item, i) => (i === 0 ? { ...item, a } : item)));
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      setHistory((h) => h.map((item, i) => (i === 0 ? { ...item, error } : item)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Card>
        <View style={{ gap: Spacing.md }}>
          <Field label="질문" value={question} onChangeText={setQuestion} placeholder="무엇이든 물어보세요" multiline onSubmitEditing={() => ask(question)} />
          <Button title={busy ? '생각하는 중…' : '물어보기'} icon="send" loading={busy} onPress={() => ask(question)} disabled={!question.trim()} />
          <ChipRow>
            {SUGGESTIONS.map((s) => (
              <Chip key={s} label={s} onPress={() => ask(s)} />
            ))}
          </ChipRow>
          <T kind="small">AI 코치는 Claude를 사용해요. 설정에서 API 키를 입력해야 동작합니다. 의학적 진단을 대신하지 않아요.</T>
        </View>
      </Card>

      {history.map((item, i) => (
        <Card key={`${i}-${item.q}`} title={item.q} icon="chatbubble-ellipses">
          {item.a ? <T>{item.a}</T> : item.error ? <Notice tone="warn">{item.error}</Notice> : <T kind="secondary">답변을 준비하고 있어요…</T>}
          {item.error?.includes('API 키') ? <Button title="설정으로 이동" kind="secondary" onPress={() => router.push('/settings')} style={{ marginTop: Spacing.md }} /> : null}
        </Card>
      ))}
    </Screen>
  );
}
