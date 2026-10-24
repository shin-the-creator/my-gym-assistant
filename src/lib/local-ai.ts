// 폰 안에서 Gemma 3를 실행한다(llama.rn). 키·계정·인터넷 없이 동작하고, 대화는 폰 밖으로 나가지 않는다.
// 모델 파일은 처음 한 번 내려받아 앱 폴더에 저장한다.

import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system/legacy';
import type { LlamaContext } from 'llama.rn';
import { Platform } from 'react-native';

import { type LocalModel, localCoachSystemPrompt, looksComplete } from './local-models';

export class LocalAiError extends Error {}

const DIR = `${FileSystem.documentDirectory ?? ''}models/`;

export const localAiSupported = Platform.OS === 'android' || Platform.OS === 'ios';
export const deviceMemory = Device.totalMemory;

export function modelPath(model: LocalModel): string {
  return `${DIR}${model.file}`;
}

export async function isInstalled(model: LocalModel): Promise<boolean> {
  if (!localAiSupported) return false;
  const info = await FileSystem.getInfoAsync(modelPath(model));
  return info.exists && !info.isDirectory && looksComplete(model, info.size ?? 0);
}

let download: FileSystem.DownloadResumable | null = null;
let cancelled = false;

/** 모델 내려받기. progress는 0~1. 주소가 막히면 다음 주소로 */
export async function downloadModel(model: LocalModel, onProgress: (p: number) => void): Promise<void> {
  if (!localAiSupported) throw new LocalAiError('이 기기에서는 쓸 수 없어요.');
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
  const free = await FileSystem.getFreeDiskStorageAsync().catch(() => Number.MAX_SAFE_INTEGER);
  if (free < model.sizeMB * 1024 * 1024 * 1.2) {
    throw new LocalAiError(`저장 공간이 부족해요. 약 ${Math.ceil((model.sizeMB * 1.2) / 100) / 10}GB가 필요해요.`);
  }

  const temp = `${modelPath(model)}.part`;
  cancelled = false;
  let lastError = '모델 파일을 받지 못했어요.';
  for (const url of model.urls) {
    await FileSystem.deleteAsync(temp, { idempotent: true });
    download = FileSystem.createDownloadResumable(url, temp, {}, ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      const total = totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : model.sizeMB * 1024 * 1024;
      onProgress(Math.min(1, totalBytesWritten / total));
    });
    try {
      const result = await download.downloadAsync();
      if (cancelled) throw new LocalAiError('내려받기를 취소했어요.');
      const info = await FileSystem.getInfoAsync(temp);
      if (result && result.status === 200 && info.exists && looksComplete(model, info.size ?? 0)) {
        await FileSystem.deleteAsync(modelPath(model), { idempotent: true });
        await FileSystem.moveAsync({ from: temp, to: modelPath(model) });
        onProgress(1);
        return;
      }
      lastError = `내려받기 실패 (${result?.status ?? '응답 없음'})`;
    } catch (e) {
      if (cancelled || e instanceof LocalAiError) throw e instanceof LocalAiError ? e : new LocalAiError('내려받기를 취소했어요.');
      lastError = '인터넷 연결을 확인해 주세요.';
    } finally {
      download = null;
    }
  }
  await FileSystem.deleteAsync(temp, { idempotent: true });
  throw new LocalAiError(lastError);
}

export async function cancelDownload(): Promise<void> {
  cancelled = true;
  await download?.pauseAsync().catch(() => {});
}

export async function deleteModel(model: LocalModel): Promise<void> {
  if (loaded?.id === model.id) await releaseLocal();
  await FileSystem.deleteAsync(modelPath(model), { idempotent: true });
}

let loaded: { id: string; context: LlamaContext } | null = null;

async function getContext(model: LocalModel, onLoading?: (p: number) => void): Promise<LlamaContext> {
  if (loaded?.id === model.id) return loaded.context;
  await releaseLocal();
  if (!(await isInstalled(model))) throw new LocalAiError('먼저 AI 모델을 내려받아 주세요.');
  // 네이티브 모듈은 폰에서만 불러온다(웹 빌드에서 깨지지 않게)
  const { initLlama } = await import('llama.rn');
  const context = await initLlama(
    {
      model: modelPath(model),
      n_ctx: 4096,
      // 안정성을 위해 CPU로만 돌린다(일부 기기의 GPU 가속은 불안정)
      n_gpu_layers: 0,
      use_mlock: false,
    },
    (p) => onLoading?.(p / 100),
  );
  loaded = { id: model.id, context };
  return context;
}

export async function releaseLocal(): Promise<void> {
  const ctx = loaded?.context;
  loaded = null;
  await ctx?.release().catch(() => {});
}

export async function stopLocal(): Promise<void> {
  await loaded?.context.stopCompletion().catch(() => {});
}

/** 폰 안의 Gemma에게 묻는다. onToken으로 글자가 생기는 대로 받는다 */
export async function askLocalCoach(
  model: LocalModel,
  question: string,
  context: string,
  onToken: (textSoFar: string) => void,
  onLoading?: (p: number) => void,
): Promise<string> {
  const llama = await getContext(model, onLoading);
  let text = '';
  try {
    const result = await llama.completion(
      {
        messages: [
          { role: 'system', content: localCoachSystemPrompt(context) },
          { role: 'user', content: question },
        ],
        n_predict: 600,
        temperature: 0.6,
        top_p: 0.9,
        stop: ['<end_of_turn>', '<eos>'],
      },
      (data) => {
        text += data.token;
        onToken(text);
      },
    );
    return (result.text || text).trim();
  } catch (e) {
    throw new LocalAiError(e instanceof Error ? `AI 실행 중 오류: ${e.message}` : 'AI 실행 중 오류가 났어요.');
  }
}
