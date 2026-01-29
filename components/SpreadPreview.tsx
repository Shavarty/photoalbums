"use client";

import { SPREAD_TEMPLATES, PhotoSlot } from "@/lib/spread-templates";

interface SpreadPreviewProps {
  templateId: string;
  size?: number; // Size in pixels for each page square
}

export default function SpreadPreview({ templateId, size = 40 }: SpreadPreviewProps) {
  const template = SPREAD_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const renderPage = (slots: PhotoSlot[]) => {
    return (
      <div
        className="relative bg-gray-200 border border-gray-400"
        style={{ width: size, height: size }}
      >
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="absolute bg-gray-400 border border-gray-500"
            style={{
              left: `${slot.x * 100}%`,
              top: `${slot.y * 100}%`,
              width: `${slot.width * 100}%`,
              height: `${slot.height * 100}%`,
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex gap-0.5">
      {renderPage(template.leftPage.slots)}
      {renderPage(template.rightPage.slots)}
    </div>
  );
}
