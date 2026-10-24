// 내 몸: 신체 분석, 체중 기록, 수면 분석

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Empty, Field, Grid, Notice, Row, Screen, Stat, StatRow, T, Title } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-plan';
import { useTheme } from '@/hooks/use-theme';
import { ACTIVITY_LABELS, ageFrom, bmi, bmiCategory, bmr, bodyInsights, healthyWeightRange, isTeen, navyBodyFat, tdee } from '@/lib/body';
import { bedtimeOptions, recommendedSleepHours } from '@/lib/schedule';
import { dateKey } from '@/lib/time';
import { formatTimeKo } from '@/lib/workout-slots';
import { useStore } from '@/store/useStore';

function WeightChart() {
  const c = useTheme();
  const weights = useStore((s) => s.weights);
  const recent = weights.slice(-14);
  if (recent.length < 2) return <T kind="secondary">체중을 두 번 이상 기록하면 그래프가 보여요.</T>;
  const values = recent.map((w) => w.weightKg);
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4 }}>
        {recent.map((w) => (
          <View key={w.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <T kind="small" style={{ fontSize: 10 }}>{w.weightKg}</T>
            <View style={{ width: 8, height: `${((w.weightKg - min) / (max - min)) * 80 + 10}%`, backgroundColor: w === recent[recent.length - 1] ? c.text : c.track, borderRadius: Radius.pill }} />
          </View>
        ))}
      </View>
      <Row>
        <T kind="small" style={{ flex: 1 }}>{recent[0].date.slice(5)}</T>
        <T kind="small">{recent[recent.length - 1].date.slice(5)}</T>
      </Row>
    </View>
  );
}

export default function BodyScreen() {
  const c = useTheme();
  const profile = useStore((s) => s.profile);
  const weights = useStore((s) => s.weights);
  const addWeight = useStore((s) => s.addWeight);
  const today = useToday();
  const [input, setInput] = useState('');

  if (!profile || !today) {
    return (
      <Screen>
        <Title>내 몸</Title>
        <Card>
          <Empty icon="body-outline" title="내 정보를 입력하면 몸 상태를 분석해 드려요" action={<Button title="입력하기" onPress={() => router.push('/profile')} />} />
        </Card>
      </Screen>
    );
  }

  const age = ageFrom(profile.birthYear);
  const teen = isTeen(profile);
  const b = bmi(profile.weightKg, profile.heightCm);
  const cat = bmiCategory(b);
  const fat = profile.bodyFatPct ?? navyBodyFat(profile);
  const [lo, hi] = healthyWeightRange(profile.heightCm);
  const insights = bodyInsights(profile, weights);
  const [sleepLo, sleepHi] = recommendedSleepHours(age);
  const todayWeight = weights.find((w) => w.date === dateKey());

  const saveWeight = () => {
    const v = parseFloat(input.replace(',', '.'));
    if (Number.isFinite(v) && v > 25 && v < 300) {
      addWeight(v);
      setInput('');
    }
  };

  return (
    <Screen>
      <Title subtitle={`${age}세 · ${profile.heightCm}cm · ${ACTIVITY_LABELS[profile.activity]}`} right={<Button small kind="secondary" icon="create-outline" title="수정" onPress={() => router.push('/profile')} />}>
        내 몸
      </Title>

      <StatRow>
        <Stat label="체중" value={String(profile.weightKg)} unit="kg" sub={teen ? '성장기 · 숫자보다 컨디션' : `건강 범위 ${lo}~${hi}kg`} />
        {teen ? (
          <Stat label="BMI" value={b.toFixed(1)} sub="청소년은 성장도표로 판단" />
        ) : (
          <Stat label="BMI" value={b.toFixed(1)} sub={cat.label} tone={cat.level === 'normal' ? 'good' : cat.level === 'low' ? 'info' : 'warn'} />
        )}
        <Stat label="체지방률" value={fat !== undefined ? fat.toFixed(1) : '—'} unit={fat !== undefined ? '%' : undefined} sub={profile.bodyFatPct ? '측정값' : teen ? '청소년은 참고만 하세요' : fat !== undefined ? '둘레로 추정' : '둘레를 입력하면 추정'} />
        <Stat label="기초대사량" value={Math.round(bmr(profile)).toLocaleString()} unit="kcal" sub="가만히 있어도 쓰는 에너지" />
        <Stat label="하루 소비" value={Math.round(tdee(profile)).toLocaleString()} unit="kcal" sub="활동량 포함" />
        <Stat label="물 목표" value={(today.waterTarget / 1000).toFixed(1)} unit="L" sub={today.workoutDay ? '운동일 기준' : '휴식일 기준'} />
      </StatRow>

      <Grid>
        <Card title="분석" icon="analytics">
          <View style={{ gap: Spacing.sm }}>
            {insights.map((i) => (
              <Notice key={i.text} tone={i.tone}>
                {i.text}
              </Notice>
            ))}
          </View>
        </Card>

        <Card title="체중 기록" icon="scale">
          <View style={{ gap: Spacing.md }}>
            <Row>
              <Field label={todayWeight ? `오늘 기록: ${todayWeight.weightKg}kg (덮어쓰기)` : '오늘 체중'} suffix="kg" value={input} onChangeText={setInput} keyboardType="decimal-pad" placeholder={String(profile.weightKg)} onSubmitEditing={saveWeight} />
              <Button title="기록" onPress={saveWeight} style={{ alignSelf: 'flex-end' }} />
            </Row>
            <T kind="small">아침에 화장실 다녀온 뒤 같은 조건에서 재면 정확해요.</T>
            <WeightChart />
          </View>
        </Card>

        <Card title="수면" icon="moon">
          <View style={{ gap: Spacing.sm }}>
            <T>
              {age}세 권장 수면: <T style={{ fontWeight: '700' }}>{sleepLo}~{sleepHi}시간</T>
            </T>
            <T kind="secondary">{formatTimeKo(profile.wakeTime)}에 일어나려면 이 시간에 잠자리에 드세요 (90분 수면 주기 + 잠드는 15분):</T>
            {bedtimeOptions(profile.wakeTime, age).map((o) => (
              <Row key={o.time}>
                <T kind="heading" style={{ width: 64 }}>{o.time}</T>
                <T style={{ flex: 1 }}>
                  {o.hours}시간 ({o.cycles}주기)
                </T>
                {o.recommended ? <T kind="small" style={{ color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>권장</T> : null}
              </Row>
            ))}
            <T kind="small">근육 회복과 식욕 조절에 수면이 가장 중요해요. 주말에도 기상 시간을 1시간 이상 바꾸지 마세요.</T>
          </View>
        </Card>
      </Grid>
    </Screen>
  );
}
