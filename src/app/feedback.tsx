// 의견 보내기: 작성한 내용을 담아 메일 앱(Gmail 등)을 연다

import * as Application from 'expo-application';
import * as MailComposer from 'expo-mail-composer';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { Button, Card, Chip, ChipRow, Field, Notice, Screen, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { notify } from '@/lib/confirm';

const FEEDBACK_EMAIL = 'tl09011811891@gmail.com';

const KINDS = ['불편한 점·오류', '새 기능 제안', '칭찬', '기타'] as const;

export default function FeedbackScreen() {
  const [kind, setKind] = useState<(typeof KINDS)[number]>('불편한 점·오류');
  const [text, setText] = useState('');
  const [includeInfo, setIncludeInfo] = useState(true);
  const [sending, setSending] = useState(false);
  const [opened, setOpened] = useState(false);

  const info = `앱 버전 ${Application.nativeApplicationVersion ?? '-'} (${Application.nativeBuildVersion ?? '-'}) · ${Platform.OS} ${String(Platform.Version)}`;
  const subject = `[My Gym Trainer] ${kind}`;
  const body = `${text.trim()}\n\n${includeInfo ? `— ${info}` : ''}`.trim();

  const send = async () => {
    setSending(true);
    try {
      if (Platform.OS !== 'web' && (await MailComposer.isAvailableAsync())) {
        await MailComposer.composeAsync({ recipients: [FEEDBACK_EMAIL], subject, body });
        setOpened(true);
        return;
      }
      const url = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        setOpened(true);
      } else {
        notify('메일 앱이 없어요', `${FEEDBACK_EMAIL} 로 직접 보내 주세요.`);
      }
    } catch {
      notify('메일 앱을 열지 못했어요', `${FEEDBACK_EMAIL} 로 직접 보내 주세요.`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Card>
        <View style={{ gap: Spacing.md }}>
          <T kind="label">어떤 이야기인가요?</T>
          <ChipRow>
            {KINDS.map((k) => (
              <Chip key={k} label={k} selected={kind === k} onPress={() => setKind(k)} />
            ))}
          </ChipRow>
          <Field
            label="내용"
            value={text}
            onChangeText={setText}
            placeholder="어떤 화면에서 무엇을 했을 때 어떤 일이 있었는지 적어 주시면 고치기 쉬워요."
            multiline
            style={{ minHeight: 140, textAlignVertical: 'top', paddingTop: 12 }}
          />
          <ChipRow>
            <Chip icon={includeInfo ? 'checkbox' : 'square-outline'} label="앱 버전·기기 정보 함께 보내기" selected={includeInfo} onPress={() => setIncludeInfo(!includeInfo)} />
          </ChipRow>
          {includeInfo ? <T kind="small">{info}</T> : null}
          <Button title="메일로 보내기" icon="send" onPress={send} loading={sending} disabled={!text.trim()} />
          <T kind="small">받는 사람: {FEEDBACK_EMAIL}</T>
        </View>
      </Card>
      {opened ? (
        <Card>
          <View style={{ gap: Spacing.md }}>
            <Notice tone="good">메일 앱에서 보내기 버튼을 눌러야 전송돼요. 보내 주셔서 고마워요!</Notice>
            <Button title="돌아가기" kind="secondary" onPress={() => router.back()} />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
