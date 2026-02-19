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
  onEditPhoto?: (side: "left" | "right", index: number) => void;
  onToggleSlot?: (side: "left" | "right", index: number) => void;
  onGenerateScene?: (side: "left" | "right", index: number) => void;
  onAddBubble?: (x: number, y: number) => void;
  onEditBubble?: (bubbleId: string) => void;
  onDeleteBubble?: (bubbleId: string) => void;
  onMoveBubble?: (bubbleId: string, x: number, y: number) => void;
  onResizeBubble?: (bubbleId: string, width: number, height: number) => void;
  onScaleBubble?: (bubbleId: string, scale: number) => void;
  onFontSizeBubble?: (bubbleId: string, fontSize: number) => void;
  onRotateBubble?: (bubbleId: string, rotation: number) => void;
}

export default function SpreadEditor({
  spread,
  withGaps,
  onPhotoClick,
  onDeletePhoto,
  onEditPhoto,
  onToggleSlot,
  onGenerateScene,
  onAddBubble,
  onEditBubble,
  onDeleteBubble,
  onMoveBubble,
  onResizeBubble,
  onScaleBubble,
  onFontSizeBubble,
  onRotateBubble,
}: SpreadEditorProps) {
  const spreadRef = useRef<HTMLDivElement>(null);
  const [slotChoice, setSlotChoice] = useState<{ side: "left" | "right"; index: number } | null>(null);
  const [containerScale, setContainerScale] = useState(1);
  // Touch device detection: true on phones/tablets in any orientation.
  // Cannot use sm: breakpoint — landscape phone width >= 640px triggers sm: and hides everything.
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(navigator.maxTouchPoints > 0);
  }, []);

  // containerScale: scales bubbles proportionally to match 600px reference spread width (same as PDF)
  useEffect(() => {
    const el = spreadRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      setContainerScale(w / 600);
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
    const borderClass = side === "left" ? "border-2 border-r-0" : "border-2 border-l";
    const isCover = template.id === 'cover';
    return (
      <div
        className={`relative w-full bg-gray-100 border-gray-300 ${borderClass} ${roundedClass} overflow-hidden${!isCover ? ' aspect-square' : ''}`}
        style={isCover ? { aspectRatio: '229 / 242' } : {}}
      >
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
                  if (onGenerateScene) {
                    setSlotChoice({ side, index });
                  } else {
                    onPhotoClick(side, index);
                  }
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
                      className={`w-full h-full object-cover ${!isBackground && (slot.width < 1.0 || slot.height < 1.0) ? 'border-[3px] border-black' : ''}`}
                    />

                    {/* Photo action buttons overlay */}
                    {!photo.isStylizing && (
                      <div
                        className={`absolute inset-0 transition-all flex items-center justify-center gap-1.5 ${isTouch ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/photo:opacity-100 pointer-events-none group-hover/photo:pointer-events-auto'}`}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.15)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0)'; }}
                      >
                        {/* Replace button — w-4 h-4 circle on touch, pill on desktop */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onPhotoClick(side, index); }}
                          className={`bg-green-700 text-white text-xs hover:bg-green-800 transition shadow-lg ${isTouch ? 'w-4 h-4 rounded-full flex items-center justify-center' : 'px-2.5 py-1 rounded-lg font-medium'}`}
                          title="Заменить фото"
                        >
                          🔄{!isTouch && <span> Заменить</span>}
                        </button>
                        {/* Edit button */}
                        {onEditPhoto && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onEditPhoto(side, index); }}
                            className={`bg-blue-600 text-white text-xs hover:bg-blue-700 transition shadow-lg ${isTouch ? 'w-4 h-4 rounded-full flex items-center justify-center' : 'px-2.5 py-1 rounded-lg font-medium'}`}
                            title="Редактировать фото"
                          >
                            ✏️{!isTouch && <span> Редактировать</span>}
                          </button>
                        )}
                        {/* Delete button */}
                        {onDeletePhoto && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeletePhoto(side, index); }}
                            className={`bg-brand-orange text-white text-xs hover:bg-orange-600 transition shadow-lg ${isTouch ? 'w-4 h-4 rounded-full flex items-center justify-center' : 'px-2.5 py-1 rounded-lg font-medium'}`}
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
                  <div className="flex flex-col items-center justify-center gap-0.5 p-2 md:p-2 opacity-25">
                    <svg className="w-2.5 h-2.5 md:w-6 md:h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-gray-600 text-[6px] md:text-xs font-normal text-center leading-tight">
                      {(PANORAMIC_BG_TEMPLATE_IDS.includes(template.id) && index === 0) ? "Добавить фото разворота" : "Добавить фото"}
                    </span>
                  </div>
                )}

                {/* Slot hide toggle — subtle, not on background slots */}
                {!isBackground && onToggleSlot && !photo?.hidden && (
                  <div className={`absolute top-0.5 right-0.5 z-30 ${slotVisibleCls} transition-opacity`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSlot(side, index); }}
                      className="md:w-3.5 md:h-3.5 text-gray-400 hover:text-gray-600 flex items-center justify-center md:text-[10px] leading-none"
                      style={{ width: '8px', height: '8px', fontSize: '8px' }}
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
            <p className="text-xs text-gray-500 mb-2">
              {spread.templateId === 'cover' ? 'Задняя обложка' : 'Левая страница'}
            </p>
          </div>
          <div className="w-1/2">
            <p className="text-xs text-gray-500 mb-2">
              {spread.templateId === 'cover' ? 'Лицевая обложка' : 'Правая страница'}
            </p>
          </div>
        </div>

        {/* Pages + spread-level bubble overlay */}
        <div className="relative" ref={spreadRef} id={`spread-container-${spread.id}`}>
          <div className="grid grid-cols-2 gap-0">
            {renderPage(spread.leftPhotos, "left")}
            {renderPage(spread.rightPhotos, "right")}
          </div>

          {/* Bubble overlay — floats over entire spread */}
          <div id={`bubbles-layer-${spread.id}`} className="absolute inset-0 pointer-events-none">
            {(spread.bubbles || []).map((bubble) => (
              <SpeechBubble
                key={bubble.id}
                bubble={bubble}
                containerRef={spreadRef}
                containerScale={containerScale}
                isTouch={isTouch}
                isCover={spread.templateId === 'cover'}
                onEdit={() => onEditBubble?.(bubble.id)}
                onDelete={() => onDeleteBubble?.(bubble.id)}
                onMove={(x, y) => onMoveBubble?.(bubble.id, x, y)}
                onResize={(width, height) => onResizeBubble?.(bubble.id, width, height)}
                onScale={(scale) => onScaleBubble?.(bubble.id, scale)}
                onFontSizeChange={(fontSize) => onFontSizeBubble?.(bubble.id, fontSize)}
                onRotate={(rotation) => onRotateBubble?.(bubble.id, rotation)}
              />
            ))}
          </div>

          {/* Cover trim/bleed guide overlay (only for cover) */}
          {spread.templateId === 'cover' && (
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full">
                {/* Red rectangle showing final cover boundaries (18mm bleed on all sides) */}
                {/* Cover dimensions: 458×242mm, bleed: 18mm */}
                {/* Bleed percentage: horizontal (18/458)*100 ≈ 3.93%, vertical (18/242)*100 ≈ 7.44% */}
                <rect
                  x="3.93%"
                  y="7.44%"
                  width="92.14%"
                  height="85.12%"
                  fill="none"
                  stroke="red"
                  strokeWidth="2"
                  strokeDasharray="1.5,8"
                  strokeLinecap="round"
                />
                {/* Spine lines (10mm width in center) */}
                {/* Spine: center ± 5mm = (229-5)mm to (229+5)mm = 224mm to 234mm */}
                {/* In percentage: 224/458 ≈ 48.91%, 234/458 ≈ 51.09% */}
                <line
                  x1="48.91%"
                  y1="7.44%"
                  x2="48.91%"
                  y2="92.56%"
                  stroke="red"
                  strokeWidth="2"
                  strokeDasharray="1.5,8"
                  strokeLinecap="round"
                />
                <line
                  x1="51.09%"
                  y1="7.44%"
                  x2="51.09%"
                  y2="92.56%"
                  stroke="red"
                  strokeWidth="2"
                  strokeDasharray="1.5,8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Slot action choice overlay */}
      {slotChoice && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
          onClick={() => setSlotChoice(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 flex flex-col gap-4 w-72 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-800 text-center">Что добавить в слот?</h3>
            <button
              onClick={() => { onPhotoClick(slotChoice.side, slotChoice.index); setSlotChoice(null); }}
              className="flex items-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-brand-orange hover:bg-orange-50 transition text-left"
            >
              <span className="text-2xl">📷</span>
              <div>
                <div className="font-medium text-sm">Стилизовать фото</div>
                <div className="text-xs text-gray-500">Загрузить и обрезать фотографию</div>
              </div>
            </button>
            <button
              onClick={() => { onGenerateScene?.(slotChoice.side, slotChoice.index); setSlotChoice(null); }}
              className="flex items-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition text-left"
            >
              <span className="text-2xl">🌄</span>
              <div>
                <div className="font-medium text-sm">Создать сцену</div>
                <div className="text-xs text-gray-500">AI перенесёт людей в описанную сцену</div>
              </div>
            </button>
          </div>
        </div>
      )}

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
