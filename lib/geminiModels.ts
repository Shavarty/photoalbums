// Gemini models configuration with official pricing
// Source: https://ai.google.dev/gemini-api/docs/pricing

export interface GeminiModelConfig {
  id: string;
  name: string;
  description: string;
  pricing: {
    textInput: number;      // $ per 1M tokens
    imageOutput: number;    // $ per 1M tokens
    avgImageTokens: number; // average tokens per image
    avgImageCost: number;   // average $ per image
  };
}

export const GEMINI_MODELS: Record<string, GeminiModelConfig> = {
  "gemini-2.5-flash-image": {
    id: "gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash Image",
    description: "Быстрая и экономичная модель для стилизации (рекомендуется для тестов)",
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
    pricing: {
      textInput: 2.00,
      imageOutput: 120.00,
      avgImageTokens: 1120,
      avgImageCost: 0.134,
    },
  },
};

export const DEFAULT_MODEL = "gemini-3-pro-image-preview";

export function getModelConfig(modelId: string): GeminiModelConfig {
  return GEMINI_MODELS[modelId] || GEMINI_MODELS[DEFAULT_MODEL];
}
