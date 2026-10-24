import type { IconName } from '@/components/ui';
import type { PlaceKind } from '@/types/models';

export const PLACE_KINDS: Record<PlaceKind, { label: string; icon: IconName }> = {
  apartment_gym: { label: '우리 단지 헬스장', icon: 'home' },
  other_gym: { label: '다른 헬스장', icon: 'business' },
  outdoor_bar: { label: '철봉·야외 운동기구', icon: 'leaf' },
  home: { label: '집', icon: 'bed' },
  other: { label: '기타', icon: 'location' },
};
