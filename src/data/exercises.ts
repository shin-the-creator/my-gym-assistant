// 운동 데이터베이스.
// 루틴은 "움직임 패턴" 단위로 짜고, 장소마다 그 패턴을 할 수 있는 운동으로 바꿔 끼운다.
// 그래서 어느 헬스장에 가든 루틴의 뼈대(어떤 날 무엇을 몇 세트)는 그대로 유지된다.

import type { Experience } from '@/types/models';

export type Pattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'chest_fly'
  | 'lateral_raise'
  | 'rear_delt'
  | 'biceps'
  | 'triceps'
  | 'leg_curl'
  | 'leg_extension'
  | 'calves'
  | 'core'
  | 'cardio';

export const PATTERN_NAMES: Record<Pattern, string> = {
  squat: '스쿼트 계열 (하체 앞)',
  hinge: '힌지 계열 (하체 뒤·허리)',
  lunge: '런지 계열 (한 다리)',
  horizontal_push: '수평 밀기 (가슴)',
  vertical_push: '수직 밀기 (어깨)',
  horizontal_pull: '수평 당기기 (등 두께)',
  vertical_pull: '수직 당기기 (광배)',
  chest_fly: '가슴 고립',
  lateral_raise: '측면 어깨',
  rear_delt: '후면 어깨',
  biceps: '이두',
  triceps: '삼두',
  leg_curl: '햄스트링 고립',
  leg_extension: '대퇴사두 고립',
  calves: '종아리',
  core: '코어',
  cardio: '유산소',
};

export type LoadType = 'weighted' | 'bodyweight' | 'time';

export interface Exercise {
  id: string;
  name: string;
  pattern: Pattern;
  /**
   * 필요한 기구 조합. 바깥 배열은 "또는", 안쪽 배열은 "모두 필요".
   * 빈 안쪽 배열([])은 기구 없이 가능하다는 뜻.
   */
  requires: string[][];
  load: LoadType;
  /** 이 운동을 권장하는 최소 숙련도 */
  minLevel: Experience;
  /** 무게를 쓰는 운동에서 무게가 걸리는 기구 (세팅의 최대 무게를 확인할 때 사용) */
  loadEquipment?: string[];
  cue: string;
}

