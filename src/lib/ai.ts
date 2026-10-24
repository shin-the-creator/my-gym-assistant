// AI 연동(무료): Google AI Studio의 Gemini API로 기구 사진 인식 + AI 코치 질문.
// 키는 aistudio.google.com 에서 무료로 발급하고, 기기의 보안 저장소에만 보관한다.
// 무료 등급은 모델별로 하루 요청 수가 정해져 있어서, 쓸 수 있는 모델을 조회한 뒤
// 하루 한도가 넉넉한 Flash-Lite부터 쓰고 한도에 걸리면 다음 모델로 넘어간다.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { CATALOG, type ModelInfo, RECOGNITION_JSON_SCHEMA, type Recognition, parseRecognition, rankModels } from './ai-utils';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const KEY_NAME = 'gemini_api_key';

// 모델 목록을 못 불러올 때 시도할 기본 후보(앞쪽일수록 우선)
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];

// 웹에는 SecureStore가 없어 AsyncStorage(브라우저 저장소)를 쓴다
export async function getApiKey(): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(KEY_NAME);
  return SecureStore.getItemAsync(KEY_NAME);
}

export async function setApiKey(key: string): Promise<void> {
  cachedModels = null;
  if (Platform.OS === 'web') return AsyncStorage.setItem(KEY_NAME, key.trim());
  return SecureStore.setItemAsync(KEY_NAME, key.trim());
}

export async function clearApiKey(): Promise<void> {
  cachedModels = null;
  if (Platform.OS === 'web') return AsyncStorage.removeItem(KEY_NAME);
  return SecureStore.deleteItemAsync(KEY_NAME);
}

export class AiError extends Error {}

export type { Recognition };

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

let cachedModels: string[] | null = null;

async function request<T>(path: string, apiKey: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AiError('인터넷 연결을 확인해 주세요.');
  }
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string; status?: string } } & T;
  if (!res.ok) throw new HttpError(res.status, json.error?.message ?? json.error?.status ?? `HTTP ${res.status}`);
  return json;
}

async function models(apiKey: string): Promise<string[]> {
  if (cachedModels) return cachedModels;
  try {
    const list = await request<{ models?: ModelInfo[] }>('models?pageSize=1000', apiKey);
    const ranked = rankModels(list.models ?? []);
    cachedModels = ranked.length ? ranked : FALLBACK_MODELS;
  } catch (e) {
    if (e instanceof HttpError && (e.status === 400 || e.status === 401 || e.status === 403)) throw friendly(e);
    return FALLBACK_MODELS;
  }
  return cachedModels;
}

function friendly(e: unknown): AiError {
  if (e instanceof AiError) return e;
  if (e instanceof HttpError) {
    if (e.status === 400 && /api key/i.test(e.message)) return new AiError('API 키가 올바르지 않아요. 설정에서 다시 확인해 주세요.');
    if (e.status === 401 || e.status === 403) return new AiError('API 키가 올바르지 않거나 권한이 없어요. 설정에서 다시 확인해 주세요.');
    if (e.status === 429) return new AiError('오늘 무료 사용량을 다 썼어요. 내일 다시 시도하거나, 기구를 직접 체크해 주세요.');
    return new AiError(`AI 요청 실패 (${e.status}): ${e.message}`);
  }
  return new AiError(e instanceof Error ? e.message : 'AI 요청 중 오류가 발생했어요.');
}

interface Part {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GenerateResponse {
  candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

/** 후보 모델을 차례로 시도한다. 한도 초과(429)나 없는 모델(404)이면 다음 모델로 */
async function generate(system: string, parts: Part[], json?: object): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new AiError('설정에서 무료 Gemini API 키를 먼저 입력해 주세요.');
  const candidates = await models(apiKey);
  let lastError: unknown = null;

  for (const model of candidates.slice(0, 5)) {
    const isGemma = model.startsWith('gemma');
    const body = {
      // Gemma는 시스템 지시를 따로 받지 않아 사용자 메시지 앞에 붙인다
      ...(isGemma ? {} : { systemInstruction: { parts: [{ text: system }] } }),
      contents: [{ role: 'user', parts: isGemma ? [{ text: system }, ...parts] : parts }],
      generationConfig: json && !isGemma ? { responseMimeType: 'application/json', responseJsonSchema: json } : {},
    };
    try {
      const res = await request<GenerateResponse>(`models/${model}:generateContent`, apiKey, body);
      if (res.promptFeedback?.blockReason) throw new AiError('이 요청은 처리할 수 없어요. 다른 사진이나 질문으로 시도해 주세요.');
      const cand = res.candidates?.[0];
      const text = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
      if (!text) throw new AiError(cand?.finishReason === 'SAFETY' ? '이 요청은 처리할 수 없어요.' : 'AI가 답을 주지 않았어요. 다시 시도해 주세요.');
      return text;
    } catch (e) {
      lastError = e;
      if (e instanceof HttpError && (e.status === 429 || e.status === 404 || e.status >= 500)) {
        if (e.status === 404 && cachedModels) cachedModels = cachedModels.filter((m) => m !== model);
        continue;
      }
      throw friendly(e);
    }
  }
  throw friendly(lastError);
}

/** 모델이 코드블록 등으로 감싼 JSON도 꺼낸다 */
export async function recognizeEquipment(base64: string, mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'): Promise<Recognition> {
  const system =
    '당신은 헬스장 기구를 알아보는 전문 트레이너입니다. 사진에 실제로 보이는 운동기구만 아래 카탈로그 id로 골라 주세요. ' +
    '아파트 커뮤니티 헬스장, 야외 철봉·평행봉, 학교 운동장 기구 사진도 들어옵니다. 확실하지 않으면 confidence를 low로 하세요. ' +
    '반드시 {"items":[{"equipmentId","confidence","maxWeightKg","note"}],"unknown":[],"summary":""} 형태의 JSON만 답하세요.\n\n' +
    `카탈로그:\n${CATALOG}`;
  const text = await generate(system, [{ inlineData: { mimeType: mediaType, data: base64 } }, { text: '이 사진에 있는 운동기구를 알려 주세요.' }], RECOGNITION_JSON_SCHEMA);
  try {
    return parseRecognition(text);
  } catch {
    throw new AiError('AI 응답을 해석하지 못했어요. 다시 시도해 주세요.');
  }
}

export async function askCoach(question: string, context: string): Promise<string> {
  const system =
    '당신은 사용자의 개인 헬스케어 트레이너입니다. 한국어로, 친근하지만 근거 있게 답하세요. ' +
    '아래 사용자 정보와 루틴을 바탕으로 구체적인 숫자(세트·반복·무게·시간·양)를 들어 조언하세요. ' +
    '통증이나 질환이 의심되면 운동을 멈추고 전문의 상담을 권하세요. 모바일 화면에서 읽기 좋게 짧은 문단과 목록으로 답하고, 마크다운 기호(#, **)는 쓰지 마세요.\n\n' +
    `사용자 정보:\n${context}`;
  return generate(system, [{ text: question }]);
}
