import { Alert, Platform } from 'react-native';

/** 확인/취소 대화상자 (웹에서는 브라우저 confirm) */
export function confirm(title: string, message: string, onOk: () => void, okText = '확인') {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: okText, style: 'destructive', onPress: onOk },
  ]);
}

/** 알림 대화상자 */
export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    globalThis.alert?.(`${title}\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
