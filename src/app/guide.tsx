// 앱 사용 방법: 처음 쓰는 사람을 위한 5단계 안내

import { router } from 'expo-router';

import { ListCard, ListRow, Screen, SectionLabel, T } from '@/components/ui';

const STEPS = [
  { title: '내 정보 입력', body: '키·몸무게·목표·기상 시간·운동 시간을 넣으면 루틴·식단·일정이 만들어져요.', to: '/profile' },
  { title: '운동 장소 등록', body: '헬스장·철봉 등 장소마다 있는 기구를 체크해요. 장소가 바뀌어도 루틴이 이어져요.', to: '/places' },
  { title: '루틴 정하기', body: '자동 추천을 쓰거나 미는 날·당기는 날처럼 직접 분할을 만들 수 있어요.', to: '/program' },
  { title: '오늘 탭에서 운동 시작', body: '아래 "운동 시작"을 누르면 그날 장소 기구에 맞춘 운동이 나오고, 세트마다 기록해요.', to: '/' },
  { title: '식단·급식 기록', body: '학교를 연결하면 급식이 자동으로 나와요. 먹은 음식은 검색·직접 입력으로 기록해요.', to: '/diet' },
] as const;

export default function GuideScreen() {
  return (
    <Screen narrow edges={['bottom']}>
      <SectionLabel>처음이라면 이 순서대로</SectionLabel>
      <ListCard>
        {STEPS.map((s, i) => (
          <ListRow key={s.title} marker={String(i + 1)} title={s.title} subtitle={s.body} onPress={() => router.push(s.to)} />
        ))}
      </ListCard>
      <SectionLabel>알아두면 좋은 것</SectionLabel>
      <ListCard>
        <ListRow marker="refresh-outline" title="탭을 한 번 더 누르면 맨 위로" subtitle="긴 화면에서 빠르게 처음으로 돌아가요" />
        <ListRow marker="calendar-outline" title="달력은 스케줄러" subtitle="학원·시험 같은 일정을 넣고 알림을 받아요. 운동 예정일도 보이고, 하루 미루거나 건너뛸 수 있어요" />
        <ListRow marker="chatbubbles-outline" title="AI 코치" subtitle="모델을 한 번 받으면 키 없이 폰 안에서 질문할 수 있어요" />
      </ListCard>
      <T kind="small">모든 기록은 이 기기에만 저장돼요.</T>
    </Screen>
  );
}
