// 날짜별 학교 급식. 한 번 받은 날짜는 기기에 저장해 두고 다시 묻지 않는다

import { useEffect, useState } from 'react';

import { fetchSchoolMeals } from '@/lib/neis';
import { useStore } from '@/store/useStore';
import type { SchoolMeal } from '@/types/models';

export function useSchoolMeals(date: string): { meals: SchoolMeal[]; loading: boolean; error: string | null; hasSchool: boolean } {
  const school = useStore((s) => s.school);
  const cached = useStore((s) => s.schoolMeals[date]);
  const cache = useStore((s) => s.cacheSchoolMeals);
  // 실패는 어느 날짜의 실패인지 함께 기억해, 날짜가 바뀌면 자동으로 다시 시도한다
  const [failure, setFailure] = useState<{ date: string; message: string } | null>(null);
  const error = failure?.date === date ? failure.message : null;

  useEffect(() => {
    if (!school || cached || !date) return;
    let cancelled = false;
    fetchSchoolMeals(school, date)
      .then((meals) => {
        if (!cancelled) cache(date, meals);
      })
      .catch((e: unknown) => {
        if (!cancelled) setFailure({ date, message: e instanceof Error ? e.message : '급식 정보를 불러오지 못했어요.' });
      });
    return () => {
      cancelled = true;
    };
  }, [school, date, cached, cache]);

  return { meals: cached ?? [], loading: !!school && !cached && !error, error, hasSchool: !!school };
}
