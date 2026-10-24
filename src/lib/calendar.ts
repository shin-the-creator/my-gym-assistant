// 달력 계산(일요일 시작, 6주 고정 칸)

import { dateKey } from './time';

export interface DayCell {
  date: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
}

/** month: 0~11. 앞뒤 달 날짜로 채워 항상 7의 배수 칸을 돌려준다 */
export function monthMatrix(year: number, month: number): DayCell[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const lastDay = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((first.getDay() + lastDay) / 7);
  const rows: DayCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      row.push({ date: dateKey(cur), day: cur.getDate(), inMonth: cur.getMonth() === month });
    }
    rows.push(row);
  }
  return rows;
}

export const WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];
export const WEEKDAY_LONG = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

export function formatLongDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY_LONG[d.getDay()]}`;
}
