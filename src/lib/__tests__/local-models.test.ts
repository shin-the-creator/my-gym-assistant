import { LOCAL_MODELS, getLocalModel, localCoachSystemPrompt, looksComplete, recommendModel } from '../local-models';

const GB = 1024 ** 3;

describe('local Gemma models', () => {
  it('recommends the 4B model only on phones with enough memory', () => {
    expect(recommendModel(12 * GB).id).toBe('gemma3-4b');
    expect(recommendModel(8 * GB).id).toBe('gemma3-4b');
    expect(recommendModel(6 * GB).id).toBe('gemma3-1b');
    expect(recommendModel(null).id).toBe('gemma3-1b');
  });

  it('has a fallback download address for every model', () => {
    for (const m of LOCAL_MODELS) {
      expect(m.urls.length).toBeGreaterThanOrEqual(2);
      expect(m.urls.every((u) => u.startsWith('https://huggingface.co/') && u.includes(m.file))).toBe(true);
    }
    expect(getLocalModel('gemma3-1b')?.file).toBe('gemma-3-1b-it-Q4_K_M.gguf');
    expect(getLocalModel('nope')).toBeUndefined();
  });

  it('rejects truncated or error-page downloads by size', () => {
    const m = LOCAL_MODELS[0];
    expect(looksComplete(m, 1200)).toBe(false); // 로그인·오류 페이지
    expect(looksComplete(m, m.sizeMB * 1024 * 1024)).toBe(true);
  });

  it('puts the user context in a short Korean system prompt', () => {
    const p = localCoachSystemPrompt('- 남성 31세');
    expect(p).toContain('한국어');
    expect(p).toContain('- 남성 31세');
  });
});
