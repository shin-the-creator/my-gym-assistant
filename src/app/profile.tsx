// 내 정보 입력/수정

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { TimeField, YearField } from '@/components/pickers';
import { Button, Card, Chip, ChipRow, Field, Grid, Row, Screen, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ACTIVITY_LABELS, GOAL_LABELS } from '@/lib/body';
import { notify } from '@/lib/confirm';
import { DAY_NAMES, describeSlot, getSlots, scheduledDaysPerWeek } from '@/lib/workout-slots';
import { newId, useStore } from '@/store/useStore';
import type { ActivityLevel, Experience, Goal, Profile, Sex, WorkoutSlot } from '@/types/models';

const EXPERIENCE_LABELS: Record<Experience, string> = {
  beginner: '입문 (1년 미만)',
  intermediate: '중급 (1~3년)',
  advanced: '상급 (3년 이상)',
};

// 요일 칩은 월요일부터 보여 준다
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

export default function ProfileScreen() {
  const c = useTheme();
  const existing = useStore((s) => s.profile);
  const saveProfile = useStore((s) => s.saveProfile);

  const [name, setName] = useState(existing?.name ?? '');
  const [sex, setSex] = useState<Sex>(existing?.sex ?? 'male');
  const [birthYear, setBirthYear] = useState<number | null>(existing?.birthYear ?? null);
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
  const [slots, setSlots] = useState<WorkoutSlot[]>(() =>
    existing ? getSlots(existing).map((s) => ({ ...s, id: s.id === 'default' ? newId() : s.id })) : [{ id: newId(), days: [1, 3, 5], time: '19:00' }],
  );
  const fixedDays = scheduledDaysPerWeek(slots);
  const updateSlot = (id: string, patch: Partial<WorkoutSlot>) => setSlots((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const toggleDay = (slot: WorkoutSlot, day: number) =>
    updateSlot(slot.id, { days: slot.days.includes(day) ? slot.days.filter((d) => d !== day) : [...slot.days, day] });
  const [avoid, setAvoid] = useState(existing?.avoidFoods.join(', ') ?? '');

  const save = () => {
    const by = birthYear;
    const h = num(height);
    const w = num(weight);
    const year = new Date().getFullYear();
    const errors: string[] = [];
    if (!by || by < year - 100 || by > year - 10) errors.push('출생연도를 확인해 주세요.');
    if (!h || h < 100 || h > 230) errors.push('키(cm)를 확인해 주세요.');
    if (!w || w < 25 || w > 300) errors.push('몸무게(kg)를 확인해 주세요.');
    if (errors.length) {
      notify('입력 확인', errors.join('\n'));
      return;
    }
    const sortedSlots = [...slots].sort((a, b) => a.time.localeCompare(b.time)).map((s) => ({ ...s, label: s.label?.trim() || undefined }));
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
      // 운동 요일을 정했으면 그 수가 곧 주당 운동 횟수(분할 프로그램 기준)
      workoutDaysPerWeek: fixedDays ? Math.min(6, Math.max(2, fixedDays)) : days,
      wakeTime: wake,
      workoutTime: sortedSlots[0]?.time ?? '19:00',
      workoutSlots: sortedSlots,
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
              <YearField label="출생연도" value={birthYear} onChange={setBirthYear} from={new Date().getFullYear() - 90} to={new Date().getFullYear() - 10} />
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
            {fixedDays ? (
              <T kind="secondary">아래 운동 시간에서 고른 요일 기준으로 주 {Math.min(6, Math.max(2, fixedDays))}일 프로그램을 짜요.</T>
            ) : (
              <ChipRow>
                {[2, 3, 4, 5, 6].map((d) => (
                  <Chip key={d} label={`${d}일`} selected={days === d} onPress={() => setDays(d)} />
                ))}
              </ChipRow>
            )}
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
            <TimeField label="기상 시간" value={wake} onChange={setWake} hint="수면·물·식사 시간 계산 기준" />
            <Field label="못 먹거나 피하는 음식" value={avoid} onChangeText={setAvoid} placeholder="예: 우유, 땅콩, 해산물" hint="쉼표로 구분" />
          </View>
        </Card>
        <Card title="운동 시간" icon="barbell">
          <View style={{ gap: Spacing.lg }}>
            <T kind="secondary">요일마다 시간이 다르거나 하루에 두 번(아침 유산소 + 저녁 웨이트) 운동하면 여러 개 추가하세요. 요일을 고르지 않으면 운동하는 날에 이 시간으로 잡아요.</T>
            {slots.map((slot, i) => (
              <View key={slot.id} style={{ gap: Spacing.sm, paddingTop: i > 0 ? Spacing.lg : 0, borderTopWidth: i > 0 ? 1 : 0, borderColor: c.border }}>
                <Row>
                  <T style={{ fontWeight: '600', flex: 1 }}>{describeSlot(slot)}</T>
                  {slots.length > 1 ? <Button small kind="ghost" title="삭제" icon="trash-outline" onPress={() => setSlots((list) => list.filter((s) => s.id !== slot.id))} /> : null}
                </Row>
                <ChipRow>
                  {WEEK_ORDER.map((d) => (
                    <Chip key={d} label={DAY_NAMES[d]} selected={slot.days.includes(d)} onPress={() => toggleDay(slot, d)} />
                  ))}
                </ChipRow>
                <Row wrap>
                  <TimeField label="시간" value={slot.time} onChange={(time) => updateSlot(slot.id, { time })} />
                  <Field label="이름(선택)" value={slot.label ?? ''} onChangeText={(label) => updateSlot(slot.id, { label })} placeholder="예: 웨이트, 아침 유산소" />
                </Row>
              </View>
            ))}
            {slots.length < 6 ? (
              <Button title="운동 시간 추가" kind="secondary" icon="add" onPress={() => setSlots((list) => [...list, { id: newId(), days: [], time: '07:00' }])} />
            ) : null}
          </View>
        </Card>
      </Grid>
      <Button title="저장하기" icon="checkmark" onPress={save} />
    </Screen>
  );
}
