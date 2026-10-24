// "HH:MM" 문자열과 하루 중 분(minute) 사이를 오가는 도우미

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10));
  return ((h || 0) * 60 + (m || 0)) % (24 * 60);
}

export function fromMinutes(total: number): string {
  const day = 24 * 60;
  const t = ((Math.round(total) % day) + day) % day;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isValidTime(hhmm: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(hhmm.trim());
}

/** 로컬 시간 기준 YYYY-MM-DD */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime();
  return Math.round(ms / 86400000);
}
