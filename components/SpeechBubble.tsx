import { SpeechBubble as SpeechBubbleType } from "@/lib/types";

interface SpeechBubbleProps {
  bubble: SpeechBubbleType;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function SpeechBubble({ bubble, onEdit, onDelete }: SpeechBubbleProps) {
  // Calculate bubble size based on text length
  const textLength = bubble.text.length;
  const minWidth = 100;
  const minHeight = 60;
  const padding = 12;

  // Estimate size (rough calculation, will auto-adjust with foreignObject)
  const estimatedWidth = Math.max(minWidth, Math.min(300, textLength * 8 + padding * 2));
  const estimatedHeight = Math.max(minHeight, Math.ceil(textLength / 30) * 20 + padding * 2);

  // Tail position based on direction
  const getTailPath = () => {
    const w = estimatedWidth;
    const h = estimatedHeight;

    switch (bubble.tailDirection || 'bottom-left') {
      case 'bottom-left':
        return `M 20,${h} L 10,${h + 15} L 30,${h}`;
      case 'bottom-right':
        return `M ${w - 30},${h} L ${w - 10},${h + 15} L ${w - 20},${h}`;
      case 'top-left':
        return `M 20,0 L 10,-15 L 30,0`;
      case 'top-right':
        return `M ${w - 30},0 L ${w - 10},-15 L ${w - 20},0`;
    }
  };

  return (
    <div
      className="absolute group"
      style={{
        left: `${bubble.x}%`,
        top: `${bubble.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
      }}
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

        {/* Tail */}
        <path
          d={getTailPath()}
          fill="white"
          stroke="black"
          strokeWidth="2"
          transform={`translate(${10}, ${bubble.tailDirection?.startsWith('top') ? 10 : 10})`}
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
