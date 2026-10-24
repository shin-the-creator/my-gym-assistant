import { trackSteps } from '../steps';

const BOOT = 1_000_000;
const MID = new Date('2026-10-25T00:00:00').getTime();

describe('today steps from the cumulative step sensor', () => {
  it('starts counting from the first reading', () => {
    const r = trackSteps(null, 5000, BOOT, '2026-10-24', MID);
    expect(r.steps).toBe(0);
    expect(trackSteps(r.track, 5600, BOOT, '2026-10-24', MID).steps).toBe(600);
  });

  it('starts a new day from the last reading of the day before', () => {
    const y = { date: '2026-10-24', baseline: 1000, boot: BOOT, last: 9000 };
    const r = trackSteps(y, 9300, BOOT + 20, '2026-10-25', MID);
    expect(r.steps).toBe(300);
    expect(r.track.baseline).toBe(9000);
  });

  it('keeps today\'s steps across a reboot', () => {
    const t = { date: '2026-10-25', baseline: 9000, boot: BOOT, last: 12000 };
    // 재부팅 뒤 센서는 0부터: 오늘 3000 + 재부팅 뒤 500
    const r = trackSteps(t, 500, MID + 3_600_000, '2026-10-25', MID);
    expect(r.steps).toBe(3500);
    expect(trackSteps(r.track, 900, MID + 3_600_000, '2026-10-25', MID).steps).toBe(3900);
  });

  it('counts everything after a reboot today when the day changed', () => {
    const y = { date: '2026-10-24', baseline: 0, boot: BOOT, last: 7000 };
    expect(trackSteps(y, 400, MID + 1000, '2026-10-25', MID).steps).toBe(400);
    // 어제 재부팅했으면 어제 걸음이 섞여 있으니 지금부터 센다
    expect(trackSteps(y, 400, MID - 1000, '2026-10-25', MID).steps).toBe(0);
  });
});
