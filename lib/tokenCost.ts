// Gemini pricing - imports from geminiModels.ts
// Source: https://ai.google.dev/gemini-api/docs/pricing (updated 2026-01-26)
import { getModelConfig } from "./geminiModels";

export interface TokenCost {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export function calculateTokenCost(
  promptTokens: number,
  candidatesTokens: number,
  modelId?: string,
  costUsd?: number
): TokenCost {
  // fal.ai models use fixed pricing, not token-based
  if (costUsd !== undefined) {
    return { inputCost: 0, outputCost: costUsd, totalCost: costUsd };
  }

  const model = getModelConfig(modelId || "gemini-2.5-flash-image");

  // Входные токены (текст + изображение на входе)
  const inputCost = promptTokens * (model.pricing.textInput / 1_000_000);

  // Выходные токены (изображение на выходе)
  const outputCost = candidatesTokens * (model.pricing.imageOutput / 1_000_000);

  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
  };
}

export function formatCost(cost: number): string {
  // Всегда показываем в долларах с достаточным количеством знаков
  if (cost < 0.0001) {
    return `$${cost.toFixed(6)}`; // до 6 знаков для очень малых сумм
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`; // до 4 знаков для малых сумм
  }
  return `$${cost.toFixed(4)}`; // стандартно 4 знака
}
