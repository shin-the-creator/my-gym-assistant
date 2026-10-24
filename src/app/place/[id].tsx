// 장소 상세: 기구 사진 → AI 인식, 기구 체크, 기구별 세팅(최대 무게·증가 단위)

import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';

import { Button, Card, Chip, ChipRow, CommitField, Empty, Grid, Icon, Notice, Row, Screen, T } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { EQUIPMENT, EQUIPMENT_CATEGORIES, type EquipmentCategory, equipmentName, getEquipment } from '@/data/equipment';
import { PATTERN_NAMES, type Pattern } from '@/data/exercises';
import { PLACE_KINDS } from '@/data/places';
import { useTheme } from '@/hooks/use-theme';
import { type Recognition, getApiKey, recognizeEquipment } from '@/lib/ai';
import { confirm } from '@/lib/confirm';
import { deletePhoto, pickPhoto } from '@/lib/photos';
import { candidatesFor } from '@/lib/routine';
import { useStore } from '@/store/useStore';
import type { PlaceKind } from '@/types/models';

const CONFIDENCE_LABEL = { high: '확실', medium: '아마도', low: '불확실' } as const;

export default function PlaceDetailScreen() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const place = useStore((s) => s.places.find((p) => p.id === id));
  const profile = useStore((s) => s.profile);
  const updatePlace = useStore((s) => s.updatePlace);
  const removePlace = useStore((s) => s.removePlace);
  const upsert = useStore((s) => s.upsertPlaceEquipment);
  const removeEq = useStore((s) => s.removePlaceEquipment);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Recognition | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  if (!place) {
    return (
      <Screen edges={['bottom']}>
        <Empty icon="alert-circle-outline" title="장소를 찾을 수 없어요" action={<Button title="돌아가기" onPress={() => router.back()} />} />
      </Screen>
    );
  }

  const owned = new Set(place.equipment.map((e) => e.equipmentId));

  const addPhoto = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      const photo = await pickPhoto(source);
      if (!photo) return;
      updatePlace(place.id, { photos: [...place.photos, photo.uri] });
      if (!photo.base64) return;
      if (!(await getApiKey())) {
        setError('사진은 저장했어요. AI 기구 인식을 쓰려면 설정에서 Claude API 키를 입력해 주세요. 아래에서 직접 체크할 수도 있어요.');
        return;
      }
      setBusy(true);
      const r = await recognizeEquipment(photo.base64, photo.mimeType);
      setResult(r);
      setPicked(new Set(r.items.filter((i) => i.confidence !== 'low' && !owned.has(i.equipmentId)).map((i) => i.equipmentId)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const applyRecognition = () => {
    if (!result) return;
    for (const item of result.items) {
      if (!picked.has(item.equipmentId)) continue;
      upsert(place.id, {
        equipmentId: item.equipmentId,
        ...(item.maxWeightKg ? { maxWeightKg: item.maxWeightKg } : {}),
        note: item.note,
      });
    }
    setResult(null);
  };

  const toggle = (equipmentId: string) => (owned.has(equipmentId) ? removeEq(place.id, equipmentId) : upsert(place.id, { equipmentId }));

  const weighted = place.equipment.filter((e) => getEquipment(e.equipmentId)?.weighted);
  const patterns = Object.keys(PATTERN_NAMES) as Pattern[];

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: place.name }} />

      <Card title="기구 사진" icon="camera">
        <View style={{ gap: Spacing.md }}>
          <T kind="secondary">기구가 잘 보이게 넓게 찍어 주세요. 여러 장 찍으면 더 정확해요. 덤벨 랙이나 웨이트 스택 숫자가 보이면 최대 무게도 읽어요.</T>
          {place.photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
              {place.photos.map((uri) => (
                <Pressable
                  key={uri}
                  onLongPress={() =>
                    confirm('사진 삭제', '이 사진을 지울까요?', () => {
                      deletePhoto(uri);
                      updatePlace(place.id, { photos: place.photos.filter((p) => p !== uri) });
                    })
                  }>
                  <Image source={{ uri }} style={{ width: 110, height: 110, borderRadius: Radius.md }} contentFit="cover" />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <Row wrap>
            {Platform.OS !== 'web' ? <Button title="사진 찍기" icon="camera" onPress={() => addPhoto('camera')} disabled={busy} /> : null}
            <Button title="앨범에서 선택" kind="secondary" icon="images" onPress={() => addPhoto('library')} disabled={busy} />
          </Row>
          {busy ? <Notice icon="sparkles">AI가 사진 속 기구를 살펴보는 중이에요…</Notice> : null}
          {error ? <Notice tone="warn">{error}</Notice> : null}
          {place.photos.length > 0 ? <T kind="small">사진을 길게 누르면 삭제할 수 있어요.</T> : null}
        </View>
      </Card>

      {result ? (
        <Card title="AI 인식 결과" icon="sparkles" tone="primary">
          <View style={{ gap: Spacing.md }}>
            <T>{result.summary}</T>
            {result.items.length === 0 ? <T kind="secondary">카탈로그에 있는 기구를 찾지 못했어요.</T> : null}
            {result.items.map((item) => {
              const on = picked.has(item.equipmentId);
              return (
                <Pressable
                  key={item.equipmentId}
                  onPress={() => {
                    const next = new Set(picked);
                    if (on) next.delete(item.equipmentId);
                    else next.add(item.equipmentId);
                    setPicked(next);
                  }}>
                  <Row style={{ alignItems: 'flex-start' }}>
                    <Icon name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? c.primary : c.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <T style={{ fontWeight: '700' }}>
                        {equipmentName(item.equipmentId)} <T kind="small">({CONFIDENCE_LABEL[item.confidence]}{owned.has(item.equipmentId) ? ' · 이미 등록됨' : ''})</T>
                      </T>
                      <T kind="small">
                        {item.note}
                        {item.maxWeightKg ? ` · 최대 ${item.maxWeightKg}kg` : ''}
                      </T>
                    </View>
                  </Row>
                </Pressable>
              );
            })}
            {result.unknown.length > 0 ? <T kind="small">목록에 없는 기구: {result.unknown.join(', ')}</T> : null}
            <Row wrap>
              <Button title={`선택한 ${picked.size}개 반영`} icon="checkmark" onPress={applyRecognition} disabled={picked.size === 0} />
              <Button title="닫기" kind="ghost" onPress={() => setResult(null)} />
            </Row>
          </View>
        </Card>
      ) : null}

      <Grid>
        <Card title={`보유 기구 (${place.equipment.length})`} icon="barbell">
          <View style={{ gap: Spacing.lg }}>
            <T kind="small">눌러서 있는 기구를 켜고 끄세요.</T>
            {(Object.keys(EQUIPMENT_CATEGORIES) as EquipmentCategory[]).map((cat) => (
              <View key={cat} style={{ gap: Spacing.sm }}>
                <T kind="label">{EQUIPMENT_CATEGORIES[cat]}</T>
                <ChipRow>
                  {EQUIPMENT.filter((e) => e.category === cat).map((e) => (
                    <Chip key={e.id} label={e.name} selected={owned.has(e.id)} onPress={() => toggle(e.id)} />
                  ))}
                </ChipRow>
              </View>
            ))}
          </View>
        </Card>

        <View style={{ gap: Spacing.lg }}>
          <Card title="이 장소의 기구 세팅" icon="options">
            {weighted.length === 0 ? (
              <T kind="secondary">무게를 조절하는 기구가 없어요. 맨몸 운동은 반복 수와 템포로 강도를 맞춰 드려요.</T>
            ) : (
              <View style={{ gap: Spacing.lg }}>
                <T kind="small">최대 무게를 넣어 두면, 루틴이 그 이상을 요구할 때 반복 수·템포로 대신 강도를 맞춰 줘요.</T>
                {weighted.map((e) => (
                  <View key={e.equipmentId} style={{ gap: Spacing.sm }}>
                    <T style={{ fontWeight: '700' }}>{equipmentName(e.equipmentId)}</T>
                    <Row wrap>
                      <CommitField
                        label="최대 무게"
                        suffix="kg"
                        keyboardType="decimal-pad"
                        initial={e.maxWeightKg ? String(e.maxWeightKg) : ''}
                        placeholder={e.equipmentId === 'dumbbell' ? '예: 20' : '예: 80'}
                        onCommit={(text) => {
                          const v = parseFloat(text);
                          upsert(place.id, { equipmentId: e.equipmentId, maxWeightKg: Number.isFinite(v) && v > 0 ? v : undefined });
                        }}
                      />
                      <CommitField
                        label="증가 단위"
                        suffix="kg"
                        keyboardType="decimal-pad"
                        initial={e.incrementKg ? String(e.incrementKg) : ''}
                        placeholder={e.equipmentId === 'dumbbell' ? '예: 2' : '예: 5'}
                        onCommit={(text) => {
                          const v = parseFloat(text);
                          upsert(place.id, { equipmentId: e.equipmentId, incrementKg: Number.isFinite(v) && v > 0 ? v : undefined });
                        }}
                      />
                    </Row>
                    {e.note ? <T kind="small">메모: {e.note}</T> : null}
                  </View>
                ))}
              </View>
            )}
          </Card>

          {profile ? (
            <Card title="여기서 할 수 있는 운동" icon="list">
              {patterns.map((p) => {
                const list = candidatesFor(p, place, profile.experience);
                return (
                  <Row key={p} style={{ paddingVertical: 6, alignItems: 'flex-start' }}>
                    <Icon name={list.length ? 'checkmark-circle' : 'close-circle'} color={list.length ? c.good : c.danger} />
                    <View style={{ flex: 1 }}>
                      <T style={{ fontWeight: '600' }}>{PATTERN_NAMES[p]}</T>
                      <T kind="small">{list.length ? list.slice(0, 3).map((e) => e.name).join(' · ') : '해당 기구 없음'}</T>
                    </View>
                  </Row>
                );
              })}
            </Card>
          ) : null}

          <Card title="장소 정보" icon="create">
            <View style={{ gap: Spacing.md }}>
              <CommitField label="이름" initial={place.name} onCommit={(text) => text.trim() && updatePlace(place.id, { name: text.trim() })} />
              <ChipRow>
                {(Object.keys(PLACE_KINDS) as PlaceKind[]).map((k) => (
                  <Chip key={k} label={PLACE_KINDS[k].label} selected={place.kind === k} onPress={() => updatePlace(place.id, { kind: k })} />
                ))}
              </ChipRow>
              <Button
                title="장소 삭제"
                kind="danger"
                icon="trash"
                onPress={() =>
                  confirm('장소 삭제', `"${place.name}"을(를) 삭제할까요? 운동 기록은 남아요.`, () => {
                    place.photos.forEach(deletePhoto);
                    removePlace(place.id);
                    router.back();
                  })
                }
              />
            </View>
          </Card>
        </View>
      </Grid>
    </Screen>
  );
}
