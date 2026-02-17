"use client";

import { useState, useEffect } from "react";
import { BubbleType } from "@/lib/types";

interface SpeechBubbleModalProps {
  initialText?: string;
  initialType?: BubbleType;
  initialTailDirection?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  initialTitleStyle?: 'ice-age' | 'fk-alako';
  onSave: (
    text: string,
    type: BubbleType,
    tailDirection: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
    titleStyle?: 'ice-age' | 'fk-alako'
  ) => void;
  onCancel: () => void;
}

export default function SpeechBubbleModal({
  initialText = "",
  initialType = 'speech',
  initialTailDirection = 'bottom-left',
  initialTitleStyle = 'ice-age',
  onSave,
  onCancel,
}: SpeechBubbleModalProps) {
  const [text, setText] = useState(initialText);
  const [bubbleType, setBubbleType] = useState<BubbleType>(initialType);
  const [tailDirection, setTailDirection] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>(initialTailDirection);
  const [titleStyle, setTitleStyle] = useState<'ice-age' | 'fk-alako'>(initialTitleStyle);

  useEffect(() => {
    setText(initialText);
    setBubbleType(initialType);
    setTailDirection(initialTailDirection);
    setTitleStyle(initialTitleStyle);
  }, [initialText, initialType, initialTailDirection, initialTitleStyle]);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim(), bubbleType, tailDirection, titleStyle);
    }
  };

  const bubbleTypeOptions = [
    { value: 'speech', label: '💬 Реплика', description: 'Обычное облачко с хвостиком' },
    { value: 'thought', label: '💭 Мысли', description: 'Воздушное облачко с пузырьками' },
    { value: 'annotation', label: '📝 Аннотация', description: 'Прямоугольник без хвостика' },
    { value: 'text-block', label: '📄 Текстовый блок', description: 'Для большого текста' },
    { value: 'cover-title', label: '✨ Заголовок обложки', description: 'Стилизованный заголовок' },
  ];

  const showTailDirection = bubbleType === 'speech' || bubbleType === 'thought';
  const isCoverTitle = bubbleType === 'cover-title';
  const modalTitle = bubbleTypeOptions.find(opt => opt.value === bubbleType)?.label || '💬 Добавить элемент';

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
        <h3 className="text-xl font-bold mb-4">{modalTitle}</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тип элемента
          </label>
          <div className="grid grid-cols-2 gap-2">
            {bubbleTypeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setBubbleType(option.value as BubbleType)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition text-left ${
                  bubbleType === option.value
                    ? 'bg-brand-orange text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={option.description}
              >
                <div>{option.label}</div>
                <div className="text-xs opacity-75">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Текст
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите текст..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none"
            rows={bubbleType === 'text-block' ? 6 : 4}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
            Ctrl+Enter - сохранить, Esc - отменить
          </p>
        </div>

        {showTailDirection && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Направление {bubbleType === 'thought' ? 'пузырьков' : 'хвостика'}
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
        )}

        {isCoverTitle && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Стиль заголовка
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTitleStyle('ice-age')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition text-left ${
                  titleStyle === 'ice-age'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div>🧊 ice aGE rUSS</div>
                <div className="text-xs opacity-75">Жирный, прямой</div>
              </button>
              <button
                onClick={() => setTitleStyle('fk-alako')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition text-left ${
                  titleStyle === 'fk-alako'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div>✍️ FK Alako.kz</div>
                <div className="text-xs opacity-75">Рукописный</div>
              </button>
            </div>
          </div>
        )}

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
