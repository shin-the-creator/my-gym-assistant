// 한국에서 쉽게 구할 수 있는 음식 위주의 영양 데이터(1회 제공량 기준, 대략값).

export type FoodRole = 'protein' | 'carb' | 'veg' | 'fat' | 'fruit' | 'dairy';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Food {
  id: string;
  name: string;
  role: FoodRole;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: MealSlot[];
  /** 기피 음식 키워드 매칭용 */
  tags: string[];
}

const ALL: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

export const FOODS: Food[] = [
  // 단백질
  { id: 'chicken_breast', name: '닭가슴살', role: 'protein', serving: '100g', kcal: 165, protein: 31, carbs: 0, fat: 3.6, meals: ALL, tags: ['닭', '육류'] },
  { id: 'chicken_thigh', name: '닭다리살 구이', role: 'protein', serving: '100g', kcal: 210, protein: 26, carbs: 0, fat: 11, meals: ['lunch', 'dinner'], tags: ['닭', '육류'] },
  { id: 'eggs', name: '삶은 달걀 2개', role: 'protein', serving: '2개', kcal: 155, protein: 13, carbs: 1, fat: 11, meals: ['breakfast', 'lunch', 'snack'], tags: ['달걀', '계란'] },
  { id: 'egg_whites', name: '달걀흰자 4개', role: 'protein', serving: '4개', kcal: 68, protein: 14, carbs: 1, fat: 0, meals: ['breakfast', 'snack'], tags: ['달걀', '계란'] },
  { id: 'pork_tenderloin', name: '돼지 안심 수육', role: 'protein', serving: '100g', kcal: 145, protein: 26, carbs: 0, fat: 4, meals: ['lunch', 'dinner'], tags: ['돼지', '육류'] },
  { id: 'beef_round', name: '소고기 우둔살 구이', role: 'protein', serving: '100g', kcal: 170, protein: 28, carbs: 0, fat: 6, meals: ['lunch', 'dinner'], tags: ['소', '육류'] },
  { id: 'mackerel', name: '고등어 구이', role: 'protein', serving: '100g', kcal: 205, protein: 19, carbs: 0, fat: 14, meals: ['lunch', 'dinner'], tags: ['생선', '해산물'] },
  { id: 'salmon', name: '연어 구이', role: 'protein', serving: '100g', kcal: 206, protein: 22, carbs: 0, fat: 12, meals: ['lunch', 'dinner'], tags: ['생선', '해산물'] },
  { id: 'tuna_can', name: '참치캔(기름 뺀 것)', role: 'protein', serving: '100g', kcal: 130, protein: 26, carbs: 0, fat: 2, meals: ALL, tags: ['생선', '해산물', '참치'] },
  { id: 'tofu', name: '두부 부침', role: 'protein', serving: '150g', kcal: 160, protein: 15, carbs: 3, fat: 9, meals: ALL, tags: ['콩', '두부'] },
  { id: 'shrimp', name: '새우 볶음', role: 'protein', serving: '100g', kcal: 110, protein: 22, carbs: 1, fat: 2, meals: ['lunch', 'dinner'], tags: ['해산물', '새우', '갑각류'] },
  { id: 'protein_shake', name: '프로틴 쉐이크', role: 'protein', serving: '1스쿱', kcal: 120, protein: 24, carbs: 3, fat: 1.5, meals: ['breakfast', 'snack'], tags: ['유제품', '우유'] },

  // 탄수화물
  { id: 'brown_rice', name: '현미밥', role: 'carb', serving: '1공기(210g)', kcal: 310, protein: 6.5, carbs: 67, fat: 2.5, meals: ['lunch', 'dinner'], tags: ['쌀'] },
  { id: 'white_rice', name: '흰쌀밥', role: 'carb', serving: '1공기(210g)', kcal: 310, protein: 6, carbs: 68, fat: 0.6, meals: ALL, tags: ['쌀'] },
  { id: 'multigrain_rice', name: '잡곡밥', role: 'carb', serving: '1공기(210g)', kcal: 300, protein: 7, carbs: 65, fat: 2, meals: ['lunch', 'dinner'], tags: ['쌀', '잡곡'] },
  { id: 'oatmeal', name: '오트밀', role: 'carb', serving: '50g', kcal: 190, protein: 6.5, carbs: 33, fat: 3.5, meals: ['breakfast', 'snack'], tags: ['귀리', '글루텐'] },
  { id: 'sweet_potato', name: '고구마', role: 'carb', serving: '중 1개(150g)', kcal: 195, protein: 2.5, carbs: 46, fat: 0.2, meals: ['breakfast', 'lunch', 'snack'], tags: ['고구마'] },
  { id: 'potato', name: '감자', role: 'carb', serving: '중 1개(150g)', kcal: 115, protein: 3, carbs: 26, fat: 0.1, meals: ALL, tags: ['감자'] },
  { id: 'whole_wheat_bread', name: '통밀빵 2장', role: 'carb', serving: '2장', kcal: 160, protein: 8, carbs: 28, fat: 2, meals: ['breakfast', 'snack'], tags: ['밀', '글루텐'] },
  { id: 'buckwheat_noodle', name: '메밀면', role: 'carb', serving: '1인분(삶은 200g)', kcal: 230, protein: 9, carbs: 47, fat: 1, meals: ['lunch'], tags: ['메밀', '밀'] },
  { id: 'banana', name: '바나나', role: 'fruit', serving: '1개', kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, meals: ['breakfast', 'snack'], tags: ['바나나'] },

  // 채소
  { id: 'salad', name: '채소 샐러드(드레싱 소량)', role: 'veg', serving: '1접시', kcal: 60, protein: 2, carbs: 8, fat: 2.5, meals: ALL, tags: [] },
  { id: 'broccoli', name: '데친 브로콜리', role: 'veg', serving: '100g', kcal: 35, protein: 2.8, carbs: 7, fat: 0.4, meals: ALL, tags: [] },
  { id: 'kimchi', name: '김치', role: 'veg', serving: '50g', kcal: 15, protein: 1, carbs: 2.4, fat: 0.3, meals: ['lunch', 'dinner'], tags: [] },
  { id: 'spinach_namul', name: '시금치나물', role: 'veg', serving: '70g', kcal: 40, protein: 2.5, carbs: 3.5, fat: 2, meals: ['lunch', 'dinner'], tags: [] },
  { id: 'bean_sprout_soup', name: '콩나물국', role: 'veg', serving: '1그릇', kcal: 45, protein: 4, carbs: 5, fat: 1, meals: ['breakfast', 'lunch', 'dinner'], tags: ['콩'] },
  { id: 'doenjang_soup', name: '된장찌개(두부·애호박)', role: 'veg', serving: '1그릇', kcal: 110, protein: 8, carbs: 9, fat: 4.5, meals: ['lunch', 'dinner'], tags: ['콩', '두부'] },
  { id: 'cherry_tomato', name: '방울토마토', role: 'veg', serving: '10개', kcal: 30, protein: 1.3, carbs: 6, fat: 0.3, meals: ['breakfast', 'snack'], tags: [] },

  // 지방
  { id: 'almonds', name: '아몬드', role: 'fat', serving: '20알(23g)', kcal: 135, protein: 5, carbs: 5, fat: 12, meals: ['breakfast', 'snack'], tags: ['견과', '아몬드'] },
  { id: 'peanut_butter', name: '땅콩버터', role: 'fat', serving: '1큰술(16g)', kcal: 95, protein: 4, carbs: 3, fat: 8, meals: ['breakfast', 'snack'], tags: ['견과', '땅콩'] },
  { id: 'avocado', name: '아보카도 반 개', role: 'fat', serving: '70g', kcal: 115, protein: 1.4, carbs: 6, fat: 10.5, meals: ALL, tags: ['아보카도'] },
  { id: 'olive_oil', name: '올리브유', role: 'fat', serving: '1작은술(5g)', kcal: 45, protein: 0, carbs: 0, fat: 5, meals: ['lunch', 'dinner'], tags: [] },

  // 유제품·과일
  { id: 'greek_yogurt', name: '그릭요거트(무가당)', role: 'dairy', serving: '150g', kcal: 130, protein: 15, carbs: 6, fat: 5, meals: ['breakfast', 'snack'], tags: ['유제품', '우유'] },
  { id: 'milk', name: '저지방 우유', role: 'dairy', serving: '200ml', kcal: 85, protein: 7, carbs: 10, fat: 2, meals: ['breakfast', 'snack'], tags: ['유제품', '우유'] },
  { id: 'apple', name: '사과', role: 'fruit', serving: '중 1개', kcal: 95, protein: 0.5, carbs: 25, fat: 0.3, meals: ['breakfast', 'snack'], tags: [] },
  { id: 'blueberries', name: '블루베리', role: 'fruit', serving: '100g', kcal: 57, protein: 0.7, carbs: 14, fat: 0.3, meals: ['breakfast', 'snack'], tags: [] },
];

export function isAvoided(food: Food, avoid: string[]): boolean {
  const words = avoid.map((w) => w.trim()).filter(Boolean);
  return words.some((w) => food.name.includes(w) || food.tags.some((t) => t.includes(w)));
}
