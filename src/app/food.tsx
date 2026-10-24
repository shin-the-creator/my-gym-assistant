// 음식 기록: 사진으로 AI 분석 / 음식 검색 / 직접 입력 → 끼니를 골라 저장

import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { macroLine } from '@/components/food';
import { DateField } from '@/components/pickers';
import { Button, Card, Chip, ChipRow, Field, Icon, ListCard, ListRow, Notice, Row, Screen, SectionLabel, T } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { FOODS } from '@/data/foods';
import { useTheme } from '@/hooks/use-theme';
import { analyzeFood } from '@/lib/ai';
import { isTeen } from '@/lib/body';
import { MEAL_TITLES, slotForTime, sumEntries } from '@/lib/diet';
import { pickPhoto } from '@/lib/photos';
import { dateKey } from '@/lib/time';
import { useStore } from '@/store/useStore';
import type { FoodEntry, MealSlotKey } from '@/types/models';

type Mode = 'photo' | 'search' | 'manual';
type Pending = Omit<FoodEntry, 'id' | 'createdAt' | 'date' | 'meal'> & { key: string; on: boolean; qty: number; amount?: string };

const QTY = [0.5, 1, 1.5, 2];
const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const r1 = (n: number) => Math.round(n * 10) / 10;

export default function FoodScreen() {
  const c = useTheme();
  const params = useLocalSearchParams<{ date?: string; mode?: Mode }>();
  const [date, setDate] = useState(params.date || dateKey());
  const addFood = useStore((s) => s.addFood);
  const profile = useStore((s) => s.profile);
  const teen = profile ? isTeen(profile) : false;

  const [mode, setMode] = useState<Mode>(params.mode ?? 'photo');
  const [meal, setMeal] = useState<MealSlotKey>(date === dateKey() ? slotForTime() : 'lunch');
  const [pending, setPending] = useState<Pending[]>([]);

  // 사진
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // 검색
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim();
    const list = q ? FOODS.filter((f) => f.name.includes(q) || f.tags.some((t) => t.includes(q))) : FOODS.filter((f) => f.role === 'dish');
    return list.slice(0, 20);
  }, [query]);

  // 직접 입력
  const [mName, setMName] = useState('');
  const [mKcal, setMKcal] = useState('');
  const [mP, setMP] = useState('');
  const [mC, setMC] = useState('');
  const [mF, setMF] = useState('');

  const chosen = pending.filter((p) => p.on);
  const scaled = chosen.map((p) => ({ ...p, kcal: Math.round(p.kcal * p.qty), protein: r1(p.protein * p.qty), carbs: r1(p.carbs * p.qty), fat: r1(p.fat * p.qty) }));
  const total = sumEntries(scaled);

  const add = (items: Omit<Pending, 'key' | 'on' | 'qty'>[]) =>
    setPending((prev) => [...prev, ...items.map((i) => ({ ...i, key: `${Date.now()}-${Math.random()}`, on: true, qty: 1 }))]);
  const update = (key: string, patch: Partial<Pending>) => setPending((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const takePhoto = async (source: 'camera' | 'library') => {
    setError(null);
    setNote(null);
    try {
      const picked = await pickPhoto(source, false);
      if (!picked) return;
      setPhoto(picked.uri);
      if (!picked.base64) return;
      setBusy(true);
      const result = await analyzeFood(picked.base64, picked.mimeType, teen);
      if (result.foods.length === 0) setError('사진에서 음식을 찾지 못했어요. 음식이 잘 보이게 다시 찍거나 검색으로 기록해 주세요.');
      setNote(result.note || null);
      add(result.foods.map((f) => ({ name: f.name, amount: f.amount, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, source: 'photo' as const })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const addManual = () => {
    if (!mName.trim() || !mKcal) return;
    add([{ name: mName.trim(), kcal: Math.round(num(mKcal)), protein: num(mP), carbs: num(mC), fat: num(mF), source: 'manual' }]);
    setMName('');
    setMKcal('');
    setMP('');
    setMC('');
    setMF('');
  };

  const save = () => {
    addFood(scaled.map(({ name, kcal, protein, carbs, fat, source, qty, amount }) => ({
      date,
      meal,
      name: qty !== 1 ? `${name} ×${qty}` : amount ? `${name} (${amount})` : name,
      kcal,
      protein,
      carbs,
      fat,
      source,
    })));
    router.back();
  };

  return (
    <Screen
      narrow
      edges={['bottom']}
      footer={
        <Row>
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '600' }}>{chosen.length ? `${chosen.length}개 · ${Math.round(total.kcal).toLocaleString('ko-KR')} kcal` : '추가한 음식이 없어요'}</T>
            <T kind="small">{chosen.length ? macroLine(total) : `${date} · ${MEAL_TITLES[meal]}`}</T>
          </View>
          <Button title={`${MEAL_TITLES[meal]}으로 기록`} onPress={save} disabled={chosen.length === 0} />
        </Row>
      }>
      <DateField label="먹은 날" value={date} onChange={setDate} max={dateKey()} />
      <View style={{ gap: Spacing.sm }}>
        <SectionLabel>끼니</SectionLabel>
        <ChipRow>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlotKey[]).map((s) => (
            <Chip key={s} label={MEAL_TITLES[s]} selected={meal === s} onPress={() => setMeal(s)} />
          ))}
        </ChipRow>
      </View>

      <ChipRow>
        <Chip icon="camera-outline" label="사진 분석" selected={mode === 'photo'} onPress={() => setMode('photo')} />
        <Chip icon="search-outline" label="음식 검색" selected={mode === 'search'} onPress={() => setMode('search')} />
        <Chip icon="create-outline" label="직접 입력" selected={mode === 'manual'} onPress={() => setMode('manual')} />
      </ChipRow>

      {mode === 'photo' ? (
        <Card title="사진으로 열량·영양 분석" icon="camera">
          <View style={{ gap: Spacing.md }}>
            <T kind="secondary">먹기 전 음식을 위에서 한 장에 담아 찍어 주세요. 급식판도 칸마다 나눠서 분석해요.</T>
            {photo ? <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md, maxWidth: 480 }} contentFit="cover" /> : null}
            <Row gap={Spacing.sm}>
              {Platform.OS !== 'web' ? <Button title="사진 찍기" icon="camera" onPress={() => takePhoto('camera')} disabled={busy} style={{ flex: 1 }} /> : null}
              <Button title="앨범에서" kind="secondary" icon="images" onPress={() => takePhoto('library')} disabled={busy} style={{ flex: 1 }} />
            </Row>
            {busy ? <Notice icon="sparkles-outline">AI가 음식을 살펴보는 중이에요…</Notice> : null}
            {note ? <T kind="small">{note}</T> : null}
            {error ? (
              <View style={{ gap: Spacing.sm }}>
                <Notice tone="warn">{error}</Notice>
                {error.includes('키') ? <Button small kind="secondary" title="설정으로 이동" onPress={() => router.push('/settings')} /> : null}
              </View>
            ) : null}
            <T kind="small">AI 분석은 무료 Gemini 키가 필요하고, 양 추정은 오차가 있어요. 아래에서 양을 고쳐 저장하세요.</T>
          </View>
        </Card>
      ) : null}

      {mode === 'search' ? (
        <View style={{ gap: Spacing.sm }}>
          <Field label="음식 검색" value={query} onChangeText={setQuery} placeholder="예: 닭가슴살, 김밥, 라면" autoCorrect={false} />
          <ListCard>
            {results.length === 0 ? <ListRow marker="search-outline" title="찾는 음식이 없어요" subtitle="직접 입력으로 기록해 주세요" /> : null}
            {results.map((f) => (
              <ListRow
                key={f.id}
                marker="add"
                title={f.name}
                subtitle={`${f.serving} · ${macroLine(f)}`}
                value={String(f.kcal)}
                unit="kcal"
                onPress={() => add([{ name: f.name, amount: f.serving, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, source: 'db' }])}
              />
            ))}
          </ListCard>
          {!query ? <T kind="small" style={{ paddingHorizontal: 4 }}>자주 먹는 음식을 먼저 보여 줘요. 이름으로 검색할 수 있어요.</T> : null}
        </View>
      ) : null}

      {mode === 'manual' ? (
        <Card title="직접 입력" icon="create">
          <View style={{ gap: Spacing.md }}>
            <Field label="음식 이름" value={mName} onChangeText={setMName} placeholder="예: 엄마표 김치찌개" />
            <Row wrap>
              <Field label="칼로리" suffix="kcal" value={mKcal} onChangeText={setMKcal} keyboardType="decimal-pad" />
              <Field label="단백질" suffix="g" value={mP} onChangeText={setMP} keyboardType="decimal-pad" />
            </Row>
            <Row wrap>
              <Field label="탄수화물" suffix="g" value={mC} onChangeText={setMC} keyboardType="decimal-pad" />
              <Field label="지방" suffix="g" value={mF} onChangeText={setMF} keyboardType="decimal-pad" />
            </Row>
            <Button title="목록에 추가" kind="secondary" icon="add" onPress={addManual} disabled={!mName.trim() || !mKcal} />
          </View>
        </Card>
      ) : null}

      {teen && chosen.length > 0 && meal !== 'snack' && total.kcal < 400 ? (
        <Notice icon="heart-outline">성장기에는 더 든든하게 먹어야 힘이 나요! 밥이나 단백질 반찬을 조금 더 곁들여 보세요.</Notice>
      ) : null}
      {pending.length > 0 ? (
        <View style={{ gap: Spacing.sm }}>
          <SectionLabel right="양을 고르세요">기록할 음식</SectionLabel>
          <ListCard>
            {pending.map((p) => (
              <View key={p.key} style={{ paddingHorizontal: 18, paddingVertical: 14, gap: 10 }}>
                <Pressable onPress={() => update(p.key, { on: !p.on })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityRole="checkbox" accessibilityState={{ checked: p.on }}>
                  <Icon name={p.on ? 'checkbox' : 'square-outline'} size={22} color={p.on ? c.text : c.faint} />
                  <View style={{ flex: 1 }}>
                    <T style={{ fontWeight: '600', color: p.on ? c.text : c.faint }}>
                      {p.name}
                      {p.amount ? <T kind="small"> {p.amount}</T> : null}
                    </T>
                    <T kind="small">{`${Math.round(p.kcal * p.qty)} kcal · ${macroLine({ protein: p.protein * p.qty, carbs: p.carbs * p.qty, fat: p.fat * p.qty })}`}</T>
                  </View>
                </Pressable>
                {p.on ? (
                  <ChipRow>
                    {QTY.map((q) => (
                      <Chip key={q} label={q === 1 ? '그대로' : `×${q}`} selected={p.qty === q} onPress={() => update(p.key, { qty: q })} />
                    ))}
                  </ChipRow>
                ) : null}
              </View>
            ))}
          </ListCard>
        </View>
      ) : null}
    </Screen>
  );
}
