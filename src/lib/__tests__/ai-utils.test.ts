import { extractJson, parseRecognition, rankModels } from '../ai-utils';

const gen = ['generateContent'];

describe('rankModels', () => {
  it('prefers the newest stable Flash-Lite, then Flash, then large Gemma', () => {
    const ranked = rankModels([
      { name: 'models/gemini-3.8-flash', supportedGenerationMethods: gen },
      { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: gen },
      { name: 'models/gemini-3.1-flash-lite', supportedGenerationMethods: gen },
      { name: 'models/gemini-3.6-flash-lite-preview', supportedGenerationMethods: gen },
      { name: 'models/gemma-4-31b-it', supportedGenerationMethods: gen },
      { name: 'models/gemma-3-1b-it', supportedGenerationMethods: gen },
      { name: 'models/gemini-4-argon', supportedGenerationMethods: gen },
    ]);
    expect(ranked).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash-lite-preview', 'gemini-3.8-flash', 'gemma-4-31b-it']);
  });

  it('skips image, speech, embedding and non-generating models', () => {
    const ranked = rankModels([
      { name: 'models/gemini-3.1-flash-image-preview', supportedGenerationMethods: gen },
      { name: 'models/gemini-3.8-flash-tts', supportedGenerationMethods: gen },
      { name: 'models/gemini-embedding-2', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['countTokens'] },
    ]);
    expect(ranked).toEqual([]);
  });
});

describe('extractJson', () => {
  it('reads plain and fenced JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('결과입니다\n```json\n{"a": [1, 2]}\n```')).toEqual({ a: [1, 2] });
  });

  it('throws when there is no JSON', () => {
    expect(() => extractJson('죄송해요')).toThrow();
  });
});

describe('parseRecognition', () => {
  it('keeps catalog equipment once and tolerates missing fields', () => {
    const r = parseRecognition(
      JSON.stringify({
        items: [
          { equipmentId: 'dumbbell', confidence: 'high', maxWeightKg: 24, note: '랙 끝에 24kg' },
          { equipmentId: 'dumbbell', confidence: 'low', note: '중복' },
          { equipmentId: 'spaceship', confidence: 'high', note: '없는 기구' },
          { equipmentId: 'pullup_bar', confidence: 'weird' },
        ],
        summary: '덤벨과 철봉',
      }),
    );
    expect(r.items.map((i) => i.equipmentId)).toEqual(['dumbbell', 'pullup_bar']);
    expect(r.items[0].maxWeightKg).toBe(24);
    expect(r.items[1].confidence).toBe('low');
    expect(r.unknown).toEqual([]);
  });
});
