/* eslint-disable @typescript-eslint/no-require-imports, import/first -- jest.mock은 import보다 먼저 실행되어야 한다 */
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => 'test-key'),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { askCoach, recognizeEquipment } from '../ai';

type Call = { url: string; init: RequestInit };

function mockFetch(handler: (url: string, body: any) => { status: number; json: unknown }) {
  const calls: Call[] = [];
  globalThis.fetch = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const { status, json } = handler(url, init.body ? JSON.parse(String(init.body)) : undefined);
    return { ok: status < 400, status, json: async () => json } as Response;
  }) as unknown as typeof fetch;
  return calls;
}

const MODELS = {
  models: [
    { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
  ],
};

const answer = (text: string) => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });

describe('Gemini client', () => {
  it('sends the photo with a JSON schema to the preferred model', async () => {
    const calls = mockFetch((url) => {
      if (url.includes('/models?')) return { status: 200, json: MODELS };
      return { status: 200, json: answer(JSON.stringify({ items: [{ equipmentId: 'pullup_bar', confidence: 'high', note: '철봉' }], unknown: [], summary: '철봉' })) };
    });
    const r = await recognizeEquipment('BASE64', 'image/jpeg');
    expect(r.items[0].equipmentId).toBe('pullup_bar');

    const gen = calls.find((c) => c.url.includes(':generateContent'))!;
    expect(gen.url).toContain('models/gemini-3.5-flash-lite:generateContent');
    expect((gen.init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key');
    const body = JSON.parse(String(gen.init.body));
    expect(body.contents[0].parts[0].inlineData).toEqual({ mimeType: 'image/jpeg', data: 'BASE64' });
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseJsonSchema.properties.items).toBeDefined();
    expect(body.systemInstruction.parts[0].text).toContain('pullup_bar');
  });

  it('falls back to the next model when the free quota is used up', async () => {
    const calls = mockFetch((url) => {
      if (url.includes('/models?')) return { status: 200, json: MODELS };
      if (url.includes('flash-lite')) return { status: 429, json: { error: { message: 'quota', status: 'RESOURCE_EXHAUSTED' } } };
      return { status: 200, json: answer('스쿼트 대신 불가리안 스플릿 스쿼트를 하세요.') };
    });
    const text = await askCoach('무릎이 아파요', '- 남성 31세');
    expect(text).toContain('불가리안');
    expect(calls.filter((c) => c.url.includes(':generateContent')).map((c) => c.url.match(/models\/([^:]+)/)![1])).toEqual([
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
    ]);
  });

  it('explains an invalid key in Korean', async () => {
    mockFetch(() => ({ status: 400, json: { error: { message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } } }));
    await expect(askCoach('안녕', '')).rejects.toThrow('API 키가 올바르지 않아요');
  });
});
