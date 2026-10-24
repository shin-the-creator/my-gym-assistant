// 나이스 교육정보 개방 포털(open.neis.go.kr) — 학교 검색과 급식 식단(칼로리·영양 포함).
// 인증키 없이도 한 번에 5건까지 조회되므로, 학교 검색과 하루치 급식(조·중·석식)에는 충분하다.

import type { School, SchoolMeal } from '@/types/models';

const HUB = 'https://open.neis.go.kr/hub';

export class NeisError extends Error {}

type Row = Record<string, string | undefined>;

/** NEIS 응답에서 row 목록을 꺼낸다. 데이터 없음(INFO-200)은 빈 목록 */
export function extractRows(endpoint: string, data: unknown): Row[] {
  const d = data as Record<string, unknown>;
  const dataset = d?.[endpoint] as { head?: unknown[]; row?: Row[] }[] | undefined;
  if (!dataset) {
    const result = d?.RESULT as { CODE?: string; MESSAGE?: string } | undefined;
    if (result?.CODE === 'INFO-200') return [];
    throw new NeisError(result?.MESSAGE ?? '급식 정보를 불러오지 못했어요.');
  }
  return dataset.flatMap((section) => (Array.isArray(section.row) ? section.row : []));
}

async function call(endpoint: string, params: Record<string, string>): Promise<Row[]> {
  const query = new URLSearchParams({ Type: 'json', pIndex: '1', pSize: '5', ...params }).toString();
  let res: Response;
  try {
    res = await fetch(`${HUB}/${endpoint}?${query}`);
  } catch {
    throw new NeisError('인터넷 연결을 확인해 주세요.');
  }
  if (!res.ok) throw new NeisError(`급식 서버 오류 (${res.status})`);
  return extractRows(endpoint, await res.json());
}

export async function searchSchools(name: string): Promise<School[]> {
  const rows = await call('schoolInfo', { SCHUL_NM: name.trim() });
  return rows
    .filter((r) => r.ATPT_OFCDC_SC_CODE && r.SD_SCHUL_CODE)
    .map((r) => ({
      name: r.SCHUL_NM ?? name,
      officeCode: r.ATPT_OFCDC_SC_CODE!,
      schoolCode: r.SD_SCHUL_CODE!,
      address: r.ORG_RDNMA ?? r.LCTN_SC_NM,
    }));
}

/** "현미밥 (5.13.)<br/>*미역국 (5.6.9.)" → ["현미밥", "미역국"] */
export function parseDishes(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/<br\s*\/?>|\n/i)
    .map((d) =>
      d
        .replace(/\([\d.\s]*\)/g, '') // 알레르기 번호
        .replace(/[*#@&]/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
}

/** "812.5 Kcal" → 812.5 */
export function parseKcal(raw?: string): number {
  const m = raw?.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

/** "탄수화물(g) : 120.3<br/>단백질(g) : 35.2<br/>지방(g) : 22.1<br/>..." */
export function parseNutrients(raw?: string): { carbs: number; protein: number; fat: number } {
  const get = (label: string) => {
    const m = raw?.match(new RegExp(`${label}\\(g\\)\\s*:\\s*([\\d.]+)`));
    return m ? parseFloat(m[1]) : 0;
  };
  return { carbs: get('탄수화물'), protein: get('단백질'), fat: get('지방') };
}

export function toSchoolMeal(r: Row): SchoolMeal {
  const code = (r.MMEAL_SC_CODE ?? '2') as SchoolMeal['code'];
  return {
    code,
    name: r.MMEAL_SC_NM ?? (code === '1' ? '조식' : code === '3' ? '석식' : '중식'),
    dishes: parseDishes(r.DDISH_NM),
    kcal: Math.round(parseKcal(r.CAL_INFO)),
    ...parseNutrients(r.NTR_INFO),
  };
}

/** date: YYYY-MM-DD. 급식이 없는 날(주말·방학)은 빈 목록 */
export async function fetchSchoolMeals(school: School, date: string): Promise<SchoolMeal[]> {
  const rows = await call('mealServiceDietInfo', {
    ATPT_OFCDC_SC_CODE: school.officeCode,
    SD_SCHUL_CODE: school.schoolCode,
    MLSV_YMD: date.replace(/-/g, ''),
  });
  return rows.map(toSchoolMeal).sort((a, b) => a.code.localeCompare(b.code));
}

export const SCHOOL_MEAL_SLOT = { '1': 'breakfast', '2': 'lunch', '3': 'dinner' } as const;
