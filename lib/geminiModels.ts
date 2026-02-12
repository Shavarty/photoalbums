// Models configuration with pricing
// Gemini: https://ai.google.dev/gemini-api/docs/pricing
// fal.ai: https://fal.ai/models

export type ModelProvider = 'gemini' | 'fal' | 'openai';

export interface GeminiModelConfig {
  id: string;
  name: string;
  description: string;
  provider: ModelProvider;
  falModelPath?: string;      // для fal.ai моделей
  falInputStyle?: 'single' | 'array'; // 'single' = image_url, 'array' = image_urls[]
  openaiQuality?: 'low' | 'medium' | 'high'; // для OpenAI моделей
  pricing: {
    textInput: number;      // $ per 1M tokens (для Gemini)
    imageOutput: number;    // $ per 1M tokens (для Gemini)
    avgImageTokens: number; // среднее токенов на изображение
    avgImageCost: number;   // средняя стоимость $ за изображение
  };
}

export const GEMINI_MODELS: Record<string, GeminiModelConfig> = {
  "gemini-2.5-flash-image": {
    id: "gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash Image",
    description: "Быстрая и экономичная модель для стилизации (рекомендуется для тестов)",
    provider: 'gemini',
    pricing: {
      textInput: 0.15,
      imageOutput: 30.00,
      avgImageTokens: 1290,
      avgImageCost: 0.039,
    },
  },
  "gemini-3-pro-image-preview": {
    id: "gemini-3-pro-image-preview",
    name: "Gemini 3 Pro Image Preview",
    description: "Продвинутая модель с лучшим качеством (дороже в 3.4 раза)",
    provider: 'gemini',
    pricing: {
      textInput: 2.00,
      imageOutput: 120.00,
      avgImageTokens: 1120,
      avgImageCost: 0.134,
    },
  },
  "seedream-4.5": {
    id: "seedream-4.5",
    name: "Seedream 4.5 (ByteDance)",
    description: "Специализируется на manga/anime стиле, до 4K, дешевле Gemini 3 Pro — тест",
    provider: 'fal',
    falModelPath: 'fal-ai/bytedance/seedream/v4.5/edit',
    falInputStyle: 'array',
    pricing: {
      textInput: 0,
      imageOutput: 0,
      avgImageTokens: 0,
      avgImageCost: 0.04,
    },
  },
  "flux-kontext-pro": {
    id: "flux-kontext-pro",
    name: "FLUX.1 Kontext Pro",
    description: "Точное редактирование и стилизация от Black Forest Labs, ~$0.055/MP",
    provider: 'fal',
    falModelPath: 'fal-ai/flux-pro/kontext',
    falInputStyle: 'single',
    pricing: {
      textInput: 0,
      imageOutput: 0,
      avgImageTokens: 0,
      avgImageCost: 0.04,
    },
  },
  "gpt-image-1.5": {
    id: "gpt-image-1.5",
    name: "GPT Image 1.5 (OpenAI)",
    description: "Лучшее сохранение черт лица при стилизации, ~$0.034/img (medium)",
    provider: 'openai',
    openaiQuality: 'medium',
    pricing: {
      textInput: 0,
      imageOutput: 0,
      avgImageTokens: 0,
      avgImageCost: 0.034,
    },
  },
};

export const DEFAULT_MODEL = "gemini-3-pro-image-preview";

export function getModelConfig(modelId: string): GeminiModelConfig {
  return GEMINI_MODELS[modelId] || GEMINI_MODELS[DEFAULT_MODEL];
}
