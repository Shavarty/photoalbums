"use client";

import { useState, useEffect } from "react";

interface SpeechBubbleModalProps {
  initialText?: string;
  onSave: (text: string, tailDirection: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
  onCancel: () => void;
}

export default function SpeechBubbleModal({
  initialText = "",
  onSave,
  onCancel,
}: SpeechBubbleModalProps) {
  const [text, setText] = useState(initialText);
  const [tailDirection, setTailDirection] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-left');

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim(), tailDirection);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-4">💬 Добавить реплику</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Текст реплики
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите текст..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none"
            rows={4}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
            Ctrl+Enter - сохранить, Esc - отменить
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Направление хвостика
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'top-left', label: '↖ Вверх-влево' },
              { value: 'top-right', label: '↗ Вверх-вправо' },
              { value: 'bottom-left', label: '↙ Вниз-влево' },
              { value: 'bottom-right', label: '↘ Вниз-вправо' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTailDirection(option.value as any)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  tailDirection === option.value
                    ? 'bg-brand-orange text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className="flex-1 px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
