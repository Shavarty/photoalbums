import React, { useState, useRef, useEffect } from "react";
import { SpeechBubble as SpeechBubbleType } from "@/lib/types";

interface SpeechBubbleProps {
  bubble: SpeechBubbleType;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  containerScale?: number; // applied to SVG only via viewBox — buttons stay fixed size
  isTouch?: boolean; // true on touch devices regardless of orientation
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: (x: number, y: number) => void;
  onResize?: (width: number, height: number) => void;
  onScale?: (scale: number) => void;
  onFontSizeChange?: (fontSize: number) => void;
}

function getXY(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
  if ('touches' in e && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  if ('changedTouches' in e && e.changedTouches.length > 0) {
    return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
  }
  return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
}

export default function SpeechBubble({ bubble, containerRef, containerScale = 1, isTouch = false, onEdit, onDelete, onMove, onResize, onScale, onFontSizeChange }: SpeechBubbleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; bubbleX: number; bubbleY: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; startWidth: number; startHeight: number; startBubbleX: number; startBubbleY: number; slotRect: DOMRect | null } | null>(null);
  const scaleStartRef = useRef<{ centerX: number; centerY: number; initialDist: number; initialScale: number } | null>(null);
  // Ref so resize effect closure always reads the latest containerScale
  const containerScaleRef = useRef(containerScale);
  containerScaleRef.current = containerScale;

  const bubbleType = bubble.type || 'speech';
  const textLength = bubble.text.length;
  const padding = 12;

  const isTextBlock = bubbleType === 'text-block';
  const minWidth = isTextBlock ? 100 : 100;
  const minHeight = 60;
  const maxWidth = isTextBlock ? 400 : 300;

  const estimatedWidth = bubble.width || (isTextBlock ? 180 : Math.max(minWidth, Math.min(maxWidth, textLength * 9.5 + padding * 2)));
  const charsPerLine = isTextBlock ? Math.max(10, Math.floor((estimatedWidth - padding * 2) / 9.5)) : 30;
  const estimatedHeight = bubble.height || Math.max(minHeight, Math.ceil(textLength / charsPerLine) * 20 + padding * 2);

  // Top-tail shift: pad above ellipse so tail / small-circles don't clip at y < 0.
  // speech tip extends 15px above ellipse → topPad = 20.
  // thought circles extend bumpSize + 32px above → topPad = bumpSize + 30.
  const isTopTail = (bubble.tailDirection || 'bottom-left').includes('top');
  const topPad = isTopTail
    ? (bubbleType === 'thought' ? Math.min(estimatedWidth / 2, estimatedHeight / 2) * 0.4 + 30 : 20)
    : 0;

  // --- Bubble shape generators ---
  const getSpeechBubblePath = () => {
    const cx = estimatedWidth / 2 + 10;
    const cy = estimatedHeight / 2 + 10 + topPad;
    const rx = estimatedWidth / 2;
    const ry = estimatedHeight / 2;
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
    const cx = estimatedWidth / 2 + 10;
    const cy = estimatedHeight / 2 + 10 + topPad;
    const rx = estimatedWidth / 2;
    const ry = estimatedHeight / 2;
    const numBumps = 10;
    const bumpSize = Math.min(rx, ry) * 0.4;

    let path = '';
    for (let i = 0; i < numBumps; i++) {
      const angle = (i / numBumps) * 2 * Math.PI;
      const nextAngle = ((i + 1) / numBumps) * 2 * Math.PI;
      const x1 = cx + rx * Math.cos(angle);
      const y1 = cy + ry * Math.sin(angle);
      const x2 = cx + rx * Math.cos(nextAngle);
      const y2 = cy + ry * Math.sin(nextAngle);
      const midAngle = (angle + nextAngle) / 2;
      const midX = cx + rx * Math.cos(midAngle);
      const midY = cy + ry * Math.sin(midAngle);
      const cx1 = midX + bumpSize * Math.cos(midAngle);
      const cy1 = midY + bumpSize * Math.sin(midAngle);
      if (i === 0) path += `M ${x1},${y1}`;
      path += ` Q ${cx1},${cy1} ${x2},${y2}`;
    }
    path += ' Z';

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
    const x = 10, y = 10, w = estimatedWidth, h = estimatedHeight, r = 8;
    return `M ${x + r},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r} L ${x + w},${y + h - r} Q ${x + w},${y + h} ${x + w - r},${y + h} L ${x + r},${y + h} Q ${x},${y + h} ${x},${y + h - r} L ${x},${y + r} Q ${x},${y} ${x + r},${y} Z`;
  };

  const getTextBlockPath = () => {
    const x = 10, y = 10, w = estimatedWidth, h = estimatedHeight, r = 6;
    return `M ${x + r},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r} L ${x + w},${y + h - r} Q ${x + w},${y + h} ${x + w - r},${y + h} L ${x + r},${y + h} Q ${x},${y + h} ${x},${y + h - r} L ${x},${y + r} Q ${x},${y} ${x + r},${y} Z`;
  };

  const getBubblePath = () => {
    switch (bubbleType) {
      case 'thought': return getThoughtBubblePath();
      case 'annotation': return getAnnotationPath();
      case 'text-block': return getTextBlockPath();
      case 'speech':
      default: return getSpeechBubblePath();
    }
  };

  // --- Drag (mouse + touch) ---
  const startDrag = (clientX: number, clientY: number) => {
    if (!onMove) return;
    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY, bubbleX: bubble.x, bubbleY: bubble.y };
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
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
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
      const newX = Math.max(5, Math.min(95, dragStartRef.current.bubbleX + (deltaX / parentRect.width) * 100));
      const newY = Math.max(5, Math.min(95, dragStartRef.current.bubbleY + (deltaY / parentRect.height) * 100));
      onMove(newX, newY);
    };
    const onEnd = () => { setIsDragging(false); dragStartRef.current = null; };
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

  // --- Resize (text-block only, mouse + touch) ---
  const startResize = (clientX: number, clientY: number) => {
    if (!onResize || bubbleType !== 'text-block') return;
    setIsResizing(true);
    resizeStartRef.current = {
      x: clientX, y: clientY,
      startWidth: estimatedWidth, startHeight: estimatedHeight,
      startBubbleX: bubble.x, startBubbleY: bubble.y,
      slotRect: containerRef?.current?.getBoundingClientRect() || null,
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); startResize(e.clientX, e.clientY); };
  const handleResizeTouchStart = (e: React.TouchEvent) => { e.preventDefault(); e.stopPropagation(); startResize(e.touches[0].clientX, e.touches[0].clientY); };

  useEffect(() => {
    if (!isResizing) return;
    const onMove_ = (e: MouseEvent | TouchEvent) => {
      if (!resizeStartRef.current || !onResize) return;
      if ('cancelable' in e && e.cancelable) e.preventDefault();
      const { clientX, clientY } = getXY(e);
      const scale = containerScaleRef.current;
      const deltaX = clientX - resizeStartRef.current.x;
      const deltaY = clientY - resizeStartRef.current.y;
      // Screen deltas → bubble internal coords (SVG is rendered at containerScale)
      const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.startWidth + deltaX / scale));
      const newHeight = Math.max(minHeight, resizeStartRef.current.startHeight + deltaY / scale);
      onResize(newWidth, newHeight);
      // Shift position to keep top-left fixed (screen-pixel deltas, containerScale cancels)
      if (onMove && resizeStartRef.current.slotRect) {
        const newX = resizeStartRef.current.startBubbleX + (deltaX / 2 / resizeStartRef.current.slotRect.width) * 100;
        const newY = resizeStartRef.current.startBubbleY + (deltaY / 2 / resizeStartRef.current.slotRect.height) * 100;
        onMove(newX, newY);
      }
    };
    const onEnd = () => { setIsResizing(false); resizeStartRef.current = null; };
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

  // --- Scale (non-text-block, mouse + touch) ---
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
    scaleStartRef.current = { centerX, centerY, initialDist: Math.sqrt(dx * dx + dy * dy) || 1, initialScale: bubble.scale || 1 };
  };

  const handleScaleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); startScale(e.clientX, e.clientY); };
  const handleScaleTouchStart = (e: React.TouchEvent) => { e.preventDefault(); e.stopPropagation(); startScale(e.touches[0].clientX, e.touches[0].clientY); };

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
    const onEnd = () => { setIsScaling(false); scaleStartRef.current = null; };
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

  // SVG original coordinate space
  const svgW = estimatedWidth + 20;
  const bottomPad = isTopTail ? 12 : (isThoughtBubble ? 70 : (bubbleType === 'speech' ? 30 : 12));
  const svgH = estimatedHeight + topPad + bottomPad;

  // Visibility: touch → always visible; desktop → hover-reveal
  const visibleCls = isTouch ? 'opacity-100' : 'opacity-0 group-hover:opacity-100';

  return (
    <div
      className="absolute group pointer-events-auto"
      style={{
        left: `${bubble.x}%`,
        top: `${bubble.y}%`,
        // Only user-controlled scale here; containerScale is on the SVG via viewBox
        transform: `translate(-50%, -50%) scale(${bubble.scale || 1})`,
        zIndex: 10,
        cursor: (isResizing || isScaling) ? 'nwse-resize' : isDragging ? 'grabbing' : (onMove ? 'grab' : 'default'),
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={(e) => e.stopPropagation()}
    >
      {/* SVG scales with containerScale via viewBox; buttons below are unaffected */}
      <svg
        width={svgW * containerScale}
        height={svgH * containerScale}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="drop-shadow-lg"
      >
        {isThoughtBubble ? (
          <>
            <path d={bubblePath.mainPath} fill="white" stroke="black" strokeWidth="2" strokeLinejoin="round" />
            {bubblePath.smallBubbles.map((b, i) => (
              <circle key={`small-${i}`} cx={b.cx} cy={b.cy} r={b.r} fill="white" stroke="black" strokeWidth="2" />
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
        <foreignObject x={padding + 10} y={padding + 10 + topPad} width={estimatedWidth - padding * 2} height={estimatedHeight - padding * 2}>
          <div
            className={`font-bold ${isTextBlock ? 'text-left justify-start' : 'text-center justify-center'} flex items-center h-full break-words whitespace-pre-wrap`}
            style={{ fontFamily: 'var(--font-balsamiq-sans), sans-serif', fontSize: `${bubble.fontSize || 14}px`, lineHeight: 1.2 }}
          >
            {bubble.text}
          </div>
        </foreignObject>
      </svg>

      {/* Edit / Delete — w-5 h-5 uniform, positioned relative to scaled SVG size */}
      {(onEdit || onDelete) && (
        <div className={`absolute flex gap-1 ${visibleCls} transition-opacity`} style={{ top: '-8px', right: '-8px' }}>
          {onEdit && (
            <button onClick={onEdit} className="bg-green-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-green-800" title="Редактировать">✏️</button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="bg-brand-orange text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-orange-600" title="Удалить">✕</button>
          )}
        </div>
      )}

      {/* Resize handle (text-block) — w-5 h-5 uniform, positioned at scaled SVG bottom-right */}
      {isTextBlock && onResize && (
        <div
          className={`absolute flex items-center justify-center ${visibleCls} transition-opacity`}
          style={{ bottom: '-4px', right: '-4px', width: '20px', height: '20px', touchAction: 'none' }}
          onMouseDown={handleResizeMouseDown}
          onTouchStart={handleResizeTouchStart}
        >
          <div className="w-5 h-5 bg-gray-600 border-2 border-white rounded-sm cursor-nwse-resize shadow-lg flex items-center justify-center text-white text-xs font-bold">⇲</div>
        </div>
      )}

      {/* Scale handle (non-text-block) — w-5 h-5 uniform */}
      {!isTextBlock && onScale && (
        <div
          className={`absolute flex items-center justify-center ${visibleCls} transition-opacity`}
          style={{ bottom: '-4px', right: '-4px', width: '20px', height: '20px', touchAction: 'none' }}
          onMouseDown={handleScaleMouseDown}
          onTouchStart={handleScaleTouchStart}
        >
          <div className="w-5 h-5 bg-gray-600 border-2 border-white rounded-sm cursor-nwse-resize shadow-lg flex items-center justify-center text-white text-xs font-bold">⇲</div>
        </div>
      )}

      {/* Font size +/− (text-block) — w-5 h-5 uniform */}
      {isTextBlock && onFontSizeChange && (
        <div className={`absolute flex flex-col gap-1 ${visibleCls} transition-opacity`} style={{ top: '-8px', left: '-8px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); const s = (bubble.fontSize || 14) + 2; if (s <= 32) onFontSizeChange(s); }}
            className="bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-gray-700"
            title="Увеличить шрифт"
          >+</button>
          <button
            onClick={(e) => { e.stopPropagation(); const s = (bubble.fontSize || 14) - 2; if (s >= 8) onFontSizeChange(s); }}
            className="bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-gray-700"
            title="Уменьшить шрифт"
          >−</button>
        </div>
      )}
    </div>
  );
}
