import { jsPDF } from "jspdf";
import { Album, Spread, Photo, CropArea, SpeechBubble } from "./types";
import { SPREAD_TEMPLATES, PhotoSlot, getPageSlots, PANORAMIC_BG_TEMPLATE_IDS } from "./spread-templates";

// Print specs from typography
const PAGE_SIZE = 206; // mm — square page
const COVER_WIDTH = 458; // mm — full spread including bleed
const COVER_HEIGHT = 242; // mm — full spread including bleed
const COVER_HALF = COVER_WIDTH / 2; // 229mm per half-page

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

// Crop original image at full 300 DPI quality for PDF
// FORCES aspect ratio to match slot (eliminates gaps/stretching)
const cropImageAtFullQuality = async (
  imageUrl: string,
  cropArea: { x: number; y: number; width: number; height: number },
  targetAspectRatio: number
): Promise<string> => {
  const image = await loadImage(imageUrl);

  const mmToPx = (mm: number) => (mm * 300) / 25.4;
  const MAX_SIZE_MM = 206;
  const maxSizePx = mmToPx(MAX_SIZE_MM);

  let canvasWidth: number;
  let canvasHeight: number;

  if (targetAspectRatio > 1) {
    canvasWidth = maxSizePx;
    canvasHeight = Math.round(maxSizePx / targetAspectRatio);
  } else {
    canvasHeight = maxSizePx;
    canvasWidth = Math.round(maxSizePx * targetAspectRatio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas context not available");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    canvasWidth,
    canvasHeight
  );

  return canvas.toDataURL("image/jpeg", 0.92);
};

// Get CSS font family from Next.js CSS variable
const getCoverTitleFontFamily = (style: 'ice-age' | 'fk-alako'): string => {
  if (typeof document === 'undefined') {
    return style === 'ice-age' ? 'Impact, sans-serif' : 'cursive';
  }
  const varName = style === 'ice-age' ? '--font-ice-age' : '--font-fk-alako';
  const family = getComputedStyle(document.body).getPropertyValue(varName).trim();
  return family || (style === 'ice-age' ? 'Impact, sans-serif' : 'cursive');
};

// Render cover-title bubble to canvas (no SVG shape, just styled text)
const renderCoverTitleToCanvas = (
  bubble: SpeechBubble,
  spreadWidthMm: number,
  spreadHeightMm: number
): { dataUrl: string; widthMm: number; heightMm: number; xMm: number; yMm: number; rotation: number } => {
  const titleStyle = bubble.titleStyle || 'ice-age';
  const fontSize = bubble.fontSize || 64;
  const scale = bubble.scale || 1;
  const rotation = bubble.rotation || 0;

  // Render at 3× for quality
  const renderScale = 3;
  const canvasFontSize = fontSize * renderScale;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: "", widthMm: 0, heightMm: 0, xMm: 0, yMm: 0, rotation: 0 };

  const fontFamily = getCoverTitleFontFamily(titleStyle);
  const fontWeight = titleStyle === 'fk-alako' ? 'normal' : 'bold';
  ctx.font = `${fontWeight} ${canvasFontSize}px ${fontFamily}`;

  const textMetrics = ctx.measureText(bubble.text);
  const textWidth = Math.ceil(textMetrics.width) + canvasFontSize * 0.2; // small padding
  const textHeight = Math.ceil(canvasFontSize * 1.3);

  canvas.width = textWidth;
  canvas.height = textHeight;

  // Re-apply font after resize (canvas reset)
  ctx.font = `${fontWeight} ${canvasFontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Stroke (dark outline)
  const strokeWidth = Math.round(canvasFontSize * 0.045);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = 'round';

  // Shadow
  const shadowOffset = Math.round(canvasFontSize * 0.06);
  ctx.shadowColor = '#000000';
  ctx.shadowOffsetX = shadowOffset;
  ctx.shadowOffsetY = shadowOffset;
  ctx.shadowBlur = 0;

  // Draw stroke first
  ctx.strokeText(bubble.text, textWidth / 2, textHeight / 2);

  // Then fill (white)
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(bubble.text, textWidth / 2, textHeight / 2);

  // Convert pixel size to mm using the spread pixel-to-mm ratio
  // In the editor, the spread is rendered at ~600px → spreadWidthMm mm
  // Cover spread = COVER_WIDTH × COVER_HEIGHT mm displayed at ~600px
  const pixelToMm = spreadWidthMm / 600;
  const scaledWidthPx = (textWidth / renderScale) * scale;
  const scaledHeightPx = (textHeight / renderScale) * scale;

  const widthMm = scaledWidthPx * pixelToMm;
  const heightMm = scaledHeightPx * pixelToMm;

  const xMm = (bubble.x / 100) * spreadWidthMm - widthMm / 2;
  const yMm = (bubble.y / 100) * spreadHeightMm - heightMm / 2;

  return {
    dataUrl: canvas.toDataURL("image/png"),
    widthMm,
    heightMm,
    xMm,
    yMm,
    rotation,
  };
};

// Render speech bubble to canvas for PDF
const renderSpeechBubbleToCanvas = (
  bubble: SpeechBubble,
  spreadWidthMm: number,
  spreadHeightMm: number
): { dataUrl: string; widthMm: number; heightMm: number; xMm: number; yMm: number; rotation: number } => {
  const bubbleType = bubble.type || 'speech';

  // cover-title handled separately
  if (bubbleType === 'cover-title') {
    return renderCoverTitleToCanvas(bubble, spreadWidthMm, spreadHeightMm);
  }

  const textLength = bubble.text.length;
  const padding = 12;
  const isTextBlock = bubbleType === 'text-block';
  const minWidth = 100;
  const minHeight = 60;
  const maxWidth = isTextBlock ? 400 : 300;
  const estimatedWidth = bubble.width || (isTextBlock ? 180 : Math.max(minWidth, Math.min(maxWidth, textLength * 9.5 + padding * 2)));
  const charsPerLine = isTextBlock ? Math.max(10, Math.floor((estimatedWidth - padding * 2) / 9.5)) : 30;
  const estimatedHeight = bubble.height || Math.max(minHeight, Math.ceil(textLength / charsPerLine) * 20 + padding * 2);

  const isTopTail = (bubble.tailDirection || 'bottom-left').includes('top');
  const topPad = isTopTail
    ? (bubbleType === 'thought' ? Math.min(estimatedWidth / 2, estimatedHeight / 2) * 0.4 + 30 : 20)
    : 0;

  const bubbleWidthPx = estimatedWidth + 20;
  const bottomPad = isTopTail ? 12 : (bubbleType === 'thought' ? 70 : (bubbleType === 'speech' ? 30 : 12));
  const bubbleHeightPx = estimatedHeight + topPad + bottomPad;

  const pixelToMmScale = (PAGE_SIZE * 2) / 600;

  const bubbleScale = bubble.scale || 1;
  const bubbleWidthMm = bubbleWidthPx * pixelToMmScale * bubbleScale;
  const bubbleHeightMm = bubbleHeightPx * pixelToMmScale * bubbleScale;

  const scale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = bubbleWidthPx * scale;
  canvas.height = bubbleHeightPx * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: "", widthMm: 0, heightMm: 0, xMm: 0, yMm: 0, rotation: 0 };

  ctx.scale(scale, scale);

  const cx = estimatedWidth / 2 + 10;
  const cy = estimatedHeight / 2 + 10 + topPad;
  const rx = estimatedWidth / 2;
  const ry = estimatedHeight / 2;
  const kappa = 0.551915;
  const ox = rx * kappa;
  const oy = ry * kappa;

  const getSpeechBubblePath = () => {
    const path = new Path2D();
    const direction = bubble.tailDirection || 'bottom-left';

    if (direction === 'bottom-left') {
      path.moveTo(cx + rx, cy);
      path.bezierCurveTo(cx + rx, cy - oy, cx + ox, cy - ry, cx, cy - ry);
      path.bezierCurveTo(cx - ox, cy - ry, cx - rx, cy - oy, cx - rx, cy);
      path.bezierCurveTo(cx - rx, cy + oy, cx - ox, cy + ry, cx - rx * 0.3, cy + ry);
      path.lineTo(cx - rx * 0.5, cy + ry + 15);
      path.lineTo(cx - rx * 0.1, cy + ry);
      path.bezierCurveTo(cx + ox, cy + ry, cx + rx, cy + oy, cx + rx, cy);
    } else if (direction === 'bottom-right') {
      path.moveTo(cx + rx, cy);
      path.bezierCurveTo(cx + rx, cy - oy, cx + ox, cy - ry, cx, cy - ry);
      path.bezierCurveTo(cx - ox, cy - ry, cx - rx, cy - oy, cx - rx, cy);
      path.bezierCurveTo(cx - rx, cy + oy, cx - ox, cy + ry, cx + rx * 0.1, cy + ry);
      path.lineTo(cx + rx * 0.5, cy + ry + 15);
      path.lineTo(cx + rx * 0.3, cy + ry);
      path.bezierCurveTo(cx + rx, cy + ry, cx + rx, cy + oy, cx + rx, cy);
    } else if (direction === 'top-left') {
      path.moveTo(cx + rx, cy);
      path.bezierCurveTo(cx + rx, cy - oy, cx + ox, cy - ry, cx - rx * 0.1, cy - ry);
      path.lineTo(cx - rx * 0.5, cy - ry - 15);
      path.lineTo(cx - rx * 0.3, cy - ry);
      path.bezierCurveTo(cx - rx, cy - ry, cx - rx, cy - oy, cx - rx, cy);
      path.bezierCurveTo(cx - rx, cy + oy, cx - ox, cy + ry, cx, cy + ry);
      path.bezierCurveTo(cx + ox, cy + ry, cx + rx, cy + oy, cx + rx, cy);
    } else if (direction === 'top-right') {
      path.moveTo(cx + rx, cy);
      path.bezierCurveTo(cx + rx, cy - oy, cx + ox, cy - ry, cx + rx * 0.3, cy - ry);
      path.lineTo(cx + rx * 0.5, cy - ry - 15);
      path.lineTo(cx + rx * 0.1, cy - ry);
      path.bezierCurveTo(cx, cy - ry, cx - ox, cy - ry, cx - rx, cy - oy);
      path.lineTo(cx - rx, cy);
      path.bezierCurveTo(cx - rx, cy + oy, cx - ox, cy + ry, cx, cy + ry);
      path.bezierCurveTo(cx + ox, cy + ry, cx + rx, cy + oy, cx + rx, cy);
    }

    path.closePath();
    return path;
  };

  const getThoughtBubblePath = () => {
    const path = new Path2D();
    const numBumps = 10;
    const bumpSize = Math.min(rx, ry) * 0.4;

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

      if (i === 0) path.moveTo(x1, y1);
      path.quadraticCurveTo(cx1, cy1, x2, y2);
    }

    path.closePath();
    return path;
  };

  const getRoundedRectPath = (r: number = 8) => {
    const path = new Path2D();
    const x = 10, y = 10, w = estimatedWidth, h = estimatedHeight;
    path.moveTo(x + r, y);
    path.lineTo(x + w - r, y);
    path.quadraticCurveTo(x + w, y, x + w, y + r);
    path.lineTo(x + w, y + h - r);
    path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    path.lineTo(x + r, y + h);
    path.quadraticCurveTo(x, y + h, x, y + h - r);
    path.lineTo(x, y + r);
    path.quadraticCurveTo(x, y, x + r, y);
    path.closePath();
    return path;
  };

  if (bubbleType === 'thought') {
    const cloudPath = getThoughtBubblePath();
    ctx.fillStyle = "white";
    ctx.fill(cloudPath);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke(cloudPath);
  } else {
    const bubblePath = bubbleType === 'annotation' ? getRoundedRectPath(8) :
                       bubbleType === 'text-block' ? getRoundedRectPath(6) :
                       getSpeechBubblePath();

    if (bubbleType === 'text-block') {
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.fill(bubblePath);
    } else {
      ctx.fillStyle = "white";
      ctx.fill(bubblePath);
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.stroke(bubblePath);
    }
  }

  if (bubbleType === 'thought') {
    const direction = bubble.tailDirection || 'bottom-left';
    const bumpSize = Math.min(rx, ry) * 0.4;
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

    smallBubbles.forEach(sb => {
      ctx.beginPath();
      ctx.arc(sb.cx, sb.cy, sb.r, 0, 2 * Math.PI);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  ctx.fillStyle = "black";
  const fontSize = bubble.fontSize || 14;
  ctx.font = `bold ${fontSize}px "Balsamiq Sans", Arial, sans-serif`;
  ctx.textAlign = bubbleType === 'text-block' ? 'left' : 'center';
  ctx.textBaseline = "middle";

  const textMaxWidth = estimatedWidth - padding * 2;
  const lineHeight = fontSize * 1.2;
  const allLines: string[] = [];

  const paragraphs = bubble.text.split('\n');
  paragraphs.forEach(paragraph => {
    if (!paragraph.trim()) { allLines.push(''); return; }
    const words = paragraph.split(' ');
    let currentLine = '';
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > textMaxWidth && currentLine) {
        allLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) allLines.push(currentLine);
  });

  const startY = cy - ((allLines.length - 1) * lineHeight) / 2;
  const textX = bubbleType === 'text-block' ? padding + 10 : cx;
  allLines.forEach((line, i) => {
    ctx.fillText(line, textX, startY + i * lineHeight);
  });

  const xMm = (bubble.x / 100) * spreadWidthMm;
  const yMm = (bubble.y / 100) * spreadHeightMm;

  return {
    dataUrl: canvas.toDataURL("image/png"),
    widthMm: bubbleWidthMm,
    heightMm: bubbleHeightMm,
    xMm: xMm - bubbleWidthMm / 2,
    yMm: yMm - bubbleHeightMm / 2,
    rotation: 0, // Regular bubbles don't rotate
  };
};

// Place a bubble image in the PDF (with optional rotation around its center)
const addBubbleToPDF = (
  pdf: jsPDF,
  dataUrl: string,
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number,
  rotation: number
) => {
  if (!dataUrl) return;

  if (rotation === 0) {
    pdf.addImage(dataUrl, "PNG", xMm, yMm, widthMm, heightMm, undefined, "FAST");
    return;
  }

  // jsPDF addImage rotates around top-left corner.
  // We want rotation around center, so adjust top-left position.
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = xMm + widthMm / 2;
  const cy = yMm + heightMm / 2;
  // New top-left after rotating the rectangle around its center:
  const newX = cx - (widthMm / 2) * cos + (heightMm / 2) * sin;
  const newY = cy - (widthMm / 2) * sin - (heightMm / 2) * cos;

  pdf.addImage(dataUrl, "PNG", newX, newY, widthMm, heightMm, undefined, "FAST", rotation);
};

// Generate page with multiple photos according to template
const generatePageWithSlots = async (
  pdf: jsPDF,
  photos: Photo[],
  slots: PhotoSlot[],
  templateId: string,
  pageWidthMm: number,
  pageHeightMm: number,
  offsetX: number = 0
): Promise<void> => {
  for (let i = 0; i < slots.length; i++) {
    const photo = photos[i];
    const slot = slots[i];

    if (!photo?.url || photo?.hidden) continue;

    try {
      const imageUrl = photo.originalUrl || photo.url;
      const cropArea = photo.cropArea;

      const slotX = slot.x * pageWidthMm + offsetX;
      const slotY = slot.y * pageHeightMm;
      const slotWidth = slot.width * pageWidthMm;
      const slotHeight = slot.height * pageHeightMm;
      const slotAspect = slotWidth / slotHeight;

      let finalImageUrl: string;

      if (cropArea && imageUrl !== photo.url) {
        finalImageUrl = await cropImageAtFullQuality(imageUrl, cropArea, slotAspect);
      } else {
        finalImageUrl = imageUrl;
      }

      const image = await loadImage(finalImageUrl);
      const imageAspect = image.width / image.height;
      const aspectDiff = Math.abs(imageAspect - slotAspect);

      let photoWidth: number, photoHeight: number, photoX: number, photoY: number;

      if (aspectDiff < 0.02) {
        photoWidth = slotWidth;
        photoHeight = slotHeight;
        photoX = slotX;
        photoY = slotY;
      } else {
        if (imageAspect > slotAspect) {
          photoWidth = slotWidth;
          photoHeight = slotWidth / imageAspect;
          photoX = slotX;
          photoY = slotY + (slotHeight - photoHeight) / 2;
        } else {
          photoHeight = slotHeight;
          photoWidth = slotHeight * imageAspect;
          photoX = slotX + (slotWidth - photoWidth) / 2;
          photoY = slotY;
        }
      }

      pdf.addImage(finalImageUrl, "JPEG", photoX, photoY, photoWidth, photoHeight, undefined, "FAST");

      const isFullPage = slot.width >= 1.0 && slot.height >= 1.0;
      const isBackground = PANORAMIC_BG_TEMPLATE_IDS.includes(templateId) && i === 0;
      if (!isFullPage && !isBackground) {
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.75);
        pdf.rect(photoX, photoY, photoWidth, photoHeight, 'S');
      }
    } catch (error) {
      console.error("Error adding photo to PDF:", error);
    }
  }
};

// Generate bubbles overlay for a spread
const generateBubblesOverlay = (
  pdf: jsPDF,
  bubbles: SpeechBubble[],
  spreadWidthMm: number,
  spreadHeightMm: number
) => {
  for (const bubble of bubbles) {
    const bubbleData = renderSpeechBubbleToCanvas(bubble, spreadWidthMm, spreadHeightMm);
    if (bubbleData.dataUrl) {
      addBubbleToPDF(
        pdf,
        bubbleData.dataUrl,
        bubbleData.xMm,
        bubbleData.yMm,
        bubbleData.widthMm,
        bubbleData.heightMm,
        bubbleData.rotation
      );
    }
  }
};

// Generate cover spread page (458×242mm)
const generateCoverSpreadPage = async (pdf: jsPDF, cover: Spread): Promise<void> => {
  const template = SPREAD_TEMPLATES.find(t => t.id === 'cover');
  if (!template) return;

  pdf.addPage([COVER_WIDTH, COVER_HEIGHT], "landscape");

  // Left half (back cover): 0 to COVER_HALF, full height
  const leftSlots = getPageSlots(template, 'left', true);
  await generatePageWithSlots(pdf, cover.leftPhotos, leftSlots, 'cover', COVER_HALF, COVER_HEIGHT, 0);

  // Right half (front cover): COVER_HALF to COVER_WIDTH, full height
  const rightSlots = getPageSlots(template, 'right', true);
  await generatePageWithSlots(pdf, cover.rightPhotos, rightSlots, 'cover', COVER_HALF, COVER_HEIGHT, COVER_HALF);

  // Bubbles (cover-title + any regular bubbles)
  if (cover.bubbles && cover.bubbles.length > 0) {
    generateBubblesOverlay(pdf, cover.bubbles, COVER_WIDTH, COVER_HEIGHT);
  }
};

// Generate all regular spreads pages
const generateSpreadsPages = async (pdf: jsPDF, album: Album): Promise<void> => {
  for (const spread of album.spreads) {
    const template = SPREAD_TEMPLATES.find(t => t.id === spread.templateId);
    if (!template) continue;

    const SPREAD_WIDTH = PAGE_SIZE * 2;
    pdf.addPage([SPREAD_WIDTH, PAGE_SIZE], "landscape");

    const leftSlots = getPageSlots(template, 'left', album.withGaps);
    await generatePageWithSlots(pdf, spread.leftPhotos, leftSlots, template.id, PAGE_SIZE, PAGE_SIZE, 0);

    const rightSlots = getPageSlots(template, 'right', album.withGaps);
    await generatePageWithSlots(pdf, spread.rightPhotos, rightSlots, template.id, PAGE_SIZE, PAGE_SIZE, PAGE_SIZE);

    if (spread.bubbles && spread.bubbles.length > 0) {
      generateBubblesOverlay(pdf, spread.bubbles, SPREAD_WIDTH, PAGE_SIZE);
    }
  }
};

// --- Public export functions ---

// Combined PDF: cover (if exists) + all spreads
export async function generateCombinedPDF(album: Album): Promise<Blob> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [PAGE_SIZE * 2, PAGE_SIZE], compress: true });
  pdf.deletePage(1);

  if (album.cover) {
    await generateCoverSpreadPage(pdf, album.cover);
  }
  await generateSpreadsPages(pdf, album);

  return pdf.output("blob");
}

// Cover-only PDF (458×242mm)
export async function generateCoverPDF(album: Album): Promise<Blob> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [COVER_WIDTH, COVER_HEIGHT], compress: true });
  pdf.deletePage(1);

  if (album.cover) {
    await generateCoverSpreadPage(pdf, album.cover);
  }

  return pdf.output("blob");
}

// Spreads-only PDF (no cover)
export async function generateSpreadsPDF(album: Album): Promise<Blob> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [PAGE_SIZE * 2, PAGE_SIZE], compress: true });
  pdf.deletePage(1);

  await generateSpreadsPages(pdf, album);

  return pdf.output("blob");
}

// Legacy alias for backward compatibility
export const generateAlbumPDF = generateCombinedPDF;

// Download PDF
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
