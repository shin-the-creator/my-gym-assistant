// 장소 추가

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, ChipRow, Field, Notice, Screen, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { PLACE_PRESETS, equipmentName } from '@/data/equipment';
import { PLACE_KINDS } from '@/data/places';
import { useStore } from '@/store/useStore';
import type { PlaceKind } from '@/types/models';

export default function NewPlaceScreen() {
  const addPlace = useStore((s) => s.addPlace);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PlaceKind>('apartment_gym');
  const [usePreset, setUsePreset] = useState(true);

  const preset = PLACE_PRESETS[kind] ?? [];

  const create = () => {
    const id = addPlace({
      name: name.trim() || PLACE_KINDS[kind].label,
      kind,
      equipment: usePreset ? preset.map((equipmentId) => ({ equipmentId })) : [],
      photos: [],
    });
    router.replace({ pathname: '/place/[id]', params: { id } });
  };

  return (
    <Screen edges={['bottom']}>
      <Card>
        <View style={{ gap: Spacing.md }}>
          <Field label="장소 이름" value={name} onChangeText={setName} placeholder="예: 101동 커뮤니티 헬스장, OO초 철봉" autoFocus />
          <T kind="label">종류</T>
          <ChipRow>
            {(Object.keys(PLACE_KINDS) as PlaceKind[]).map((k) => (
              <Chip key={k} label={PLACE_KINDS[k].label} icon={PLACE_KINDS[k].icon} selected={kind === k} onPress={() => setKind(k)} />
            ))}
          </ChipRow>
          {preset.length > 0 ? (
            <>
              <T kind="label">자주 있는 기구 미리 넣기</T>
              <ChipRow>
                <Chip label="넣기" selected={usePreset} onPress={() => setUsePreset(true)} />
                <Chip label="빈 상태로 시작" selected={!usePreset} onPress={() => setUsePreset(false)} />
              </ChipRow>
              {usePreset ? <T kind="small">{preset.map(equipmentName).join(', ')}</T> : null}
            </>
          ) : null}
          <Notice>다음 화면에서 기구 사진을 찍으면 AI가 기구를 인식해 목록을 정리해 줘요. 직접 체크해도 돼요.</Notice>
        </View>
      </Card>
      <Button title="만들고 기구 등록하기" icon="arrow-forward" onPress={create} />
    </Screen>
  );
}
