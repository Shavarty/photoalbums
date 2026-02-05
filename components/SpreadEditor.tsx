"use client";

import { useRef, useState, useEffect } from "react";
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
  onScaleBubble?: (bubbleId: string, scale: number) => void;
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
  onScaleBubble,
  onFontSizeBubble,
}: SpreadEditorProps) {
  const spreadRef = useRef<HTMLDivElement>(null);
  const [containerScale, setContainerScale] = useState(1);
  // Touch device detection: true on phones/tablets in any orientation.
  // Cannot use sm: breakpoint — landscape phone width >= 640px triggers sm: and hides everything.
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(window.matchMedia('(hover: none)').matches);
  }, []);

  // containerScale: shrinks bubbles proportionally when spread is narrower than 600px reference
  useEffect(() => {
    const el = spreadRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      setContainerScale(Math.min(1, w / 600));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const template = SPREAD_TEMPLATES.find((t) => t.id === spread.templateId);
  if (!template) return null;

  // Shared visibility class: touch → always visible; desktop → hover-reveal
  const slotVisibleCls = isTouch ? 'opacity-100' : 'opacity-0 group-hover/photo:opacity-100';

  const renderPage = (photos: Photo[], side: "left" | "right") => {
    const slots = getPageSlots(template, side, withGaps);
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
                if (photo?.url && onAddBubble && e.target instanceof HTMLElement) {
                  if (!e.target.closest('button')) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
                    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
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

                    {/* Photo action buttons overlay */}
                    {!photo.isStylizing && (
                      <div
                        className={`absolute inset-0 transition-all flex items-center justify-center gap-1.5 ${isTouch ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/photo:opacity-100 pointer-events-none group-hover/photo:pointer-events-auto'}`}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.15)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0)'; }}
                      >
                        {/* Replace button — w-5 h-5 circle on touch, pill on desktop */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onPhotoClick(side, index); }}
                          className={`bg-green-700 text-white text-xs hover:bg-green-800 transition shadow-lg ${isTouch ? 'w-5 h-5 rounded-full flex items-center justify-center' : 'px-3 py-1.5 rounded-lg font-medium'}`}
                          title="Заменить фото"
                        >
                          🔄{!isTouch && <span> Заменить</span>}
                        </button>
                        {/* Delete button */}
                        {onDeletePhoto && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeletePhoto(side, index); }}
                            className={`bg-brand-orange text-white text-xs hover:bg-orange-600 transition shadow-lg ${isTouch ? 'w-5 h-5 rounded-full flex items-center justify-center' : 'px-3 py-1.5 rounded-lg font-medium'}`}
                            title="Удалить фото"
                          >
                            🗑️{!isTouch && <span> Удалить</span>}
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
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-gray-600 text-[8px] md:text-xs font-normal text-center leading-tight">
                      {(PANORAMIC_BG_TEMPLATE_IDS.includes(template.id) && index === 0) ? "Добавить фото разворота" : "Добавить фото"}
                    </span>
                  </div>
                )}

                {/* Slot hide toggle — w-5 h-5, not on background slots */}
                {!isBackground && onToggleSlot && !photo?.hidden && (
                  <div className={`absolute top-0.5 right-0.5 z-30 ${slotVisibleCls} transition-opacity`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSlot(side, index); }}
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

      {/* Constrain spread width so it fits viewport height in landscape.
          Spread is 2:1 (two square pages). maxWidth = (vh - chrome) × 2. */}
      <div className="w-full mx-auto" style={{ maxWidth: 'min(100%, calc((100vh - 12rem) * 2))' }}>
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
                containerScale={containerScale}
                isTouch={isTouch}
                onEdit={() => onEditBubble?.(bubble.id)}
                onDelete={() => onDeleteBubble?.(bubble.id)}
                onMove={(x, y) => onMoveBubble?.(bubble.id, x, y)}
                onResize={(width, height) => onResizeBubble?.(bubble.id, width, height)}
                onScale={(scale) => onScaleBubble?.(bubble.id, scale)}
                onFontSizeChange={(fontSize) => onFontSizeBubble?.(bubble.id, fontSize)}
              />
            ))}
          </div>
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
