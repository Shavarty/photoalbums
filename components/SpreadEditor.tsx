"use client";

import { Spread, Photo } from "@/lib/types";
import { SPREAD_TEMPLATES, PhotoSlot } from "@/lib/spread-templates";

interface SpreadEditorProps {
  spread: Spread;
  onPhotoClick: (side: "left" | "right", index: number) => void;
  onCaptionChange: (side: "left" | "right", index: number, caption: string) => void;
}

export default function SpreadEditor({
  spread,
  onPhotoClick,
  onCaptionChange,
}: SpreadEditorProps) {
  const template = SPREAD_TEMPLATES.find((t) => t.id === spread.templateId);
  if (!template) return null;

  const renderPage = (slots: PhotoSlot[], photos: Photo[], side: "left" | "right") => {
    return (
      <div className="relative w-full aspect-square bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden">
        {slots.map((slot, index) => {
          const photo = photos[index];
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
              onClick={() => onPhotoClick(side, index)}
            >
              <div className="relative w-full h-full bg-gray-200 border border-gray-400 flex items-center justify-center overflow-hidden">
                {photo?.url ? (
                  <>
                    <img
                      src={photo.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 text-center">
                        {photo.caption}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400 text-xs text-center px-2">
                    {(() => {
                      const ratio = slot.aspectRatio;
                      // Common aspect ratios in WxH format
                      if (Math.abs(ratio - 1) < 0.05) return "1x1";
                      if (Math.abs(ratio - 16/9) < 0.05) return "16x9";
                      if (Math.abs(ratio - 4/3) < 0.05) return "4x3";
                      if (Math.abs(ratio - 5/4) < 0.05) return "5x4";
                      if (Math.abs(ratio - 3/2) < 0.05) return "3x2";
                      if (Math.abs(ratio - 21/9) < 0.05) return "21x9";
                      if (Math.abs(ratio - 9/21) < 0.05) return "9x21";
                      if (Math.abs(ratio - 3/4) < 0.05) return "3x4";
                      if (Math.abs(ratio - 2/3) < 0.05) return "2x3";
                      // Fallback to calculated ratio
                      if (ratio > 1) {
                        const h = Math.round(10 / ratio);
                        return `10x${h}`;
                      } else {
                        const w = Math.round(10 * ratio);
                        return `${w}x10`;
                      }
                    })()}
                  </span>
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

      <div className="grid grid-cols-2 gap-4">
        {/* Left Page */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Левая страница</p>
          {renderPage(template.leftPage.slots, spread.leftPhotos, "left")}
        </div>

        {/* Right Page */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Правая страница</p>
          {renderPage(template.rightPage.slots, spread.rightPhotos, "right")}
        </div>
      </div>

      {/* Captions */}
      <div className="mt-4 space-y-2">
        {[...spread.leftPhotos, ...spread.rightPhotos].map((photo, idx) => {
          if (!photo?.url) return null;
          const isLeft = idx < spread.leftPhotos.length;
          const photoIndex = isLeft ? idx : idx - spread.leftPhotos.length;
          return (
            <input
              key={`caption-${idx}`}
              type="text"
              placeholder={`Подпись к фото ${idx + 1}...`}
              value={photo.caption || ""}
              onChange={(e) =>
                onCaptionChange(
                  isLeft ? "left" : "right",
                  photoIndex,
                  e.target.value
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          );
        })}
      </div>
    </div>
  );
}
