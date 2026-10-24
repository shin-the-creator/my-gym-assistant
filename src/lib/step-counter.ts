// 안드로이드 걸음 센서(modules/step-counter). 앱 설치 파일에만 들어 있고 웹·Expo Go에서는 없다.

import { requireOptionalNativeModule } from 'expo';
import { PermissionsAndroid, Platform } from 'react-native';

interface StepCounterNative {
  isAvailable(): boolean;
  readAsync(): Promise<{ steps: number; bootTime: number } | null>;
}

const native = Platform.OS === 'android' ? requireOptionalNativeModule<StepCounterNative>('StepCounter') : null;

export const stepCounterSupported = !!native && native.isAvailable();

/** 신체 활동 권한(안드로이드 10 이상에서 필요) */
export async function hasActivityPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (Number(Platform.Version) < 29) return true;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
}

/** 권한을 묻는다. 두 번 거절하면 안드로이드가 더 묻지 않으므로 'blocked'를 돌려준다 */
export async function requestActivityPermission(): Promise<'granted' | 'denied' | 'blocked'> {
  if (Platform.OS !== 'android') return 'denied';
  if (Number(Platform.Version) < 29) return 'granted';
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION, {
    title: '신체 활동 권한',
    message: '오늘 걸은 걸음 수를 오늘 화면에 보여 주는 데 사용해요. 걸음 수는 이 폰에만 저장돼요.',
    buttonPositive: '허용',
    buttonNegative: '나중에',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}

export async function readStepCounter(): Promise<{ steps: number; bootTime: number } | null> {
  if (!native) return null;
  try {
    return await native.readAsync();
  } catch {
    return null;
  }
}
