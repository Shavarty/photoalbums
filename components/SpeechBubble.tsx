import React, { useState, useRef, useEffect } from "react";
import { SpeechBubble as SpeechBubbleType } from "@/lib/types";

interface SpeechBubbleProps {
  bubble: SpeechBubbleType;
  containerRef?: React.RefObject<HTMLDivElement | null>; // Positioning container for drag (spread overlay)
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: (x: number, y: number) => void;
  onResize?: (width: number, height: number) => void;
  onScale?: (scale: number) => void;
  onFontSizeChange?: (fontSize: number) => void;
}

export default function SpeechBubble({ bubble, containerRef, onEdit, onDelete, onMove, onResize, onScale, onFontSizeChange }: SpeechBubbleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; bubbleX: number; bubbleY: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; startWidth: number; startHeight: number; startBubbleX: number; startBubbleY: number; slotRect: DOMRect | null } | null>(null);
  const scaleStartRef = useRef<{ centerX: number; centerY: number; initialDist: number; initialScale: number } | null>(null);

  const bubbleType = bubble.type || 'speech';

  // Calculate bubble size based on text length and type
  const textLength = bubble.text.length;
  const padding = 12;

  // Text blocks are larger to accommodate more text
  const isTextBlock = bubbleType === 'text-block';
  const minWidth = isTextBlock ? 200 : 100;
  const minHeight = isTextBlock ? 100 : 60;
  const maxWidth = isTextBlock ? 600 : 300;

  // Use custom size if provided (for text-block), otherwise estimate
  const estimatedWidth = bubble.width || Math.max(minWidth, Math.min(maxWidth, textLength * 8 + padding * 2));
  const estimatedHeight = bubble.height || Math.max(minHeight, Math.ceil(textLength / (isTextBlock ? 50 : 30)) * 20 + padding * 2);

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
    // Cloud thought bubble - single path with scalloped edges
    const cx = estimatedWidth / 2 + 10;
    const cy = estimatedHeight / 2 + 10;
    const rx = estimatedWidth / 2;
    const ry = estimatedHeight / 2;

    // Create cloud path with bumps around perimeter
    const numBumps = 10;
    const bumpSize = Math.min(rx, ry) * 0.4; // Increased from 0.25 for more fluffiness

    let path = '';

    for (let i = 0; i < numBumps; i++) { // Changed from <= to < to avoid overlap
      const angle = (i / numBumps) * 2 * Math.PI;
      const nextAngle = ((i + 1) / numBumps) * 2 * Math.PI;

      // Main points on ellipse
      const x1 = cx + rx * Math.cos(angle);
      const y1 = cy + ry * Math.sin(angle);
      const x2 = cx + rx * Math.cos(nextAngle);
      const y2 = cy + ry * Math.sin(nextAngle);

      // Control point for scallop (bump outward)
      const midAngle = (angle + nextAngle) / 2;
      // Point on ellipse at midAngle
      const midX = cx + rx * Math.cos(midAngle);
      const midY = cy + ry * Math.sin(midAngle);
      // Push outward from ellipse
      const cx1 = midX + bumpSize * Math.cos(midAngle);
      const cy1 = midY + bumpSize * Math.sin(midAngle);

      if (i === 0) {
        path += `M ${x1},${y1}`;
      }

      // Quadratic curve creates the bump
      path += ` Q ${cx1},${cy1} ${x2},${y2}`;
    }

    path += ' Z';

    // Small thought bubbles
    const direction = bubble.tailDirection || 'bottom-left';
    const smallBubbles = [];

    if (direction.includes('bottom')) {
      const baseY = cy + ry + bumpSize;
      const baseX = direction.includes('left') ? cx - rx * 0.3 : cx + rx * 0.3;
      smallBubbles.push({ cx: baseX, cy: baseY + 12, r: 7 });
      smallBubbles.push({ cx: baseX + (direction.includes('left') ? -10 : 10), cy: baseY + 28, r: 4 });
    } else {
      const baseY = cy - ry - bumpSize;
      const baseX = direction.includes('left') ? cx - rx * 0.3 : cx + rx * 0.3;
      smallBubbles.push({ cx: baseX, cy: baseY - 12, r: 7 });
      smallBubbles.push({ cx: baseX + (direction.includes('left') ? -10 : 10), cy: baseY - 28, r: 4 });
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

    const parentRect = containerRef?.current?.getBoundingClientRect();
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

  // Resize handlers (text-block only — changes width/height, top-left anchored)
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (!onResize || bubbleType !== 'text-block') return;
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startWidth: estimatedWidth,
      startHeight: estimatedHeight,
      startBubbleX: bubble.x,
      startBubbleY: bubble.y,
      slotRect: containerRef?.current?.getBoundingClientRect() || null,
    };
  };

  const handleResizeMouseMove = (e: MouseEvent) => {
    if (!isResizing || !resizeStartRef.current || !onResize) return;

    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;

    const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.startWidth + deltaX));
    const newHeight = Math.max(minHeight, resizeStartRef.current.startHeight + deltaY);

    onResize(newWidth, newHeight);

    // Shift position so top-left corner stays fixed (resize anchored to bottom-right)
    if (onMove && resizeStartRef.current.slotRect) {
      const widthChange = newWidth - resizeStartRef.current.startWidth;
      const heightChange = newHeight - resizeStartRef.current.startHeight;
      const newX = resizeStartRef.current.startBubbleX + (widthChange / 2 / resizeStartRef.current.slotRect.width) * 100;
      const newY = resizeStartRef.current.startBubbleY + (heightChange / 2 / resizeStartRef.current.slotRect.height) * 100;
      onMove(newX, newY);
    }
  };

  const handleResizeMouseUp = () => {
    setIsResizing(false);
    resizeStartRef.current = null;
  };

  // Add resize event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
      };
    }
  }, [isResizing]);

  // Scale handlers (uniform resize for non-text-block types)
  const handleScaleMouseDown = (e: React.MouseEvent) => {
    if (!onScale) return;
    e.preventDefault();
    e.stopPropagation();

    setIsScaling(true);
    const container = containerRef?.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + (bubble.x / 100) * containerRect.width;
    const centerY = containerRect.top + (bubble.y / 100) * containerRect.height;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    scaleStartRef.current = {
      centerX,
      centerY,
      initialDist: Math.sqrt(dx * dx + dy * dy),
      initialScale: bubble.scale || 1,
    };
  };

  const handleScaleMouseMove = (e: MouseEvent) => {
    if (!isScaling || !scaleStartRef.current || !onScale) return;

    const dx = e.clientX - scaleStartRef.current.centerX;
    const dy = e.clientY - scaleStartRef.current.centerY;
    const currentDist = Math.sqrt(dx * dx + dy * dy);

    const ratio = currentDist / scaleStartRef.current.initialDist;
    const newScale = Math.max(0.3, Math.min(3, scaleStartRef.current.initialScale * ratio));
    onScale(Math.round(newScale * 100) / 100);
  };

  const handleScaleMouseUp = () => {
    setIsScaling(false);
    scaleStartRef.current = null;
  };

  // Add scale event listeners
  useEffect(() => {
    if (isScaling) {
      document.addEventListener('mousemove', handleScaleMouseMove);
      document.addEventListener('mouseup', handleScaleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleScaleMouseMove);
        document.removeEventListener('mouseup', handleScaleMouseUp);
      };
    }
  }, [isScaling]);

  return (
    <div
      className="absolute group pointer-events-auto"
      style={{
        left: `${bubble.x}%`,
        top: `${bubble.y}%`,
        transform: `translate(-50%, -50%) scale(${bubble.scale || 1})`,
        zIndex: 10,
        cursor: (isResizing || isScaling) ? 'nwse-resize' : isDragging ? 'grabbing' : (onMove ? 'grab' : 'default'),
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      <svg
        width={estimatedWidth + 20}
        height={estimatedHeight + (isThoughtBubble ? 70 : 30)}
        className="drop-shadow-lg"
      >
        {/* Render bubble based on type */}
        {isThoughtBubble ? (
          <>
            {/* Main cloud shape */}
            <path
              d={bubblePath.mainPath}
              fill="white"
              stroke="black"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Small thought bubbles */}
            {bubblePath.smallBubbles.map((bubble, i) => (
              <circle
                key={`small-${i}`}
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
            fill={isTextBlock ? 'rgba(255, 255, 255, 0.5)' : 'white'}
            stroke={isTextBlock ? 'none' : 'black'}
            strokeWidth={isTextBlock ? 0 : 2}
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
          <div
            className={`font-bold ${bubbleType === 'text-block' ? 'text-left' : 'text-center'} flex items-center ${bubbleType === 'text-block' ? 'justify-start' : 'justify-center'} h-full break-words whitespace-pre-wrap`}
            style={{
              fontFamily: 'var(--font-balsamiq-sans), sans-serif',
              fontSize: `${bubble.fontSize || 14}px`,
            }}
          >
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
              className="bg-green-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-green-800"
              title="Редактировать"
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="bg-brand-orange text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-orange-600"
              title="Удалить"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Resize handle for text blocks — changes width/height, top-left anchored */}
      {isTextBlock && onResize && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-600 border-2 border-white rounded-sm cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          title="Изменить размер"
        >
          <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">⇲</div>
        </div>
      )}

      {/* Scale handle for non-text-block types — uniform scale from center */}
      {!isTextBlock && onScale && (
        <div
          onMouseDown={handleScaleMouseDown}
          className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-600 border-2 border-white rounded-sm cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          title="Масштаб"
        >
          <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">⇲</div>
        </div>
      )}

      {/* Font size controls for text blocks */}
      {isTextBlock && onFontSizeChange && (
        <div className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newSize = (bubble.fontSize || 14) + 2;
              if (newSize <= 32) onFontSizeChange(newSize);
            }}
            className="bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-gray-700"
            title="Увеличить шрифт"
          >
            +
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newSize = (bubble.fontSize || 14) - 2;
              if (newSize >= 8) onFontSizeChange(newSize);
            }}
            className="bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-gray-700"
            title="Уменьшить шрифт"
          >
            −
          </button>
        </div>
      )}
    </div>
  );
}
