"use client";

import { useState } from "react";
import { StylizeSettings } from "@/lib/types";
import { GEMINI_MODELS } from "@/lib/geminiModels";

interface ImageEditModalProps {
  imageUrl: string;
  onComplete: (newImageUrl: string) => void;
  onCancel: () => void;
  stylizeSettings: StylizeSettings;
  onUpdateStylizeSettings: (updates: Partial<StylizeSettings>) => void;
}

export default function ImageEditModal({
  imageUrl,
  onComplete,
  onCancel,
  stylizeSettings,
  onUpdateStylizeSettings,
}: ImageEditModalProps) {
  const [editPrompt, setEditPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(GEMINI_MODELS[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);

  const handleEdit = async () => {
    if (!editPrompt.trim()) {
      alert("Введите инструкции для редактирования");
      return;
    }

    setIsProcessing(true);

    try {
      // Конвертируем imageUrl в base64 для отправки в API
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();

      const base64Image = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          // Убираем data:image/...;base64, prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Отправляем на API для редактирования
      const apiResponse = await fetch("/api/stylize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Image,
          prompt: editPrompt, // Просто передаём инструкции редактирования
          modelId: selectedModel,
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || "Ошибка при редактировании");
      }

      const data = await apiResponse.json();

      if (!data.success || !data.stylizedUrl) {
        throw new Error("Не удалось получить отредактированное изображение");
      }

      // stylizedUrl уже в формате data:image/...;base64,...
      setEditedImageUrl(data.stylizedUrl);
      setIsProcessing(false);
    } catch (error: any) {
      console.error("Error editing image:", error);
      alert("Не удалось отредактировать изображение: " + error.message);
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (editedImageUrl) {
      onComplete(editedImageUrl);
    }
  };

  const handleRetry = () => {
    setEditedImageUrl(null);
    setEditPrompt("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3 md:p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-serif font-bold">
            {editedImageUrl ? "Результат редактирования" : "Редактирование изображения"}
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            {editedImageUrl
              ? "Сравните результат с оригиналом и выберите действие"
              : "Опишите, что вы хотите изменить в изображении"
            }
          </p>
        </div>

        {/* Content */}
        <div className="p-3 md:p-6 overflow-y-auto flex-grow">
          {editedImageUrl ? (
            // Сравнение: до и после
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Оригинал</p>
                <img src={imageUrl} alt="Original" className="w-full rounded-lg border-2 border-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Отредактированное</p>
                <img src={editedImageUrl} alt="Edited" className="w-full rounded-lg border-2 border-green-500" />
              </div>
            </div>
          ) : (
            // Форма редактирования
            <div className="space-y-4">
              {/* Превью текущего изображения */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Текущее изображение</p>
                <img src={imageUrl} alt="Current" className="w-full max-h-64 object-contain rounded-lg border border-gray-300" />
              </div>

              {/* Модель AI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Модель AI редактирования
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                >
                  {GEMINI_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} — ~${model.pricing.avgImageCost.toFixed(3)}/фото
                    </option>
                  ))}
                </select>
              </div>

              {/* Инструкции редактирования */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Что изменить в изображении?
                </label>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Например: убрать человека справа, изменить цвет неба на закатный, добавить больше деталей..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                  rows={4}
                  disabled={isProcessing}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="p-3 md:p-6 border-t border-gray-200 flex gap-2 md:gap-3 flex-shrink-0">
          {editedImageUrl ? (
            // Кнопки после редактирования
            <>
              <button
                onClick={handleRetry}
                className="flex-1 px-4 py-2.5 md:px-6 md:py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition text-sm md:text-base"
              >
                ↻ Редактировать ещё раз
              </button>
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 md:px-6 md:py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition text-sm md:text-base"
              >
                Отменить
              </button>
              <button
                onClick={handleApply}
                className="flex-1 px-4 py-2.5 md:px-6 md:py-3 btn-gradient text-white font-semibold rounded-lg transition text-sm md:text-base"
              >
                ✓ Применить
              </button>
            </>
          ) : (
            // Кнопки до редактирования
            <>
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 md:px-6 md:py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition text-sm md:text-base"
                disabled={isProcessing}
              >
                Отменить
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 px-4 py-2.5 md:px-6 md:py-3 btn-gradient text-white font-semibold rounded-lg transition text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isProcessing || !editPrompt.trim()}
              >
                {isProcessing ? "⏳ Редактирование..." : "✏️ Редактировать"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
