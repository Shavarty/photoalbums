import React, { useState, useRef, useEffect } from "react";
import { SpeechBubble as SpeechBubbleType } from "@/lib/types";

interface SpeechBubbleProps {
  bubble: SpeechBubbleType;
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: (x: number, y: number) => void;
}

export default function SpeechBubble({ bubble, onEdit, onDelete, onMove }: SpeechBubbleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; bubbleX: number; bubbleY: number } | null>(null);
  // Calculate bubble size based on text length
  const textLength = bubble.text.length;
  const minWidth = 100;
  const minHeight = 60;
  const padding = 12;

  // Estimate size (rough calculation, will auto-adjust with foreignObject)
  const estimatedWidth = Math.max(minWidth, Math.min(300, textLength * 8 + padding * 2));
  const estimatedHeight = Math.max(minHeight, Math.ceil(textLength / 30) * 20 + padding * 2);

  // Tail position based on direction - connects seamlessly to ellipse
  const getTailPath = () => {
    const cx = estimatedWidth / 2 + 10; // Center X of ellipse
    const cy = estimatedHeight / 2 + 10; // Center Y of ellipse
    const rx = estimatedWidth / 2; // Radius X
    const ry = estimatedHeight / 2; // Radius Y

    switch (bubble.tailDirection || 'bottom-left') {
      case 'bottom-left':
        // Start from ellipse edge, go to point, return to edge
        return `M ${cx - rx * 0.3},${cy + ry * 0.8} L ${cx - rx * 0.6},${cy + ry + 15} L ${cx - rx * 0.1},${cy + ry * 0.9} Z`;
      case 'bottom-right':
        return `M ${cx + rx * 0.1},${cy + ry * 0.9} L ${cx + rx * 0.6},${cy + ry + 15} L ${cx + rx * 0.3},${cy + ry * 0.8} Z`;
      case 'top-left':
        return `M ${cx - rx * 0.1},${cy - ry * 0.9} L ${cx - rx * 0.6},${cy - ry - 15} L ${cx - rx * 0.3},${cy - ry * 0.8} Z`;
      case 'top-right':
        return `M ${cx + rx * 0.3},${cy - ry * 0.8} L ${cx + rx * 0.6},${cy - ry - 15} L ${cx + rx * 0.1},${cy - ry * 0.9} Z`;
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !onMove) return; // Only left click
    if ((e.target as HTMLElement).closest('button')) return; // Don't drag when clicking buttons

    e.preventDefault();
    e.stopPropagation();

    const parentRect = (e.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      bubbleX: bubble.x,
      bubbleY: bubble.y,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !onMove) return;

    const parentRect = document.querySelector('.relative.w-full.aspect-square')?.getBoundingClientRect();
    if (!parentRect) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const deltaXPercent = (deltaX / parentRect.width) * 100;
    const deltaYPercent = (deltaY / parentRect.height) * 100;

    const newX = Math.max(5, Math.min(95, dragStartRef.current.bubbleX + deltaXPercent));
    const newY = Math.max(5, Math.min(95, dragStartRef.current.bubbleY + deltaYPercent));

    onMove(newX, newY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Add/remove global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div
      className="absolute group"
      style={{
        left: `${bubble.x}%`,
        top: `${bubble.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
        cursor: isDragging ? 'grabbing' : (onMove ? 'grab' : 'default'),
      }}
      onMouseDown={handleMouseDown}
    >
      <svg
        width={estimatedWidth + 20}
        height={estimatedHeight + 30}
        className="drop-shadow-lg"
      >
        {/* Main bubble */}
        <ellipse
          cx={estimatedWidth / 2 + 10}
          cy={estimatedHeight / 2 + 10}
          rx={estimatedWidth / 2}
          ry={estimatedHeight / 2}
          fill="white"
          stroke="black"
          strokeWidth="2"
        />

        {/* Tail - now seamlessly connected */}
        <path
          d={getTailPath()}
          fill="white"
          stroke="black"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Text */}
        <foreignObject
          x={padding + 10}
          y={padding + 10}
          width={estimatedWidth - padding * 2}
          height={estimatedHeight - padding * 2}
        >
          <div className="text-sm font-bold text-center flex items-center justify-center h-full break-words">
            {bubble.text}
          </div>
        </foreignObject>
      </svg>

      {/* Edit/Delete buttons (show on hover) */}
      {(onEdit || onDelete) && (
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-blue-600"
              title="Редактировать"
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
              title="Удалить"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}
