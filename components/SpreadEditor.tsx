"use client";

import { useRef } from "react";
import { Spread, Photo } from "@/lib/types";
import { SPREAD_TEMPLATES, PhotoSlot, getPageSlots, PANORAMIC_BG_TEMPLATE_IDS } from "@/lib/spread-templates";
import SpeechBubble from "./SpeechBubble";

interface SpreadEditorProps {
  spread: Spread;
  withGaps: boolean;
  onPhotoClick: (side: "left" | "right", index: number) => void;
  onDeletePhoto?: (side: "left" | "right", index: number) => void;
  onToggleSlot?: (side: "left" | "right", index: number) => void;
  onAddBubble?: (x: number, y: number) => void;
  onEditBubble?: (bubbleId: string) => void;
  onDeleteBubble?: (bubbleId: string) => void;
  onMoveBubble?: (bubbleId: string, x: number, y: number) => void;
  onResizeBubble?: (bubbleId: string, width: number, height: number) => void;
  onFontSizeBubble?: (bubbleId: string, fontSize: number) => void;
}

export default function SpreadEditor({
  spread,
  withGaps,
  onPhotoClick,
  onDeletePhoto,
  onToggleSlot,
  onAddBubble,
  onEditBubble,
  onDeleteBubble,
  onMoveBubble,
  onResizeBubble,
  onFontSizeBubble,
}: SpreadEditorProps) {
  const spreadRef = useRef<HTMLDivElement>(null);
  const template = SPREAD_TEMPLATES.find((t) => t.id === spread.templateId);
  if (!template) return null;

  const renderPage = (photos: Photo[], side: "left" | "right") => {
    const slots = getPageSlots(template, side, withGaps);
    // Round only outer corners for spread effect
    // Left page: all borders. Right page: no left border (shares with left page's right border)
    const roundedClass = side === "left" ? "rounded-l-lg" : "rounded-r-lg";
    const borderClass = side === "left" ? "border-2" : "border-2 border-l-0";
    return (
      <div className={`relative w-full aspect-square bg-gray-100 border-gray-300 ${borderClass} ${roundedClass} overflow-hidden`}>
        {slots.map((slot, index) => {
          const photo = photos[index];
          const isBackground = PANORAMIC_BG_TEMPLATE_IDS.includes(template.id) && index === 0;
          return (
            <div
              key={slot.id}
              className="absolute cursor-pointer hover:opacity-90 transition"
              style={{
                left: `${slot.x * 100}%`,
                top: `${slot.y * 100}%`,
                width: `${slot.width * 100}%`,
                height: `${slot.height * 100}%`,
              }}
              onClick={(e) => {
                if (photo?.hidden) {
                  e.stopPropagation();
                  onToggleSlot?.(side, index);
                  return;
                }
                // Click on photo → add bubble at spread-relative coords
                if (photo?.url && onAddBubble && e.target instanceof HTMLElement) {
                  if (!e.target.closest('button')) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
                    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
                    // Convert slot-local click to spread coords (left page = 0–50%, right = 50–100%)
                    const pageOffset = side === 'left' ? 0 : 50;
                    const spreadX = pageOffset + (slot.x + clickX / 100 * slot.width) * 50;
                    const spreadY = (slot.y + clickY / 100 * slot.height) * 100;
                    onAddBubble(spreadX, spreadY);
                  }
                } else if (!photo?.url) {
                  onPhotoClick(side, index);
                }
              }}
            >
              <div className={`relative w-full h-full flex flex-col items-center justify-center overflow-visible transition-all group/photo ${photo?.hidden ? 'border border-dashed border-gray-400 bg-gray-50 opacity-[0.1] hover:opacity-[0.4] transition-opacity' : !photo?.url ? 'bg-gray-200 border border-gray-400 hover:bg-gray-300 hover:border-brand-orange' : ''}`}>
                {photo?.hidden ? (
                  <div className="flex items-center justify-center cursor-pointer">
                    <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-base hover:bg-gray-400">
                      +
                    </div>
                  </div>
                ) : photo?.url ? (
                  <>
                    <img
                      src={photo.url}
                      alt=""
                      className={`w-full h-full object-cover ${slot.width < 1.0 || slot.height < 1.0 ? 'border-[3px] border-black' : ''}`}
                    />

                    {/* Photo action buttons overlay (shown on hover) */}
                    {!photo.isStylizing && (
                      <div
                        className="absolute inset-0 transition-all flex items-center justify-center gap-2 opacity-0 group-hover/photo:opacity-100 pointer-events-none group-hover/photo:pointer-events-auto"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0)';
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPhotoClick(side, index);
                          }}
                          className="px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-medium hover:bg-green-800 transition shadow-lg"
                          title="Заменить фото"
                        >
                          🔄 Заменить
                        </button>
                        {onDeletePhoto && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePhoto(side, index);
                            }}
                            className="px-3 py-1.5 bg-brand-orange text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition shadow-lg"
                            title="Удалить фото"
                          >
                            🗑️ Удалить
                          </button>
                        )}
                      </div>
                    )}

                    {photo.isStylizing && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                          <div className="text-white text-xs font-medium">🎨 Стилизация...</div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-0.5 p-1 md:p-2 opacity-25">
                    {/* Camera Icon */}
                    <svg
                      className="w-4 h-4 md:w-6 md:h-6 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>

                    {/* Text */}
                    <span className="text-gray-600 text-[8px] md:text-xs font-normal text-center leading-tight">
                      {(PANORAMIC_BG_TEMPLATE_IDS.includes(template.id) && index === 0)
                        ? "Добавить фото разворота"
                        : "Добавить фото"}
                    </span>
                  </div>
                )}
                {/* Toggle slot visibility (hide) — not for background slots */}
                {!isBackground && onToggleSlot && !photo?.hidden && (
                  <div className="absolute top-0.5 right-0.5 z-30 opacity-0 group-hover/photo:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSlot(side, index);
                      }}
                      className="w-5 h-5 bg-gray-700 bg-opacity-80 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-gray-900 shadow"
                      title="Скрыть слот"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">{template.name}</h3>
        <p className="text-sm text-gray-600">{template.description}</p>
      </div>

      {/* Page labels */}
      <div className="flex">
        <div className="w-1/2">
          <p className="text-xs text-gray-500 mb-2">Левая страница</p>
        </div>
        <div className="w-1/2">
          <p className="text-xs text-gray-500 mb-2">Правая страница</p>
        </div>
      </div>

      {/* Pages + spread-level bubble overlay */}
      <div className="relative" ref={spreadRef}>
        <div className="grid grid-cols-2 gap-0">
          {renderPage(spread.leftPhotos, "left")}
          {renderPage(spread.rightPhotos, "right")}
        </div>

        {/* Bubble overlay — floats over entire spread */}
        <div className="absolute inset-0 pointer-events-none">
          {(spread.bubbles || []).map((bubble) => (
            <SpeechBubble
              key={bubble.id}
              bubble={bubble}
              containerRef={spreadRef}
              onEdit={() => onEditBubble?.(bubble.id)}
              onDelete={() => onDeleteBubble?.(bubble.id)}
              onMove={(x, y) => onMoveBubble?.(bubble.id, x, y)}
              onResize={(width, height) => onResizeBubble?.(bubble.id, width, height)}
              onFontSizeChange={(fontSize) => onFontSizeBubble?.(bubble.id, fontSize)}
            />
          ))}
        </div>
      </div>

      {/* Helper Text */}
      {[...spread.leftPhotos, ...spread.rightPhotos].every(p => !p?.url) && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 text-center">
            💡 Нажмите на ячейку, чтобы добавить фото
          </p>
        </div>
      )}
    </div>
  );
}
