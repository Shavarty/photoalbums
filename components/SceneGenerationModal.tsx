"use client";

import { useState, useRef } from "react";
import { STYLE_PRESETS } from "@/lib/stylization";

const MAX_REFERENCES = 3;

export interface SceneResult {
  referenceImages: string[]; // array of base64 data URLs
  sceneDescription: string;
  stylePreset: string;
}

interface SceneGenerationModalProps {
  onComplete: (result: SceneResult) => void;
  onCancel: () => void;
}

export default function SceneGenerationModal({
  onComplete,
  onCancel,
}: SceneGenerationModalProps) {
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [sceneDescription, setSceneDescription] = useState("");
  const [activePreset, setActivePreset] = useState(STYLE_PRESETS[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (referenceImages.length >= MAX_REFERENCES) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReferenceImages(prev => [...prev, ev.target?.result as string]);
    };
    reader.readAsDataURL(file);
    // Reset so same file can be picked again
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = () => {
    if (referenceImages.length === 0 || !sceneDescription.trim()) return;
    const stylePreset = STYLE_PRESETS.find(p => p.id === activePreset)?.prompt || STYLE_PRESETS[0].prompt;
    setIsProcessing(true);
    onComplete({ referenceImages, sceneDescription: sceneDescription.trim(), stylePreset });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-xl font-serif font-bold">Создать сцену по описанию</h2>
          <p className="text-sm text-gray-500 mt-0.5">Загрузи фото с людьми — AI перенесёт их в описанную сцену</p>
        </div>

        <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
          {/* Reference photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Референсы с людьми
              <span className="ml-1.5 text-xs text-gray-400 font-normal">{referenceImages.length}/{MAX_REFERENCES}</span>
            </label>

            {/* Uploaded previews */}
            {referenceImages.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {referenceImages.map((url, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                    <img src={url} alt={`Референс ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-0.5 right-0.5 bg-white bg-opacity-90 rounded-full w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 text-[10px] shadow leading-none"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-40 text-white text-[9px] text-center py-0.5">
                      Фото {idx + 1}
                    </div>
                  </div>
                ))}

                {/* Add more button */}
                {referenceImages.length < MAX_REFERENCES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-brand-orange hover:text-brand-orange transition flex-shrink-0"
                  >
                    <span className="text-xl leading-none">+</span>
                    <span className="text-[9px] mt-0.5">Добавить</span>
                  </button>
                )}
              </div>
            )}

            {/* Empty state */}
            {referenceImages.length === 0 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center gap-2 text-gray-400 hover:border-brand-orange hover:text-brand-orange transition"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium">Нажми, чтобы загрузить фото</span>
                <span className="text-xs">До {MAX_REFERENCES} фотографий</span>
              </button>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Scene description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Описание сцены
            </label>
            <textarea
              value={sceneDescription}
              onChange={(e) => setSceneDescription(e.target.value)}
              placeholder="Например: на пляже в Таиланде, в космосе среди звёзд, в средневековом замке..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
              rows={3}
              disabled={isProcessing}
            />
          </div>

          {/* Style presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Стиль иллюстрации
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setActivePreset(preset.id)}
                  disabled={isProcessing}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                    activePreset === preset.id
                      ? 'bg-brand-orange text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="p-4 border-t border-gray-100 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition font-medium text-sm disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={isProcessing || referenceImages.length === 0 || !sceneDescription.trim()}
            className="btn-gradient px-5 py-2 text-white font-semibold text-sm disabled:opacity-50"
          >
            {isProcessing ? "Запуск..." : "🌄 Создать сцену"}
          </button>
        </div>
      </div>
    </div>
  );
}
