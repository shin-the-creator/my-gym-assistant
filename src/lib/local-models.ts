// 폰 안에서 돌리는 AI 모델 목록(Gemma 3, GGUF 4비트 양자화)
// 같은 파일을 올려 둔 공개 저장소가 여러 곳이라, 한 곳이 막히면 다음 주소로 받는다.

export interface LocalModel {
  id: 'gemma3-1b' | 'gemma3-4b';
  name: string;
  summary: string;
  file: string;
  /** 대략적인 내려받기 크기(MB) */
  sizeMB: number;
  /** 이만큼의 메모리(GB)가 있으면 무리 없이 돈다 */
  minRamGB: number;
  urls: string[];
}

const hf = (repo: string, file: string) => `https://huggingface.co/${repo}/resolve/main/${file}?download=true`;

export const LOCAL_MODELS: LocalModel[] = [
  {
    id: 'gemma3-1b',
    name: 'Gemma 3 1B · 가벼움',
    summary: '대부분의 폰에서 빠르게 답해요. 답이 짧고 단순할 수 있어요.',
    file: 'gemma-3-1b-it-Q4_K_M.gguf',
    sizeMB: 810,
    minRamGB: 4,
    urls: [hf('ggml-org/gemma-3-1b-it-GGUF', 'gemma-3-1b-it-Q4_K_M.gguf'), hf('unsloth/gemma-3-1b-it-GGUF', 'gemma-3-1b-it-Q4_K_M.gguf')],
  },
  {
    id: 'gemma3-4b',
    name: 'Gemma 3 4B · 더 똑똑함',
    summary: '한국어와 운동·식단 지식이 훨씬 나아요. 메모리 8GB 이상 폰을 권장해요.',
    file: 'gemma-3-4b-it-Q4_K_M.gguf',
    sizeMB: 2490,
    minRamGB: 7.5,
    urls: [hf('ggml-org/gemma-3-4b-it-GGUF', 'gemma-3-4b-it-Q4_K_M.gguf'), hf('unsloth/gemma-3-4b-it-GGUF', 'gemma-3-4b-it-Q4_K_M.gguf')],
  },
];

export function getLocalModel(id?: string): LocalModel | undefined {
  return LOCAL_MODELS.find((m) => m.id === id);
}

/** 폰 메모리(바이트)로 추천 모델을 고른다. 모르면 가벼운 모델 */
export function recommendModel(totalMemoryBytes: number | null): LocalModel {
  const gb = totalMemoryBytes ? totalMemoryBytes / 1024 ** 3 : 0;
  return LOCAL_MODELS.filter((m) => gb >= m.minRamGB).pop() ?? LOCAL_MODELS[0];
}

/** 받은 파일이 정상 모델인지(로그인 페이지·오류 페이지가 아닌지) 크기로 확인 */
export function looksComplete(model: LocalModel, bytes: number): boolean {
  return bytes >= model.sizeMB * 1024 * 1024 * 0.85;
}

/** 작은 모델에 맞춘 짧은 시스템 지시 */
export function localCoachSystemPrompt(context: string): string {
  return [
    '너는 사용자의 개인 헬스 트레이너야. 반드시 한국어로, 짧고 친절하게 답해.',
    '아래 사용자 정보를 참고해서 세트·횟수·시간·양 같은 구체적인 숫자로 조언해.',
    '모르는 것은 모른다고 말해. 통증이나 질환이 의심되면 운동을 멈추고 병원에 가라고 안내해.',
    '목록은 "-"로 시작하고, 5줄 안팎으로 답해.',
    '',
    `[사용자 정보]\n${context}`,
  ].join('\n');
}
