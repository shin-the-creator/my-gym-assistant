// 학교 등록: 나이스에서 학교를 찾아 급식표를 연결한다

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Field, ListCard, ListRow, Notice, Row, Screen, SectionLabel, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { searchSchools } from '@/lib/neis';
import { useStore } from '@/store/useStore';
import type { School } from '@/types/models';

export default function SchoolScreen() {
  const current = useStore((s) => s.school);
  const setSchool = useStore((s) => s.setSchool);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<School[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (query.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      setResults(await searchSchools(query));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen narrow edges={['bottom']}>
      {current ? (
        <View>
          <SectionLabel>등록된 학교</SectionLabel>
          <ListCard>
            <ListRow marker="school" state="current" title={current.name} subtitle={current.address} />
            <View style={{ padding: 14 }}>
              <Button title="학교 연결 해제" kind="danger" onPress={() => setSchool(null)} />
            </View>
          </ListCard>
        </View>
      ) : null}

      <View style={{ gap: Spacing.md }}>
        <Row style={{ alignItems: 'flex-end' }}>
          <Field label="학교 이름" value={query} onChangeText={setQuery} placeholder="예: 범박고, 범박고등학교" onSubmitEditing={search} returnKeyType="search" autoCorrect={false} />
          <Button title="찾기" onPress={search} loading={busy} disabled={query.trim().length < 2} />
        </Row>
        {error ? <Notice tone="warn">{error}</Notice> : null}
        {results ? (
          <ListCard>
            {results.length === 0 ? <ListRow marker="search-outline" title="찾는 학교가 없어요" subtitle="정식 이름(예: ○○고등학교)으로 다시 찾아보세요" /> : null}
            {results.map((s) => (
              <ListRow
                key={`${s.officeCode}-${s.schoolCode}`}
                marker="school-outline"
                title={s.name}
                subtitle={s.address}
                onPress={() => {
                  setSchool(s);
                  router.back();
                }}
              />
            ))}
          </ListCard>
        ) : null}
        {results && results.length >= 5 ? <T kind="small">결과는 최대 5개까지 보여요. 이름을 더 자세히 입력해 보세요.</T> : null}
        <T kind="small">급식 메뉴·칼로리·영양 정보는 나이스 교육정보 개방 포털에서 불러와요. 학교에서 올린 식단이 없으면 표시되지 않아요.</T>
      </View>
    </Screen>
  );
}
