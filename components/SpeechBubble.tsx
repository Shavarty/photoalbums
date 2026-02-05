import React, { useState, useRef, useEffect } from "react";
import { SpeechBubble as SpeechBubbleType } from "@/lib/types";

interface SpeechBubbleProps {
  bubble: SpeechBubbleType;
  containerRef?: React.RefObject<HTMLDivElement | null>; // Positioning container for drag (spread overlay)
  containerScale?: number; // Scale factor applied by parent based on container width
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: (x: number, y: number) => void;
  onResize?: (width: number, height: number) => void;
  onScale?: (scale: number) => void;
  onFontSizeChange?: (fontSize: number) => void;
}

// Extract clientX/clientY from either MouseEvent or TouchEvent
function getXY(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
  if ('touches' in e && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  if ('changedTouches' in e && e.changedTouches.length > 0) {
    return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
  }
  return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
}

export default function SpeechBubble({ bubble, containerRef, containerScale = 1, onEdit, onDelete, onMove, onResize, onScale, onFontSizeChange }: SpeechBubbleProps) {
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

  const isTextBlock = bubbleType === 'text-block';
  const minWidth = isTextBlock ? 100 : 100;
  const minHeight = 60;
  const maxWidth = isTextBlock ? 400 : 300;

  // Text blocks: fixed default width 180px, height grows with content.
  // Others: width scales with text length.
  const estimatedWidth = bubble.width || (isTextBlock ? 180 : Math.max(minWidth, Math.min(maxWidth, textLength * 8 + padding * 2)));
  const charsPerLine = isTextBlock ? Math.max(10, Math.floor((estimatedWidth - padding * 2) / 8)) : 30;
  const estimatedHeight = bubble.height || Math.max(minHeight, Math.ceil(textLength / charsPerLine) * 20 + padding * 2);

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

  // --- Drag handlers (mouse + touch) ---
  const startDrag = (clientX: number, clientY: number) => {
    if (!onMove) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      bubbleX: bubble.x,
      bubbleY: bubble.y,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.stopPropagation();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMove_ = (e: MouseEvent | TouchEvent) => {
      if (!dragStartRef.current || !onMove) return;
      const { clientX, clientY } = getXY(e);

      const parentRect = containerRef?.current?.getBoundingClientRect();
      if (!parentRect) return;

      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;

      const deltaXPercent = (deltaX / parentRect.width) * 100;
      const deltaYPercent = (deltaY / parentRect.height) * 100;

      const newX = Math.max(5, Math.min(95, dragStartRef.current.bubbleX + deltaXPercent));
      const newY = Math.max(5, Math.min(95, dragStartRef.current.bubbleY + deltaYPercent));

      onMove(newX, newY);
    };

    const onEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    document.addEventListener('mousemove', onMove_);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove_, { passive: false });
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('mousemove', onMove_);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove_);
      document.removeEventListener('touchend', onEnd);
    };
  }, [isDragging]);

  const bubblePath = getBubblePath();
  const isThoughtBubble = bubbleType === 'thought' && typeof bubblePath === 'object';

  // --- Resize handlers (text-block only, mouse + touch) ---
  const startResize = (clientX: number, clientY: number) => {
    if (!onResize || bubbleType !== 'text-block') return;
    setIsResizing(true);
    resizeStartRef.current = {
      x: clientX,
      y: clientY,
      startWidth: estimatedWidth,
      startHeight: estimatedHeight,
      startBubbleX: bubble.x,
      startBubbleY: bubble.y,
      slotRect: containerRef?.current?.getBoundingClientRect() || null,
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startResize(e.clientX, e.clientY);
  };

  const handleResizeTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startResize(e.touches[0].clientX, e.touches[0].clientY);
  };

  useEffect(() => {
    if (!isResizing) return;

    const onMove_ = (e: MouseEvent | TouchEvent) => {
      if (!resizeStartRef.current || !onResize) return;
      if ('cancelable' in e && e.cancelable) e.preventDefault();
      const { clientX, clientY } = getXY(e);

      const deltaX = clientX - resizeStartRef.current.x;
      const deltaY = clientY - resizeStartRef.current.y;

      const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.startWidth + deltaX));
      const newHeight = Math.max(minHeight, resizeStartRef.current.startHeight + deltaY);

      onResize(newWidth, newHeight);

      if (onMove && resizeStartRef.current.slotRect) {
        const widthChange = newWidth - resizeStartRef.current.startWidth;
        const heightChange = newHeight - resizeStartRef.current.startHeight;
        const newX = resizeStartRef.current.startBubbleX + (widthChange / 2 / resizeStartRef.current.slotRect.width) * 100;
        const newY = resizeStartRef.current.startBubbleY + (heightChange / 2 / resizeStartRef.current.slotRect.height) * 100;
        onMove(newX, newY);
      }
    };

    const onEnd = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    document.addEventListener('mousemove', onMove_);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove_, { passive: false });
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('mousemove', onMove_);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove_);
      document.removeEventListener('touchend', onEnd);
    };
  }, [isResizing]);

  // --- Scale handlers (non-text-block, mouse + touch) ---
  const startScale = (clientX: number, clientY: number) => {
    if (!onScale) return;
    const container = containerRef?.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + (bubble.x / 100) * containerRect.width;
    const centerY = containerRect.top + (bubble.y / 100) * containerRect.height;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    setIsScaling(true);
    scaleStartRef.current = {
      centerX,
      centerY,
      initialDist: Math.sqrt(dx * dx + dy * dy) || 1,
      initialScale: bubble.scale || 1,
    };
  };

  const handleScaleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startScale(e.clientX, e.clientY);
  };

  const handleScaleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startScale(e.touches[0].clientX, e.touches[0].clientY);
  };

  useEffect(() => {
    if (!isScaling) return;

    const onMove_ = (e: MouseEvent | TouchEvent) => {
      if (!scaleStartRef.current || !onScale) return;
      if ('cancelable' in e && e.cancelable) e.preventDefault();
      const { clientX, clientY } = getXY(e);

      const dx = clientX - scaleStartRef.current.centerX;
      const dy = clientY - scaleStartRef.current.centerY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);

      const ratio = currentDist / scaleStartRef.current.initialDist;
      const newScale = Math.max(0.3, Math.min(3, scaleStartRef.current.initialScale * ratio));
      onScale(Math.round(newScale * 100) / 100);
    };

    const onEnd = () => {
      setIsScaling(false);
      scaleStartRef.current = null;
    };

    document.addEventListener('mousemove', onMove_);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove_, { passive: false });
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('mousemove', onMove_);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove_);
      document.removeEventListener('touchend', onEnd);
    };
  }, [isScaling]);

  const effectiveScale = (bubble.scale || 1) * containerScale;

  return (
    <div
      className="absolute group pointer-events-auto"
      style={{
        left: `${bubble.x}%`,
        top: `${bubble.y}%`,
        transform: `translate(-50%, -50%) scale(${effectiveScale})`,
        zIndex: 10,
        cursor: (isResizing || isScaling) ? 'nwse-resize' : isDragging ? 'grabbing' : (onMove ? 'grab' : 'default'),
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
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
            fill={isTextBlock ? 'rgba(255, 255, 255, 0.75)' : 'white'}
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

      {/* Edit/Delete buttons — always visible on mobile, hover on desktop */}
      {(onEdit || onDelete) && (
        <div className="absolute -top-2 -right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex gap-1">
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

      {/* Resize handle for text blocks — always visible on mobile, hover on desktop */}
      {isTextBlock && onResize && (
        <div
          className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-5 sm:h-5 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          onMouseDown={handleResizeMouseDown}
          onTouchStart={handleResizeTouchStart}
          style={{ touchAction: 'none' }}
        >
          <div className="w-5 h-5 bg-gray-600 border-2 border-white rounded-sm cursor-nwse-resize shadow-lg flex items-center justify-center text-white text-xs font-bold">⇲</div>
        </div>
      )}

      {/* Scale handle for non-text-block types — always visible on mobile, hover on desktop */}
      {!isTextBlock && onScale && (
        <div
          className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-5 sm:h-5 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          onMouseDown={handleScaleMouseDown}
          onTouchStart={handleScaleTouchStart}
          style={{ touchAction: 'none' }}
        >
          <div className="w-5 h-5 bg-gray-600 border-2 border-white rounded-sm cursor-nwse-resize shadow-lg flex items-center justify-center text-white text-xs font-bold">⇲</div>
        </div>
      )}

      {/* Font size controls for text blocks — always visible on mobile, hover on desktop */}
      {isTextBlock && onFontSizeChange && (
        <div className="absolute -top-2 -left-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col gap-1">
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
