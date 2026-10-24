// 내 정보 입력/수정

import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Card, Chip, ChipRow, Field, Grid, Row, Screen, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { ACTIVITY_LABELS, GOAL_LABELS } from '@/lib/body';
import { isValidTime } from '@/lib/time';
import { useStore } from '@/store/useStore';
import type { ActivityLevel, Experience, Goal, Profile, Sex } from '@/types/models';

const EXPERIENCE_LABELS: Record<Experience, string> = {
  beginner: '입문 (1년 미만)',
  intermediate: '중급 (1~3년)',
  advanced: '상급 (3년 이상)',
};

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

export default function ProfileScreen() {
  const existing = useStore((s) => s.profile);
  const saveProfile = useStore((s) => s.saveProfile);

  const [name, setName] = useState(existing?.name ?? '');
  const [sex, setSex] = useState<Sex>(existing?.sex ?? 'male');
  const [birthYear, setBirthYear] = useState(existing ? String(existing.birthYear) : '');
  const [height, setHeight] = useState(existing ? String(existing.heightCm) : '');
  const [weight, setWeight] = useState(existing ? String(existing.weightKg) : '');
  const [waist, setWaist] = useState(existing?.waistCm ? String(existing.waistCm) : '');
  const [neck, setNeck] = useState(existing?.neckCm ? String(existing.neckCm) : '');
  const [hip, setHip] = useState(existing?.hipCm ? String(existing.hipCm) : '');
  const [bodyFat, setBodyFat] = useState(existing?.bodyFatPct ? String(existing.bodyFatPct) : '');
  const [activity, setActivity] = useState<ActivityLevel>(existing?.activity ?? 'light');
  const [goal, setGoal] = useState<Goal>(existing?.goal ?? 'maintain');
  const [experience, setExperience] = useState<Experience>(existing?.experience ?? 'beginner');
  const [days, setDays] = useState(existing?.workoutDaysPerWeek ?? 3);
  const [wake, setWake] = useState(existing?.wakeTime ?? '07:00');
  const [workoutTime, setWorkoutTime] = useState(existing?.workoutTime ?? '19:00');
  const [avoid, setAvoid] = useState(existing?.avoidFoods.join(', ') ?? '');

  const save = () => {
    const by = num(birthYear);
    const h = num(height);
    const w = num(weight);
    const year = new Date().getFullYear();
    const errors: string[] = [];
    if (!by || by < year - 100 || by > year - 10) errors.push('출생연도를 확인해 주세요.');
    if (!h || h < 100 || h > 230) errors.push('키(cm)를 확인해 주세요.');
    if (!w || w < 25 || w > 300) errors.push('몸무게(kg)를 확인해 주세요.');
    if (!isValidTime(wake)) errors.push('기상 시간은 07:00 형식으로 입력해 주세요.');
    if (!isValidTime(workoutTime)) errors.push('운동 시간은 19:00 형식으로 입력해 주세요.');
    if (errors.length) {
      Alert.alert('입력 확인', errors.join('\n'));
      return;
    }
    const pad = (t: string) => t.trim().padStart(5, '0');
    const profile: Profile = {
      name: name.trim(),
      sex,
      birthYear: by!,
      heightCm: h!,
      weightKg: w!,
      waistCm: num(waist),
      neckCm: num(neck),
      hipCm: num(hip),
      bodyFatPct: num(bodyFat),
      activity,
      goal,
      experience,
      workoutDaysPerWeek: days,
      wakeTime: pad(wake),
      workoutTime: pad(workoutTime),
      avoidFoods: avoid.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean),
    };
    saveProfile(profile);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen edges={['bottom']}>
      <Grid>
        <Card title="기본 정보" icon="person">
          <View style={{ gap: Spacing.md }}>
            <Field label="이름(닉네임)" value={name} onChangeText={setName} placeholder="예: 민수" />
            <T kind="label">성별</T>
            <ChipRow>
              <Chip label="남성" selected={sex === 'male'} onPress={() => setSex('male')} />
              <Chip label="여성" selected={sex === 'female'} onPress={() => setSex('female')} />
            </ChipRow>
            <Row wrap>
              <Field label="출생연도" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" placeholder="1995" />
              <Field label="키" suffix="cm" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="175" />
              <Field label="몸무게" suffix="kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="70" />
            </Row>
          </View>
        </Card>

        <Card title="체성분 (선택)" icon="analytics">
          <View style={{ gap: Spacing.md }}>
            <T kind="secondary">줄자로 재면 체지방률을 추정해 드려요. 인바디 결과가 있으면 체지방률만 입력해도 돼요.</T>
            <Row wrap>
              <Field label="허리 둘레" suffix="cm" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" hint="배꼽 높이" />
              <Field label="목 둘레" suffix="cm" value={neck} onChangeText={setNeck} keyboardType="decimal-pad" hint="후두 아래" />
            </Row>
            <Row wrap>
              {sex === 'female' ? <Field label="엉덩이 둘레" suffix="cm" value={hip} onChangeText={setHip} keyboardType="decimal-pad" hint="가장 넓은 곳" /> : null}
              <Field label="체지방률(측정값)" suffix="%" value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" />
            </Row>
          </View>
        </Card>

        <Card title="목표" icon="flag">
          <View style={{ gap: Spacing.md }}>
            <ChipRow>
              {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                <Chip key={g} label={GOAL_LABELS[g]} selected={goal === g} onPress={() => setGoal(g)} />
              ))}
            </ChipRow>
            <T kind="label">운동 경력</T>
            <ChipRow>
              {(Object.keys(EXPERIENCE_LABELS) as Experience[]).map((e) => (
                <Chip key={e} label={EXPERIENCE_LABELS[e]} selected={experience === e} onPress={() => setExperience(e)} />
              ))}
            </ChipRow>
            <T kind="label">일주일에 운동할 수 있는 날</T>
            <ChipRow>
              {[2, 3, 4, 5, 6].map((d) => (
                <Chip key={d} label={`${d}일`} selected={days === d} onPress={() => setDays(d)} />
              ))}
            </ChipRow>
          </View>
        </Card>

        <Card title="생활 패턴" icon="time">
          <View style={{ gap: Spacing.md }}>
            <T kind="label">평소 활동량(운동 포함)</T>
            <ChipRow>
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                <Chip key={a} label={ACTIVITY_LABELS[a]} selected={activity === a} onPress={() => setActivity(a)} />
              ))}
            </ChipRow>
            <Row wrap>
              <Field label="기상 시간" value={wake} onChangeText={setWake} placeholder="07:00" hint="수면·물·식사 시간 계산 기준" />
              <Field label="주로 운동하는 시간" value={workoutTime} onChangeText={setWorkoutTime} placeholder="19:00" />
            </Row>
            <Field label="못 먹거나 피하는 음식" value={avoid} onChangeText={setAvoid} placeholder="예: 우유, 땅콩, 해산물" hint="쉼표로 구분" />
          </View>
        </Card>
      </Grid>
      <Button title="저장하기" icon="checkmark" onPress={save} />
    </Screen>
  );
}
