// Claude 연동: 기구 사진 인식 + AI 코치 질문.
// API 키는 사용자가 설정 화면에서 입력하며 기기의 보안 저장소에만 보관한다.

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as z from 'zod/v4';

import { EQUIPMENT } from '@/data/equipment';

const MODEL = 'claude-opus-5-5';
const KEY_NAME = 'anthropic_api_key';

// 웹에는 SecureStore가 없어 AsyncStorage(브라우저 저장소)를 쓴다
export async function getApiKey(): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(KEY_NAME);
  return SecureStore.getItemAsync(KEY_NAME);
}

export async function setApiKey(key: string): Promise<void> {
  if (Platform.OS === 'web') return AsyncStorage.setItem(KEY_NAME, key.trim());
  return SecureStore.setItemAsync(KEY_NAME, key.trim());
}

export async function clearApiKey(): Promise<void> {
  if (Platform.OS === 'web') return AsyncStorage.removeItem(KEY_NAME);
  return SecureStore.deleteItemAsync(KEY_NAME);
}

export class AiError extends Error {}

async function client(): Promise<Anthropic> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new AiError('설정에서 Claude API 키를 먼저 입력해 주세요.');
  // 개인용 앱이라 기기에서 직접 호출한다(키는 사용자 본인 것)
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

function friendlyError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof Anthropic.AuthenticationError) return new AiError('API 키가 올바르지 않아요. 설정에서 다시 확인해 주세요.');
  if (err instanceof Anthropic.RateLimitError) return new AiError('요청이 많아 잠시 막혔어요. 조금 뒤 다시 시도해 주세요.');
  if (err instanceof Anthropic.APIConnectionError) return new AiError('인터넷 연결을 확인해 주세요.');
  if (err instanceof Anthropic.APIError) return new AiError(`AI 요청 실패 (${err.status ?? '알 수 없음'}): ${err.message}`);
  return new AiError(err instanceof Error ? err.message : 'AI 요청 중 오류가 발생했어요.');
}

const equipmentIds = EQUIPMENT.map((e) => e.id) as [string, ...string[]];

const RecognitionSchema = z.object({
  items: z.array(
    z.object({
      equipmentId: z.enum(equipmentIds),
      confidence: z.enum(['high', 'medium', 'low']),
      maxWeightKg: z.number().nullable().describe('사진에서 읽을 수 있는 최대 무게(덤벨 랙 최댓값, 웨이트 스택 최댓값 등). 모르면 null'),
      note: z.string().describe('한국어로 짧게: 무엇을 보고 판단했는지, 세팅 관련 특이사항'),
    }),
  ),
  unknown: z.array(z.string()).describe('카탈로그에 없지만 사진에 보이는 기구(한국어)'),
  summary: z.string().describe('한국어 한두 문장 요약'),
});

export type Recognition = z.infer<typeof RecognitionSchema>;

const CATALOG = EQUIPMENT.map((e) => `- ${e.id}: ${e.name} (${e.hint})`).join('\n');

export async function recognizeEquipment(base64: string, mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'): Promise<Recognition> {
  try {
    const c = await client();
    const response = await c.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(RecognitionSchema) },
      system:
        '당신은 헬스장 기구를 알아보는 전문 트레이너입니다. 사진에 실제로 보이는 운동기구만 아래 카탈로그 id로 골라 주세요. ' +
        '아파트 커뮤니티 헬스장, 야외 철봉·평행봉, 학교 운동장 기구 사진도 들어옵니다. 확실하지 않으면 confidence를 low로 하세요.\n\n' +
        `카탈로그:\n${CATALOG}`,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: '이 사진에 있는 운동기구를 알려 주세요.' },
          ],
        },
      ],
    });
    if (response.stop_reason === 'refusal') throw new AiError('이 사진은 분석할 수 없어요. 다른 사진으로 시도해 주세요.');
    if (!response.parsed_output) throw new AiError('AI 응답을 해석하지 못했어요. 다시 시도해 주세요.');
    return response.parsed_output;
  } catch (err) {
    throw friendlyError(err);
  }
}

export async function askCoach(question: string, context: string): Promise<string> {
  try {
    const c = await client();
    const response = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system:
        '당신은 사용자의 개인 헬스케어 트레이너입니다. 한국어로, 친근하지만 근거 있게 답하세요. ' +
        '아래 사용자 정보와 루틴을 바탕으로 구체적인 숫자(세트·반복·무게·시간·양)를 들어 조언하세요. ' +
        '통증이나 질환이 의심되면 운동을 멈추고 전문의 상담을 권하세요. 답변은 모바일 화면에서 읽기 좋게 짧은 문단과 목록으로.\n\n' +
        `사용자 정보:\n${context}`,
      messages: [{ role: 'user', content: question }],
    });
    if (response.stop_reason === 'refusal') return '이 질문에는 답하기 어려워요. 질문을 조금 바꿔 다시 물어봐 주세요.';
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim();
    return text || '답변을 받지 못했어요. 다시 시도해 주세요.';
  } catch (err) {
    throw friendlyError(err);
  }
}
