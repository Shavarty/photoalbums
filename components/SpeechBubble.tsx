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

  const bubbleType = bubble.type || 'speech';

  // Calculate bubble size based on text length and type
  const textLength = bubble.text.length;
  const padding = 12;

  // Text blocks are larger to accommodate more text
  const isTextBlock = bubbleType === 'text-block';
  const minWidth = isTextBlock ? 200 : 100;
  const minHeight = isTextBlock ? 100 : 60;
  const maxWidth = isTextBlock ? 400 : 300;

  // Estimate size (rough calculation, will auto-adjust with foreignObject)
  const estimatedWidth = Math.max(minWidth, Math.min(maxWidth, textLength * 8 + padding * 2));
  const estimatedHeight = Math.max(minHeight, Math.ceil(textLength / (isTextBlock ? 50 : 30)) * 20 + padding * 2);

  // Generate bubble shapes based on type
  const getSpeechBubblePath = () => {
    const cx = estimatedWidth / 2 + 10;
    const cy = estimatedHeight / 2 + 10;
    const rx = estimatedWidth / 2;
    const ry = estimatedHeight / 2;

    // Ellipse approximation with cubic Bezier curves
    const kappa = 0.551915;
    const ox = rx * kappa;
    const oy = ry * kappa;

    let path = `M ${cx + rx},${cy}`;
    path += ` C ${cx + rx},${cy - oy} ${cx + ox},${cy - ry} ${cx},${cy - ry}`;
    path += ` C ${cx - ox},${cy - ry} ${cx - rx},${cy - oy} ${cx - rx},${cy}`;

    const direction = bubble.tailDirection || 'bottom-left';

    if (direction === 'bottom-left') {
      path += ` C ${cx - rx},${cy + oy} ${cx - ox},${cy + ry} ${cx - rx * 0.3},${cy + ry}`;
      path += ` L ${cx - rx * 0.5},${cy + ry + 15} L ${cx - rx * 0.1},${cy + ry}`;
      path += ` C ${cx + ox},${cy + ry} ${cx + rx},${cy + oy} ${cx + rx},${cy}`;
    } else if (direction === 'bottom-right') {
      path += ` C ${cx - rx},${cy + oy} ${cx - ox},${cy + ry} ${cx + rx * 0.1},${cy + ry}`;
      path += ` L ${cx + rx * 0.5},${cy + ry + 15} L ${cx + rx * 0.3},${cy + ry}`;
      path += ` C ${cx + rx},${cy + ry} ${cx + rx},${cy + oy} ${cx + rx},${cy}`;
    } else if (direction === 'top-left') {
      path = `M ${cx + rx},${cy}`;
      path += ` C ${cx + rx},${cy - oy} ${cx + ox},${cy - ry} ${cx - rx * 0.1},${cy - ry}`;
      path += ` L ${cx - rx * 0.5},${cy - ry - 15} L ${cx - rx * 0.3},${cy - ry}`;
      path += ` C ${cx - rx},${cy - ry} ${cx - rx},${cy - oy} ${cx - rx},${cy}`;
      path += ` C ${cx - rx},${cy + oy} ${cx - ox},${cy + ry} ${cx},${cy + ry}`;
      path += ` C ${cx + ox},${cy + ry} ${cx + rx},${cy + oy} ${cx + rx},${cy}`;
    } else if (direction === 'top-right') {
      path = `M ${cx + rx},${cy}`;
      path += ` C ${cx + rx},${cy - oy} ${cx + ox},${cy - ry} ${cx + rx * 0.3},${cy - ry}`;
      path += ` L ${cx + rx * 0.5},${cy - ry - 15} L ${cx + rx * 0.1},${cy - ry}`;
      path += ` C ${cx},${cy - ry} ${cx - ox},${cy - ry} ${cx - rx},${cy - oy}`;
      path += ` L ${cx - rx},${cy}`;
      path += ` C ${cx - rx},${cy + oy} ${cx - ox},${cy + ry} ${cx},${cy + ry}`;
      path += ` C ${cx + ox},${cy + ry} ${cx + rx},${cy + oy} ${cx + rx},${cy}`;
    }

    path += ` Z`;
    return path;
  };

  const getThoughtBubblePath = () => {
    // Classic thought bubble: rounded cloud + small circles
    const cx = estimatedWidth / 2 + 10;
    const cy = estimatedHeight / 2 + 10;
    const rx = estimatedWidth / 2;
    const ry = estimatedHeight / 2;

    // Main cloud shape - scalloped ellipse with bumps
    const numBumps = 8;
    const bumpHeight = Math.min(rx, ry) * 0.15; // Height of bumps

    let path = '';

    for (let i = 0; i <= numBumps; i++) {
      const angle = (i / numBumps) * 2 * Math.PI;
      const nextAngle = ((i + 1) / numBumps) * 2 * Math.PI;

      // Point on ellipse
      const x1 = cx + rx * Math.cos(angle);
      const y1 = cy + ry * Math.sin(angle);

      // Next point on ellipse
      const x2 = cx + rx * Math.cos(nextAngle);
      const y2 = cy + ry * Math.sin(nextAngle);

      // Bump outward
      const midAngle = (angle + nextAngle) / 2;
      const bumpX = cx + (rx + bumpHeight) * Math.cos(midAngle);
      const bumpY = cy + (ry + bumpHeight) * Math.sin(midAngle);

      if (i === 0) {
        path += `M ${x1},${y1}`;
      }

      // Quadratic curve to create bump
      path += ` Q ${bumpX},${bumpY} ${x2},${y2}`;
    }

    path += ` Z`;

    // Add small thought bubbles
    const direction = bubble.tailDirection || 'bottom-left';
    const smallBubbles = [];

    if (direction.includes('bottom')) {
      const baseY = cy + ry + bumpHeight;
      const baseX = direction.includes('left') ? cx - rx * 0.3 : cx + rx * 0.3;
      smallBubbles.push({ cx: baseX, cy: baseY + 8, r: 5 });
      smallBubbles.push({ cx: baseX + (direction.includes('left') ? -6 : 6), cy: baseY + 18, r: 3 });
    } else {
      const baseY = cy - ry - bumpHeight;
      const baseX = direction.includes('left') ? cx - rx * 0.3 : cx + rx * 0.3;
      smallBubbles.push({ cx: baseX, cy: baseY - 8, r: 5 });
      smallBubbles.push({ cx: baseX + (direction.includes('left') ? -6 : 6), cy: baseY - 18, r: 3 });
    }

    return { mainPath: path, smallBubbles };
  };

  const getAnnotationPath = () => {
    // Simple rounded rectangle, no tail
    const x = 10;
    const y = 10;
    const w = estimatedWidth;
    const h = estimatedHeight;
    const r = 8; // corner radius

    return `M ${x + r},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r} L ${x + w},${y + h - r} Q ${x + w},${y + h} ${x + w - r},${y + h} L ${x + r},${y + h} Q ${x},${y + h} ${x},${y + h - r} L ${x},${y + r} Q ${x},${y} ${x + r},${y} Z`;
  };

  const getTextBlockPath = () => {
    // Larger rectangle for text blocks
    const x = 10;
    const y = 10;
    const w = estimatedWidth;
    const h = estimatedHeight;
    const r = 6; // smaller corner radius for more formal look

    return `M ${x + r},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r} L ${x + w},${y + h - r} Q ${x + w},${y + h} ${x + w - r},${y + h} L ${x + r},${y + h} Q ${x},${y + h} ${x},${y + h - r} L ${x},${y + r} Q ${x},${y} ${x + r},${y} Z`;
  };

  const getBubblePath = () => {
    switch (bubbleType) {
      case 'thought':
        return getThoughtBubblePath();
      case 'annotation':
        return getAnnotationPath();
      case 'text-block':
        return getTextBlockPath();
      case 'speech':
      default:
        return getSpeechBubblePath();
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

  const bubblePath = getBubblePath();
  const isThoughtBubble = bubbleType === 'thought' && typeof bubblePath === 'object';

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
        {/* Render bubble based on type */}
        {isThoughtBubble ? (
          <>
            <path
              d={bubblePath.mainPath}
              fill="white"
              stroke="black"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {bubblePath.smallBubbles.map((bubble, i) => (
              <circle
                key={i}
                cx={bubble.cx}
                cy={bubble.cy}
                r={bubble.r}
                fill="white"
                stroke="black"
                strokeWidth="2"
              />
            ))}
          </>
        ) : (
          <path
            d={typeof bubblePath === 'string' ? bubblePath : ''}
            fill="white"
            stroke="black"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}

        {/* Text */}
        <foreignObject
          x={padding + 10}
          y={padding + 10}
          width={estimatedWidth - padding * 2}
          height={estimatedHeight - padding * 2}
        >
          <div className={`text-sm font-bold ${bubbleType === 'text-block' ? 'text-left' : 'text-center'} flex items-center ${bubbleType === 'text-block' ? 'justify-start' : 'justify-center'} h-full break-words whitespace-pre-wrap`} style={{ fontFamily: 'var(--font-balsamiq-sans), sans-serif' }}>
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
