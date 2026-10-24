// 오늘 걸음 수 계산: 폰 걸음 센서는 "부팅 뒤 누적값"만 주므로, 날짜별 기준값을 저장해 두고 뺀다.
// 앱을 연 순간들의 값으로 추정하기 때문에, 전날 마지막으로 연 뒤 자정 전까지 걸은 걸음은 오늘로 들어간다.

export interface StepTrack {
  /** 기준값을 잡은 날짜 */
  date: string;
  /** 오늘 걸음 = 센서값 - baseline */
  baseline: number;
  /** 폰이 켜진 시각(ms) — 다르면 재부팅으로 센서값이 0부터 다시 시작한 것 */
  boot: number;
  /** 마지막으로 읽은 센서값 */
  last: number;
}

/** 부팅 시각은 계산 오차가 있어 1분 안쪽 차이는 같은 부팅으로 본다 */
const sameBoot = (prev: StepTrack, raw: number, boot: number) => Math.abs(prev.boot - boot) < 60_000 && raw >= prev.last;

export function trackSteps(prev: StepTrack | null, raw: number, boot: number, today: string, midnight: number): { track: StepTrack; steps: number } {
  let baseline: number;
  if (!prev) {
    // 처음 읽은 날은 지금부터 센다
    baseline = raw;
  } else if (sameBoot(prev, raw, boot)) {
    baseline = prev.date === today ? prev.baseline : prev.last;
  } else if (prev.date === today) {
    // 오늘 재부팅: 재부팅 전까지 센 걸음 + 재부팅 뒤 센서값
    baseline = -(prev.last - prev.baseline);
  } else {
    // 날이 바뀌었고 재부팅도 됨: 오늘 켰으면 전부 오늘 걸음, 어제 켰으면 지금부터
    baseline = boot >= midnight ? 0 : raw;
  }
  return { track: { date: today, baseline, boot, last: raw }, steps: Math.max(0, Math.round(raw - baseline)) };
}