// 같은 패턴 안에서는 앞에 있을수록 우선 선택된다(효과·안정성 순).
export const EXERCISES: Exercise[] = [
  // 스쿼트
  { id: 'barbell_back_squat', name: '바벨 백스쿼트', pattern: 'squat', requires: [['barbell', 'squat_rack']], load: 'weighted', minLevel: 'intermediate', loadEquipment: ['barbell'], cue: '가슴을 세우고 무릎은 발끝 방향으로, 허벅지가 바닥과 평행할 때까지.' },
  { id: 'hack_squat', name: '핵스쿼트', pattern: 'squat', requires: [['hack_squat']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['hack_squat'], cue: '등을 패드에 붙이고 발 전체로 밀어낸다.' },
  { id: 'smith_squat', name: '스미스 스쿼트', pattern: 'squat', requires: [['smith_machine']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['smith_machine'], cue: '발을 살짝 앞에 두고 수직으로 앉는다.' },
  { id: 'leg_press', name: '레그프레스', pattern: 'squat', requires: [['leg_press']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['leg_press'], cue: '엉덩이가 들리지 않는 깊이까지, 무릎을 완전히 잠그지 않는다.' },
  { id: 'goblet_squat', name: '고블릿 스쿼트', pattern: 'squat', requires: [['dumbbell'], ['kettlebell']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['dumbbell', 'kettlebell'], cue: '덤벨을 가슴 앞에 세워 들고 팔꿈치가 무릎 안쪽을 지나도록 앉는다.' },
  { id: 'bodyweight_squat', name: '맨몸 스쿼트', pattern: 'squat', requires: [[]], load: 'bodyweight', minLevel: 'beginner', cue: '3초 내려가고 1초 멈춘 뒤 일어나 난이도를 높인다.' },

  // 힌지
  { id: 'romanian_deadlift', name: '루마니안 데드리프트(바벨)', pattern: 'hinge', requires: [['barbell']], load: 'weighted', minLevel: 'intermediate', loadEquipment: ['barbell'], cue: '무릎은 살짝만 굽히고 엉덩이를 뒤로 빼며 햄스트링이 늘어나는 느낌.' },
  { id: 'db_romanian_deadlift', name: '덤벨 루마니안 데드리프트', pattern: 'hinge', requires: [['dumbbell']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['dumbbell'], cue: '덤벨을 허벅지에 붙여 내리고 등은 중립 유지.' },
  { id: 'kb_swing', name: '케틀벨 스윙', pattern: 'hinge', requires: [['kettlebell']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['kettlebell'], cue: '팔이 아니라 엉덩이를 튕겨서 올린다.' },
  { id: 'back_extension', name: '백 익스텐션', pattern: 'hinge', requires: [['roman_chair']], load: 'bodyweight', minLevel: 'beginner', cue: '허리를 꺾지 말고 엉덩이 힘으로 몸을 일직선까지만 올린다.' },
  { id: 'cable_pull_through', name: '케이블 풀스루', pattern: 'hinge', requires: [['cable_station']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['cable_station'], cue: '로프를 다리 사이로 당기며 엉덩이를 앞으로 민다.' },
  { id: 'glute_bridge', name: '글루트 브릿지(한 다리)', pattern: 'hinge', requires: [[]], load: 'bodyweight', minLevel: 'beginner', cue: '정점에서 2초 엉덩이를 꽉 조인다.' },

  // 런지
  { id: 'db_bulgarian_split_squat', name: '덤벨 불가리안 스플릿 스쿼트', pattern: 'lunge', requires: [['dumbbell', 'flat_bench'], ['dumbbell', 'adjustable_bench']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['dumbbell'], cue: '뒷발을 벤치에 올리고 앞다리로 수직으로 내려간다.' },
  { id: 'db_walking_lunge', name: '덤벨 워킹 런지', pattern: 'lunge', requires: [['dumbbell']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['dumbbell'], cue: '보폭을 넉넉히, 뒷무릎이 바닥에 닿기 직전까지.' },
  { id: 'bodyweight_split_squat', name: '맨몸 스플릿 스쿼트', pattern: 'lunge', requires: [[]], load: 'bodyweight', minLevel: 'beginner', cue: '한쪽씩 천천히, 앞꿈치가 아닌 발 전체로 민다.' },

  // 수평 밀기
  { id: 'barbell_bench_press', name: '바벨 벤치프레스', pattern: 'horizontal_push', requires: [['barbell', 'bench_press_station'], ['barbell', 'squat_rack', 'flat_bench']], load: 'weighted', minLevel: 'intermediate', loadEquipment: ['barbell'], cue: '견갑을 모아 고정하고 바를 명치 쪽으로 내린다.' },
  { id: 'db_bench_press', name: '덤벨 벤치프레스', pattern: 'horizontal_push', requires: [['dumbbell', 'flat_bench'], ['dumbbell', 'adjustable_bench']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['dumbbell'], cue: '팔꿈치는 몸통과 45도, 가슴이 늘어날 때까지 내린다.' },
  { id: 'chest_press_machine', name: '체스트 프레스 머신', pattern: 'horizontal_push', requires: [['chest_press_machine']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['chest_press_machine'], cue: '손잡이가 가슴 중앙 높이에 오도록 시트를 맞춘다.' },
  { id: 'smith_bench_press', name: '스미스 벤치프레스', pattern: 'horizontal_push', requires: [['smith_machine', 'flat_bench'], ['smith_machine', 'adjustable_bench']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['smith_machine'], cue: '바가 가슴 하단에 닿도록 벤치 위치를 맞춘다.' },
  { id: 'dips', name: '딥스', pattern: 'horizontal_push', requires: [['parallel_bars'], ['assisted_pullup_machine']], load: 'bodyweight', minLevel: 'beginner', cue: '상체를 약간 숙이고 어깨가 팔꿈치 높이까지 내려간다.' },
  { id: 'push_up', name: '푸시업', pattern: 'horizontal_push', requires: [[]], load: 'bodyweight', minLevel: 'beginner', cue: '몸을 일직선으로, 너무 쉬우면 발을 높이거나 템포를 느리게.' },

  // 수직 밀기
  { id: 'barbell_ohp', name: '바벨 오버헤드 프레스', pattern: 'vertical_push', requires: [['barbell', 'squat_rack']], load: 'weighted', minLevel: 'intermediate', loadEquipment: ['barbell'], cue: '엉덩이와 복부를 조이고 바를 얼굴 가까이 수직으로.' },
  { id: 'db_shoulder_press', name: '덤벨 숄더 프레스', pattern: 'vertical_push', requires: [['dumbbell', 'adjustable_bench'], ['dumbbell']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['dumbbell'], cue: '귀 옆에서 시작해 머리 위로 모으듯 민다.' },
  { id: 'shoulder_press_machine', name: '숄더 프레스 머신', pattern: 'vertical_push', requires: [['shoulder_press_machine']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['shoulder_press_machine'], cue: '손잡이가 어깨 높이에서 시작하도록 시트 조절.' },
  { id: 'pike_push_up', name: '파이크 푸시업', pattern: 'vertical_push', requires: [[]], load: 'bodyweight', minLevel: 'beginner', cue: '엉덩이를 높이 들어 ㅅ자 자세에서 정수리를 바닥 쪽으로.' },

  // 수평 당기기
  { id: 'barbell_row', name: '바벨 로우', pattern: 'horizontal_pull', requires: [['barbell']], load: 'weighted', minLevel: 'intermediate', loadEquipment: ['barbell'], cue: '상체 45도 이상 숙이고 바를 배꼽 쪽으로.' },
  { id: 'seated_row_machine', name: '시티드 로우', pattern: 'horizontal_pull', requires: [['seated_row_machine'], ['cable_station']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['seated_row_machine', 'cable_station'], cue: '가슴을 펴고 팔꿈치를 뒤로 보내며 견갑을 모은다.' },
  { id: 'db_row', name: '원암 덤벨 로우', pattern: 'horizontal_pull', requires: [['dumbbell', 'flat_bench'], ['dumbbell', 'adjustable_bench'], ['dumbbell']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['dumbbell'], cue: '벤치에 한 손을 짚고 덤벨을 골반 쪽으로 당긴다.' },
  { id: 'inverted_row', name: '인버티드 로우', pattern: 'horizontal_pull', requires: [['low_bar'], ['smith_machine'], ['squat_rack', 'barbell']], load: 'bodyweight', minLevel: 'beginner', cue: '낮은 봉에 매달려 몸을 일직선으로 유지하며 가슴을 봉에 붙인다.' },
  { id: 'band_row', name: '밴드 로우', pattern: 'horizontal_pull', requires: [['resistance_band']], load: 'bodyweight', minLevel: 'beginner', cue: '밴드를 고정하고 팔꿈치를 뒤로 당긴다.' },

  // 수직 당기기
  { id: 'pull_up', name: '풀업(턱걸이)', pattern: 'vertical_pull', requires: [['pullup_bar'], ['squat_rack']], load: 'bodyweight', minLevel: 'intermediate', cue: '어깨를 먼저 끌어내린 뒤 가슴을 봉으로 당긴다.' },
  { id: 'lat_pulldown', name: '랫풀다운', pattern: 'vertical_pull', requires: [['lat_pulldown'], ['cable_station']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['lat_pulldown', 'cable_station'], cue: '바를 쇄골 쪽으로, 상체는 살짝만 뒤로.' },
  { id: 'assisted_pull_up', name: '어시스트 풀업', pattern: 'vertical_pull', requires: [['assisted_pullup_machine']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['assisted_pullup_machine'], cue: '보조 무게가 클수록 쉬워진다. 점점 보조를 줄여 간다.' },
  { id: 'negative_pull_up', name: '네거티브 풀업', pattern: 'vertical_pull', requires: [['pullup_bar']], load: 'bodyweight', minLevel: 'beginner', cue: '점프로 올라간 뒤 3~5초 동안 천천히 내려온다.' },
  { id: 'band_pulldown', name: '밴드 풀다운', pattern: 'vertical_pull', requires: [['resistance_band']], load: 'bodyweight', minLevel: 'beginner', cue: '높은 곳에 밴드를 걸고 팔꿈치를 옆구리로 끌어내린다.' },

  // 가슴 고립
  { id: 'pec_deck', name: '펙덱 플라이', pattern: 'chest_fly', requires: [['pec_deck']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['pec_deck'], cue: '팔꿈치를 살짝 굽힌 채 가슴으로 안는 느낌.' },
  { id: 'cable_fly', name: '케이블 플라이', pattern: 'chest_fly', requires: [['cable_station']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['cable_station'], cue: '한 발 앞으로 나와 포옹하듯 모은다.' },
  { id: 'db_fly', name: '덤벨 플라이', pattern: 'chest_fly', requires: [['dumbbell', 'flat_bench'], ['dumbbell', 'adjustable_bench']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['dumbbell'], cue: '가볍게, 가슴이 늘어나는 지점까지만.' },
  { id: 'wide_push_up', name: '와이드 푸시업', pattern: 'chest_fly', requires: [[]], load: 'bodyweight', minLevel: 'beginner', cue: '손을 어깨보다 넓게, 천천히 내려간다.' },

  // 측면 어깨
  { id: 'db_lateral_raise', name: '덤벨 사이드 레터럴 레이즈', pattern: 'lateral_raise', requires: [['dumbbell']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['dumbbell'], cue: '팔꿈치가 손보다 먼저 올라가게, 어깨 높이까지만.' },
  { id: 'cable_lateral_raise', name: '케이블 레터럴 레이즈', pattern: 'lateral_raise', requires: [['cable_station']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['cable_station'], cue: '케이블을 몸 뒤로 지나게 잡고 옆으로 들어 올린다.' },
  { id: 'band_lateral_raise', name: '밴드 레터럴 레이즈', pattern: 'lateral_raise', requires: [['resistance_band']], load: 'bodyweight', minLevel: 'beginner', cue: '밴드를 발로 밟고 옆으로 들어 올린다.' },

  // 후면 어깨
  { id: 'reverse_pec_deck', name: '리버스 펙덱', pattern: 'rear_delt', requires: [['pec_deck']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['pec_deck'], cue: '가슴을 패드에 대고 팔을 옆으로 벌린다.' },
  { id: 'face_pull', name: '페이스 풀', pattern: 'rear_delt', requires: [['cable_station'], ['resistance_band']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['cable_station'], cue: '로프를 이마 쪽으로 당기며 손을 귀 옆으로 벌린다.' },
  { id: 'db_rear_delt_fly', name: '덤벨 리어 델트 플라이', pattern: 'rear_delt', requires: [['dumbbell']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['dumbbell'], cue: '상체를 숙이고 가벼운 무게로 옆으로 벌린다.' },
  { id: 'prone_y_raise', name: '엎드려 Y 레이즈', pattern: 'rear_delt', requires: [[]], load: 'bodyweight', minLevel: 'beginner', cue: '엎드려 팔을 Y자로 들어 2초 버틴다.' },

  // 이두
  { id: 'ez_bar_curl', name: 'EZ바 컬', pattern: 'biceps', requires: [['ez_bar'], ['barbell']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['ez_bar', 'barbell'], cue: '팔꿈치를 옆구리에 고정.' },
  { id: 'db_curl', name: '덤벨 컬', pattern: 'biceps', requires: [['dumbbell']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['dumbbell'], cue: '반동 없이, 내릴 때 2초.' },
  { id: 'cable_curl', name: '케이블 컬', pattern: 'biceps', requires: [['cable_station']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['cable_station'], cue: '끝까지 펴고 끝까지 조인다.' },
  { id: 'chin_up', name: '친업(역그립 턱걸이)', pattern: 'biceps', requires: [['pullup_bar']], load: 'bodyweight', minLevel: 'beginner', cue: '손바닥이 나를 보게 잡고 턱을 봉 위로.' },
  { id: 'band_curl', name: '밴드 컬', pattern: 'biceps', requires: [['resistance_band']], load: 'bodyweight', minLevel: 'beginner', cue: '밴드를 밟고 천천히 감아올린다.' },

  // 삼두
  { id: 'cable_pushdown', name: '케이블 푸시다운', pattern: 'triceps', requires: [['cable_station'], ['lat_pulldown']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['cable_station', 'lat_pulldown'], cue: '팔꿈치를 고정하고 끝에서 1초 쥐어짠다.' },
  { id: 'db_overhead_extension', name: '덤벨 오버헤드 익스텐션', pattern: 'triceps', requires: [['dumbbell']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['dumbbell'], cue: '팔꿈치를 머리 옆에 두고 덤벨을 뒤로 깊게 내린다.' },
  { id: 'bench_dips', name: '벤치 딥스', pattern: 'triceps', requires: [['flat_bench'], ['adjustable_bench'], ['parallel_bars']], load: 'bodyweight', minLevel: 'beginner', cue: '등을 벤치 가까이, 팔꿈치는 뒤로.' },
  { id: 'diamond_push_up', name: '다이아몬드 푸시업', pattern: 'triceps', requires: [[]], load: 'bodyweight', minLevel: 'beginner', cue: '양손으로 삼각형을 만들고 팔꿈치를 몸통에 붙인다.' },

  // 햄스트링 고립
  { id: 'leg_curl', name: '레그 컬', pattern: 'leg_curl', requires: [['leg_curl']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['leg_curl'], cue: '엉덩이가 들리지 않게, 내릴 때 천천히.' },
  { id: 'nordic_curl', name: '노르딕 컬(보조)', pattern: 'leg_curl', requires: [['low_bar'], ['roman_chair']], load: 'bodyweight', minLevel: 'intermediate', cue: '발을 고정하고 버틸 수 있는 만큼 천천히 앞으로 넘어간다.' },
  { id: 'slider_leg_curl', name: '슬라이딩 레그 컬', pattern: 'leg_curl', requires: [['mat']], load: 'bodyweight', minLevel: 'beginner', cue: '수건 위에 발을 올리고 브릿지 자세에서 발을 당겨 온다.' },

  // 대퇴사두 고립
  { id: 'leg_extension', name: '레그 익스텐션', pattern: 'leg_extension', requires: [['leg_extension']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['leg_extension'], cue: '무릎 축을 기계 축에 맞추고 정점에서 1초.' },
  { id: 'sissy_squat', name: '시시 스쿼트(보조)', pattern: 'leg_extension', requires: [['pullup_bar'], ['low_bar'], ['squat_rack']], load: 'bodyweight', minLevel: 'intermediate', cue: '봉을 잡고 무릎을 앞으로 보내며 상체를 뒤로 젖힌다.' },

  // 종아리
  { id: 'calf_raise_machine', name: '카프 레이즈 머신', pattern: 'calves', requires: [['calf_raise_machine'], ['leg_press'], ['smith_machine']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['calf_raise_machine', 'leg_press', 'smith_machine'], cue: '가장 아래에서 1초 늘린 뒤 끝까지 올라간다.' },
  { id: 'db_calf_raise', name: '덤벨 카프 레이즈', pattern: 'calves', requires: [['dumbbell']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['dumbbell'], cue: '계단 끝에서 하면 가동범위가 커진다.' },
  { id: 'single_leg_calf_raise', name: '한 발 카프 레이즈', pattern: 'calves', requires: [[]], load: 'bodyweight', minLevel: 'beginner', cue: '벽을 짚고 한 발씩 천천히.' },

  // 코어
  { id: 'hanging_leg_raise', name: '행잉 레그 레이즈', pattern: 'core', requires: [['pullup_bar'], ['roman_chair']], load: 'bodyweight', minLevel: 'intermediate', cue: '반동 없이 골반을 말아 올린다.' },
  { id: 'cable_crunch', name: '케이블 크런치', pattern: 'core', requires: [['cable_station']], load: 'weighted', minLevel: 'beginner', loadEquipment: ['cable_station'], cue: '무릎 꿇고 로프를 머리 옆에 둔 채 갈비뼈를 골반 쪽으로.' },
  { id: 'decline_crunch', name: '디클라인 크런치', pattern: 'core', requires: [['ab_bench']], load: 'bodyweight', minLevel: 'beginner', cue: '상체를 끝까지 눕히지 말고 복부 긴장 유지.' },
  { id: 'hanging_knee_raise', name: '행잉 니 레이즈', pattern: 'core', requires: [['pullup_bar'], ['parallel_bars']], load: 'bodyweight', minLevel: 'beginner', cue: '무릎을 가슴 쪽으로, 천천히 내린다.' },
  { id: 'plank', name: '플랭크', pattern: 'core', requires: [[]], load: 'time', minLevel: 'beginner', cue: '엉덩이를 조이고 갈비뼈를 내려 허리가 꺾이지 않게.' },

  // 유산소
  { id: 'incline_walk', name: '인클라인 걷기', pattern: 'cardio', requires: [['treadmill']], load: 'time', minLevel: 'beginner', cue: '경사 8~12%, 대화가 가능한 속도로.' },
  { id: 'bike_cardio', name: '실내 자전거', pattern: 'cardio', requires: [['bike']], load: 'time', minLevel: 'beginner', cue: '분당 80~90회전, 약간 숨이 찬 정도.' },
  { id: 'elliptical_cardio', name: '일립티컬', pattern: 'cardio', requires: [['elliptical']], load: 'time', minLevel: 'beginner', cue: '무릎 부담이 적은 유산소.' },
  { id: 'rowing_cardio', name: '로잉', pattern: 'cardio', requires: [['rowing_machine']], load: 'time', minLevel: 'beginner', cue: '다리→허리→팔 순서로 당긴다.' },
  { id: 'stepper_cardio', name: '천국의 계단', pattern: 'cardio', requires: [['stepper']], load: 'time', minLevel: 'beginner', cue: '손잡이에 기대지 말고 상체를 세운다.' },
  { id: 'brisk_walk', name: '빠르게 걷기/조깅', pattern: 'cardio', requires: [[]], load: 'time', minLevel: 'beginner', cue: '운동장이나 단지를 빠르게 걷거나 가볍게 뛴다.' },
];

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id);
}
