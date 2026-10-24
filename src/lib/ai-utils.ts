// AI 응답 처리용 순수 함수(모델 고르기, JSON 꺼내기, 기구 인식 결과 검증)

import * as z from 'zod/v4';

import { EQUIPMENT } from '@/data/equipment';

export class AiParseError extends Error {}

export interface ModelInfo {
  name: string; // "models/gemini-..."
  supportedGenerationMethods?: string[];
}

/** 버전 숫자(3.5 → 3.5)를 뽑아 최신 모델을 앞에 둔다 */
function version(id: string): number {
  const m = id.match(/(?:gemini|gemma)-(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * 사진 인식·대화에 쓸 수 있는 모델을 무료 한도가 큰 순서로 고른다.
 * 1) Gemini Flash-Lite  2) Gemini Flash  3) Gemma(이미지 입력 가능한 큰 모델)
 * 이미지 생성·음성·임베딩·실시간 전용 모델은 뺀다.
 */
export function rankModels(models: ModelInfo[]): string[] {
  const ids = models
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((id) => !/(image|tts|audio|embedding|live|robotics|computer-use|banana|veo|imagen|thinking|exp)/.test(id));
  const tier = (id: string) => {
    if (/^gemini-.*flash-lite/.test(id)) return 0;
    if (/^gemini-.*flash/.test(id)) return 1;
    if (/^gemma-\d.*-(2[6-9]|3\d)b/.test(id)) return 2;
    return 9;
  };
  return ids
    .filter((id) => tier(id) < 9)
    .sort((a, b) => {
      const preview = (id: string) => (/preview/.test(id) ? 1 : 0);
      return tier(a) - tier(b) || preview(a) - preview(b) || version(b) - version(a) || a.localeCompare(b);
    });
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < start) throw new AiParseError('JSON을 찾지 못했어요');
  return JSON.parse(raw.slice(start, end + 1));
}

const equipmentIds = EQUIPMENT.map((e) => e.id) as [string, ...string[]];

const RecognitionSchema = z.object({
  items: z
    .array(
      z.object({
        equipmentId: z.string(),
        confidence: z.enum(['high', 'medium', 'low']).catch('low'),
        maxWeightKg: z.number().nullable().optional(),
        note: z.string().catch(''),
      }),
    )
    .catch([]),
  unknown: z.array(z.string()).catch([]),
  summary: z.string().catch(''),
});

export type Recognition = {
  items: { equipmentId: string; confidence: 'high' | 'medium' | 'low'; maxWeightKg?: number | null; note: string }[];
  unknown: string[];
  summary: string;
};

// Gemini 구조화 출력용 JSON 스키마(응답 모양을 강제한다)
export const RECOGNITION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          equipmentId: { type: 'string', enum: equipmentIds },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          maxWeightKg: { type: 'number', description: '사진에서 읽을 수 있는 최대 무게(kg). 모르면 생략' },
          note: { type: 'string', description: '한국어로 짧게: 무엇을 보고 판단했는지, 세팅 특이사항' },
        },
        required: ['equipmentId', 'confidence', 'note'],
      },
    },
    unknown: { type: 'array', items: { type: 'string' }, description: '카탈로그에 없지만 보이는 기구(한국어)' },
    summary: { type: 'string', description: '한국어 한두 문장 요약' },
  },
  required: ['items', 'unknown', 'summary'],
};

export const CATALOG = EQUIPMENT.map((e) => `- ${e.id}: ${e.name} (${e.hint})`).join('\n');

export function parseRecognition(text: string): Recognition {
  const parsed = RecognitionSchema.parse(extractJson(text));
  const known = new Set<string>(equipmentIds);
  const seen = new Set<string>();
  return {
    ...parsed,
    // 카탈로그에 없는 id나 중복은 버린다
    items: parsed.items.filter((i) => known.has(i.equipmentId) && !seen.has(i.equipmentId) && seen.add(i.equipmentId)),
  };
}

const FoodSchema = z.object({
  foods: z
    .array(
      z.object({
        name: z.string(),
        amount: z.string().catch(''),
        kcal: z.number().catch(0),
        protein: z.number().catch(0),
        carbs: z.number().catch(0),
        fat: z.number().catch(0),
      }),
    )
    .catch([]),
  note: z.string().catch(''),
});

export type FoodAnalysis = z.infer<typeof FoodSchema>;

export const FOOD_JSON_SCHEMA = {
  type: 'object',
  properties: {
    foods: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '한국어 음식 이름' },
          amount: { type: 'string', description: '사진에서 추정한 양(예: 1공기, 200g)' },
          kcal: { type: 'number' },
          protein: { type: 'number', description: '단백질(g)' },
          carbs: { type: 'number', description: '탄수화물(g)' },
          fat: { type: 'number', description: '지방(g)' },
        },
        required: ['name', 'amount', 'kcal', 'protein', 'carbs', 'fat'],
      },
    },
    note: { type: 'string', description: '한국어 한 문장: 추정 근거나 주의점' },
  },
  required: ['foods', 'note'],
};

export function parseFoodAnalysis(text: string): FoodAnalysis {
  const parsed = FoodSchema.parse(extractJson(text));
  const clean = (n: number) => (Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : 0);
  return {
    note: parsed.note,
    foods: parsed.foods
      .filter((f) => f.name.trim())
      .map((f) => ({ ...f, name: f.name.trim(), kcal: Math.round(clean(f.kcal)), protein: clean(f.protein), carbs: clean(f.carbs), fat: clean(f.fat) })),
  };
}
