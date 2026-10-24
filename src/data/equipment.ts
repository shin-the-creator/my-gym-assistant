// 운동기구 카탈로그. AI 사진 인식도 이 id 목록 안에서만 고르게 한다.

export type EquipmentCategory = 'free_weight' | 'bench_rack' | 'machine' | 'cable' | 'bodyweight' | 'cardio';

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  /** 무게 세팅(최대 무게/증가 단위)이 의미 있는 기구인가 */
  weighted: boolean;
  /** AI 인식 프롬프트에 함께 넘기는 설명 */
  hint: string;
}

export const EQUIPMENT_CATEGORIES: Record<EquipmentCategory, string> = {
  free_weight: '프리웨이트',
  bench_rack: '벤치·랙',
  machine: '머신',
  cable: '케이블',
  bodyweight: '맨몸 기구',
  cardio: '유산소',
};

export const EQUIPMENT: Equipment[] = [
  { id: 'dumbbell', name: '덤벨', category: 'free_weight', weighted: true, hint: 'dumbbells, dumbbell rack' },
  { id: 'barbell', name: '바벨', category: 'free_weight', weighted: true, hint: 'olympic barbell with plates' },
  { id: 'ez_bar', name: 'EZ바', category: 'free_weight', weighted: true, hint: 'curved EZ curl bar' },
  { id: 'kettlebell', name: '케틀벨', category: 'free_weight', weighted: true, hint: 'kettlebells' },
  { id: 'resistance_band', name: '저항 밴드', category: 'free_weight', weighted: false, hint: 'elastic resistance/loop bands' },

  { id: 'flat_bench', name: '평벤치', category: 'bench_rack', weighted: false, hint: 'flat weight bench' },
  { id: 'adjustable_bench', name: '각도 조절 벤치', category: 'bench_rack', weighted: false, hint: 'adjustable incline bench' },
  { id: 'squat_rack', name: '스쿼트랙/파워랙', category: 'bench_rack', weighted: false, hint: 'squat rack, power rack, half rack' },
  { id: 'bench_press_station', name: '벤치프레스 거치대', category: 'bench_rack', weighted: false, hint: 'flat bench press station with uprights' },
  { id: 'smith_machine', name: '스미스 머신', category: 'bench_rack', weighted: true, hint: 'smith machine (barbell on guided rails)' },

  { id: 'leg_press', name: '레그프레스', category: 'machine', weighted: true, hint: 'leg press machine (sled or seated)' },
  { id: 'leg_extension', name: '레그 익스텐션', category: 'machine', weighted: true, hint: 'leg extension machine' },
  { id: 'leg_curl', name: '레그 컬', category: 'machine', weighted: true, hint: 'lying or seated leg curl machine' },
  { id: 'chest_press_machine', name: '체스트 프레스 머신', category: 'machine', weighted: true, hint: 'seated chest press machine' },
  { id: 'pec_deck', name: '펙덱/플라이 머신', category: 'machine', weighted: true, hint: 'pec deck / chest fly / rear delt machine' },
  { id: 'shoulder_press_machine', name: '숄더 프레스 머신', category: 'machine', weighted: true, hint: 'seated shoulder press machine' },
  { id: 'lat_pulldown', name: '랫풀다운', category: 'machine', weighted: true, hint: 'lat pulldown machine' },
  { id: 'seated_row_machine', name: '시티드 로우 머신', category: 'machine', weighted: true, hint: 'seated row machine (plate or selectorized)' },
  { id: 'assisted_pullup_machine', name: '어시스트 풀업 머신', category: 'machine', weighted: true, hint: 'assisted pull-up / dip machine' },
  { id: 'hip_abductor', name: '힙 어브덕션 머신', category: 'machine', weighted: true, hint: 'hip abductor / adductor machine' },
  { id: 'calf_raise_machine', name: '카프 레이즈 머신', category: 'machine', weighted: true, hint: 'standing or seated calf raise machine' },
  { id: 'hack_squat', name: '핵스쿼트', category: 'machine', weighted: true, hint: 'hack squat machine' },

  { id: 'cable_station', name: '케이블 머신', category: 'cable', weighted: true, hint: 'single cable stack / functional trainer / cable crossover' },

  { id: 'pullup_bar', name: '철봉', category: 'bodyweight', weighted: false, hint: 'pull-up bar, playground or school horizontal bar' },
  { id: 'parallel_bars', name: '평행봉/딥스대', category: 'bodyweight', weighted: false, hint: 'parallel bars or dip station' },
  { id: 'low_bar', name: '낮은 철봉', category: 'bodyweight', weighted: false, hint: 'low horizontal bar about waist height (for rows)' },
  { id: 'roman_chair', name: '로만체어/백익스텐션', category: 'bodyweight', weighted: false, hint: 'roman chair / back extension bench / captain chair' },
  { id: 'ab_bench', name: '복근 벤치(싯업 벤치)', category: 'bodyweight', weighted: false, hint: 'decline sit-up bench' },
  { id: 'mat', name: '매트', category: 'bodyweight', weighted: false, hint: 'exercise / yoga mat' },

  { id: 'treadmill', name: '러닝머신', category: 'cardio', weighted: false, hint: 'treadmill' },
  { id: 'bike', name: '실내 자전거', category: 'cardio', weighted: false, hint: 'stationary bike' },
  { id: 'elliptical', name: '일립티컬(크로스 트레이너)', category: 'cardio', weighted: false, hint: 'elliptical trainer' },
  { id: 'rowing_machine', name: '로잉머신', category: 'cardio', weighted: false, hint: 'rowing ergometer' },
  { id: 'stepper', name: '스텝밀/천국의 계단', category: 'cardio', weighted: false, hint: 'stair climber / stepmill' },
];

const byId = new Map(EQUIPMENT.map((e) => [e.id, e]));

export function getEquipment(id: string): Equipment | undefined {
  return byId.get(id);
}

export function equipmentName(id: string): string {
  return byId.get(id)?.name ?? id;
}

/** 장소 종류별로 처음 만들 때 미리 체크해 둘 기구 */
export const PLACE_PRESETS: Record<string, string[]> = {
  apartment_gym: ['dumbbell', 'flat_bench', 'adjustable_bench', 'lat_pulldown', 'cable_station', 'leg_press', 'treadmill', 'bike', 'mat'],
  other_gym: ['dumbbell', 'barbell', 'flat_bench', 'adjustable_bench', 'squat_rack', 'lat_pulldown', 'seated_row_machine', 'cable_station', 'leg_press', 'leg_extension', 'leg_curl', 'chest_press_machine', 'treadmill'],
  outdoor_bar: ['pullup_bar', 'parallel_bars', 'low_bar'],
  home: ['mat', 'resistance_band'],
  other: [],
};
