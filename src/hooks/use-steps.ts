// 오늘 걸음 수(안드로이드 걸음 센서). 신체 활동 권한이 있어야 읽는다.

import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { hasActivityPermission, readStepCounter, requestActivityPermission, stepCounterSupported } from '@/lib/step-counter';
import { trackSteps } from '@/lib/steps';
import { dateKey } from '@/lib/time';
import { useStore } from '@/store/useStore';

export type StepsStatus = 'unsupported' | 'need-permission' | 'blocked' | 'ok';

export function useTodaySteps(): { steps: number | null; status: StepsStatus; ask: () => void } {
  const [steps, setSteps] = useState<number | null>(null);
  const [status, setStatus] = useState<StepsStatus>(stepCounterSupported ? 'ok' : 'unsupported');

  const read = useCallback(async () => {
    if (!stepCounterSupported) return;
    if (!(await hasActivityPermission())) {
      setStatus((s) => (s === 'blocked' ? s : 'need-permission'));
      return;
    }
    const raw = await readStepCounter();
    if (!raw) return;
    const now = new Date();
    const midnight = new Date(now).setHours(0, 0, 0, 0);
    const { track, steps: today } = trackSteps(useStore.getState().stepTrack, raw.steps, raw.bootTime, dateKey(now), midnight);
    useStore.getState().setStepTrack(track);
    setSteps(today);
    setStatus('ok');
  }, []);

  useEffect(() => {
    // 첫 읽기도 타이머로(화면이 그려진 뒤) 시작한다
    const first = setTimeout(read, 0);
    const timer = setInterval(read, 60_000);
    // 다른 앱(설정 등)에서 돌아오면 바로 다시 읽는다
    const sub = AppState.addEventListener('change', (s) => s === 'active' && read());
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      sub.remove();
    };
  }, [read]);

  const ask = useCallback(async () => {
    if (status === 'blocked') {
      Linking.openSettings();
      return;
    }
    const result = await requestActivityPermission();
    if (result === 'granted') read();
    else setStatus(result === 'blocked' ? 'blocked' : 'need-permission');
  }, [status, read]);

  return { steps, status, ask };
}
