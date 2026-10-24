// 기구 사진 촬영/선택. 앱 문서 폴더에 복사해 두어 캐시가 지워져도 남게 한다.

import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export interface PickedPhoto {
  uri: string;
  base64: string | null;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

function normalizeMime(mime?: string | null): PickedPhoto['mimeType'] {
  if (mime === 'image/png' || mime === 'image/webp') return mime;
  return 'image/jpeg';
}

/** keep=false면 앱 폴더에 복사하지 않는다(분석만 하고 버리는 음식 사진) */
export async function pickPhoto(source: 'camera' | 'library', keep = true): Promise<PickedPhoto | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('카메라 권한이 필요해요. 설정에서 허용해 주세요.');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true, exif: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return { uri: keep ? await persist(asset.uri) : asset.uri, base64: asset.base64 ?? null, mimeType: normalizeMime(asset.mimeType) };
}

async function persist(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, 'place-photos');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
    const dest = new File(dir, `${Date.now()}.${ext}`);
    new File(uri).copy(dest);
    return dest.uri;
  } catch {
    // 복사에 실패해도 원본 경로로 계속 쓸 수 있다
    return uri;
  }
}

export function deletePhoto(uri: string): void {
  if (Platform.OS === 'web') return;
  try {
    const f = new File(uri);
    if (f.exists && uri.includes('place-photos')) f.delete();
  } catch {
    // 이미 지워진 파일이면 무시
  }
}
