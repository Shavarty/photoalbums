"use client";

import { TokenUsage } from "@/lib/types";
import { calculateTokenCost, formatCost } from "@/lib/tokenCost";
import { getModelConfig } from "@/lib/geminiModels";

interface TokenSummaryProps {
  photos: Array<{ tokens?: TokenUsage }>;
}

export default function TokenSummary({ photos }: TokenSummaryProps) {
  // Фильтруем фото со стилизацией
  const stylizedPhotos = photos.filter((photo) => photo.tokens);

  if (stylizedPhotos.length === 0) {
    return null; // Не показываем если нет стилизованных фото
  }

  // Подсчитываем итоги
  let totalPromptTokens = 0;
  let totalCandidatesTokens = 0;
  let totalTokens = 0;

  const photoCosts = stylizedPhotos.map((photo, idx) => {
    const tokens = photo.tokens!;
    totalPromptTokens += tokens.promptTokens;
    totalCandidatesTokens += tokens.candidatesTokens;
    totalTokens += tokens.totalTokens;

    const cost = calculateTokenCost(
      tokens.promptTokens,
      tokens.candidatesTokens,
      tokens.modelId
    );

    return {
      index: idx + 1,
      tokens,
      cost,
    };
  });

  // Используем modelId первого фото для общего итога
  const totalCost = calculateTokenCost(
    totalPromptTokens,
    totalCandidatesTokens,
    stylizedPhotos[0]?.tokens?.modelId
  );

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
      <div className="font-medium text-gray-700 mb-2">
        AI Стилизация (Gemini 3 Pro):
      </div>

      <div className="space-y-1.5">
        {photoCosts.map((item) => (
          <div key={item.index} className="space-y-0.5">
            <div className="flex justify-between items-center font-medium">
              <span>Кадр {item.index}:</span>
              <span className="font-mono text-purple-600">
                {formatCost(item.cost.totalCost)}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 pl-2">
              <span>Вход: {item.tokens.promptTokens.toLocaleString()} токенов ({formatCost(item.cost.inputCost)})</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 pl-2">
              <span>Выход: {item.tokens.candidatesTokens.toLocaleString()} токенов ({formatCost(item.cost.outputCost)})</span>
            </div>
          </div>
        ))}

        {photoCosts.length > 1 && (
          <div className="pt-2 border-t border-gray-300">
            <div className="flex justify-between items-center font-medium text-gray-800">
              <span>Итого:</span>
              <span className="font-mono text-purple-700">
                {formatCost(totalCost.totalCost)}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 pl-2 mt-0.5">
              <span>Вход: {totalPromptTokens.toLocaleString()} токенов ({formatCost(totalCost.inputCost)})</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 pl-2">
              <span>Выход: {totalCandidatesTokens.toLocaleString()} токенов ({formatCost(totalCost.outputCost)})</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-500">
        {(() => {
          const firstPhoto = stylizedPhotos[0];
          if (!firstPhoto?.tokens?.modelId) return null;

          const model = getModelConfig(firstPhoto.tokens.modelId);
          return (
            <>
              <div>
                <span className="font-medium">{model.name}</span>: текст вход ${model.pricing.textInput}/1M, изображение выход ${model.pricing.imageOutput}/1M токенов
              </div>
              <div className="text-[9px] text-gray-400 mt-0.5">
                В среднем {model.pricing.avgImageTokens} токенов ≈ ${model.pricing.avgImageCost} за фото
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
