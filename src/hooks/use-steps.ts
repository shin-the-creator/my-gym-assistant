// 오늘 걸음 수(iOS 건강 데이터). 읽을 수 없는 기기에서는 null

import { Pedometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useTodaySteps(): number | null {
  const [steps, setSteps] = useState<number | null>(null);

  useEffect(() => {
    // 오늘 0시부터의 누적 걸음은 iOS에서만 조회할 수 있다
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    const read = async () => {
      try {
        if (!(await Pedometer.isAvailableAsync())) return;
        const perm = await Pedometer.requestPermissionsAsync();
        if (!perm.granted) return;
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(start, new Date());
        if (!cancelled) setSteps(result.steps);
      } catch {
        // 센서를 못 읽으면 표시만 생략한다
      }
    };
    read();
    const timer = setInterval(read, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return steps;
}
