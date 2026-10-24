// 장소 목록: 아파트 헬스장, 다른 단지 헬스장, 학교 철봉 등

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Empty, Grid, Icon, Progress, Row, Screen, T } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { equipmentName } from '@/data/equipment';
import { PLACE_KINDS } from '@/data/places';
import { useProgram } from '@/hooks/use-plan';
import { useTheme } from '@/hooks/use-theme';
import { placeCoverage } from '@/lib/routine';
import { useStore } from '@/store/useStore';

export default function PlacesScreen() {
  const c = useTheme();
  const places = useStore((s) => s.places);
  const profile = useStore((s) => s.profile);
  const movePlace = useStore((s) => s.movePlace);
  const { program } = useProgram();
  // 순서 바꾸기 모드: 카드마다 위·아래 버튼이 나온다. 이 순서는 운동 탭의 장소 목록에도 그대로 쓰인다
  const [reorder, setReorder] = useState(false);

  return (
    <Screen edges={['bottom']}>
      <Row>
        <T kind="secondary" style={{ flex: 1 }}>장소마다 기구를 등록해 두면 그 곳에 맞춘 루틴을 짜 드려요</T>
        <Row gap={6}>
          {places.length > 1 ? <Button small kind={reorder ? 'primary' : 'secondary'} title={reorder ? '완료' : '순서'} icon={reorder ? 'checkmark' : 'swap-vertical'} onPress={() => setReorder(!reorder)} /> : null}
          {!reorder ? <Button small title="추가" icon="add" onPress={() => router.push('/place/new')} /> : null}
        </Row>
      </Row>

      {places.length === 0 ? (
        <Card>
          <Empty
            icon="location-outline"
            title="등록된 장소가 없어요"
            body="자주 가는 헬스장이나 철봉이 있는 곳을 추가하고, 기구 사진을 찍으면 AI가 기구를 알아봐요."
            action={<Button title="첫 장소 추가하기" icon="add" onPress={() => router.push('/place/new')} style={{ marginTop: Spacing.md }} />}
          />
        </Card>
      ) : (
        <Grid>
          {places.map((p, index) => {
            const coverage = profile ? placeCoverage(program, p, profile.experience) : 0;
            return (
              <Pressable key={p.id} disabled={reorder} onPress={() => router.push({ pathname: '/place/[id]', params: { id: p.id } })}>
                {({ pressed }) => (
                  <Card style={{ opacity: pressed ? 0.8 : 1, gap: Spacing.md }}>
                    <Row>
                      {p.photos[0] ? (
                        <Image source={{ uri: p.photos[0] }} style={{ width: 56, height: 56, borderRadius: Radius.md }} contentFit="cover" />
                      ) : (
                        <View style={{ width: 56, height: 56, borderRadius: Radius.md, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name={PLACE_KINDS[p.kind].icon} size={26} color={c.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <T kind="heading">{p.name}</T>
                        <T kind="small">
                          {PLACE_KINDS[p.kind].label} · 기구 {p.equipment.length}개
                        </T>
                      </View>
                      {reorder ? (
                        <Row gap={6}>
                          <Button small kind="secondary" title="" icon="arrow-up" onPress={() => movePlace(p.id, -1)} disabled={index === 0} />
                          <Button small kind="secondary" title="" icon="arrow-down" onPress={() => movePlace(p.id, 1)} disabled={index === places.length - 1} />
                        </Row>
                      ) : (
                        <Icon name="chevron-forward" />
                      )}
                    </Row>
                    <T kind="secondary" numberOfLines={2}>
                      {p.equipment.length ? p.equipment.map((e) => equipmentName(e.equipmentId)).join(', ') : '아직 기구가 없어요 — 지금은 맨몸 운동으로 짜요. 눌러서 기구를 추가하세요'}
                    </T>
                    {profile ? (
                      <View style={{ gap: 4 }}>
                        <T kind="small">{p.equipment.length ? '' : '맨몸 기준 '}내 루틴 소화율 {Math.round(coverage * 100)}%</T>
                        <Progress value={coverage} color={coverage > 0.8 ? c.good : coverage > 0.5 ? c.primary : c.warn} />
                      </View>
                    ) : null}
                  </Card>
                )}
              </Pressable>
            );
          })}
        </Grid>
      )}
    </Screen>
  );
}
