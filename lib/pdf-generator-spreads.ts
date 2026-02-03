import { jsPDF } from "jspdf";
import { Album, Spread, Photo, CropArea, SpeechBubble } from "./types";
import { SPREAD_TEMPLATES, PhotoSlot, getPageSlots } from "./spread-templates";

// Print specs from typography
const PAGE_SIZE = 206; // mm
const COVER_WIDTH = 458; // mm
const COVER_HEIGHT = 242; // mm
const DPI = 300;

const mmToPx = (mm: number): number => {
  return (mm * DPI) / 25.4;
};

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

  // Target size at 300 DPI with SLOT aspect ratio
  const mmToPx = (mm: number) => (mm * 300) / 25.4;
  const MAX_SIZE_MM = 206; // Full page size
  const maxSizePx = mmToPx(MAX_SIZE_MM);

  // Calculate canvas size based on TARGET (slot) aspect ratio
  let canvasWidth: number;
  let canvasHeight: number;

  if (targetAspectRatio > 1) {
    // Wider than tall
    canvasWidth = maxSizePx;
    canvasHeight = Math.round(maxSizePx / targetAspectRatio);
  } else {
    // Taller than wide
    canvasHeight = maxSizePx;
    canvasWidth = Math.round(maxSizePx * targetAspectRatio);
  }

  console.log(`Crop at 300 DPI: ${canvasWidth}x${canvasHeight}px (target aspect: ${targetAspectRatio.toFixed(3)})`);

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas context not available");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw cropped area - slight aspect adjustment to match target
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

// Render text to canvas (Cyrillic support)
const renderTextToCanvas = (
  text: string,
  width: number,
  height: number
): string => {
  const canvas = document.createElement("canvas");
  // Use 300 DPI for text, matching photo resolution
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Solid black background (no transparency issues in PDF)
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = `${Math.floor(height * 0.4)}px "Balsamiq Sans", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > (canvas.width - 20) && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = height / (lines.length + 0.5);
  const startY = (canvas.height - (lines.length * lineHeight)) / 2 + lineHeight / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
  });

  return canvas.toDataURL("image/png");
};

// Render speech bubble to canvas for PDF
const renderSpeechBubbleToCanvas = (
  bubble: SpeechBubble,
  slotWidthMm: number,
  slotHeightMm: number
): { dataUrl: string; widthMm: number; heightMm: number; xMm: number; yMm: number } => {
  const bubbleType = bubble.type || 'speech';

  // Estimate bubble size based on text and type (same algorithm as in SpeechBubble.tsx)
  const textLength = bubble.text.length;
  const padding = 12;
  const isTextBlock = bubbleType === 'text-block';
  const minWidth = isTextBlock ? 200 : 100;
  const minHeight = isTextBlock ? 100 : 60;
  const maxWidth = isTextBlock ? 600 : 300;
  // Use custom size if provided (for text-block), otherwise estimate
  const estimatedWidth = bubble.width || Math.max(minWidth, Math.min(maxWidth, textLength * 8 + padding * 2));
  const estimatedHeight = bubble.height || Math.max(minHeight, Math.ceil(textLength / (isTextBlock ? 50 : 30)) * 20 + padding * 2);

  // Bubble SVG size in pixels (with extra space for tail) - EXACTLY as in SpeechBubble.tsx
  const bubbleWidthPx = estimatedWidth + 20;
  const bubbleHeightPx = estimatedHeight + 30;

  // Calculate bubble size in mm to match editor appearance EXACTLY
  // In editor: bubbles have FIXED pixel sizes (estimatedWidth + 20/30)
  // displayed within a page container (w-full aspect-square, grid-cols-2)
  //
  // The editor page is typically rendered at ~400-500px (responsive)
  // PDF page is 206mm
  // We scale bubbles to match visual proportion
  const EDITOR_PAGE_WIDTH_PX = 450; // Typical rendered page width in editor
  const pixelToMmScale = PAGE_SIZE / EDITOR_PAGE_WIDTH_PX; // ~0.458 mm/px

  const bubbleWidthMm = bubbleWidthPx * pixelToMmScale;
  const bubbleHeightMm = bubbleHeightPx * pixelToMmScale;

  // Create high-res canvas for PDF (300 DPI equivalent)
  const scale = 3; // 3x for better quality
  const canvas = document.createElement("canvas");
  canvas.width = (estimatedWidth + 20) * scale;
  canvas.height = (estimatedHeight + 30) * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: "", widthMm: 0, heightMm: 0, xMm: 0, yMm: 0 };

  ctx.scale(scale, scale);

  // Bubble shape helpers
  const cx = estimatedWidth / 2 + 10;
  const cy = estimatedHeight / 2 + 10;
  const rx = estimatedWidth / 2;
  const ry = estimatedHeight / 2;
  const kappa = 0.551915;
  const ox = rx * kappa;
  const oy = ry * kappa;

  // Speech bubble path (ellipse + tail)
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

  // Thought bubble (scalloped cloud path)
  const getThoughtBubblePath = () => {
    const path = new Path2D();
    const numBumps = 10;
    const bumpSize = Math.min(rx, ry) * 0.4; // Increased for more fluffiness

    for (let i = 0; i < numBumps; i++) { // Changed from <= to < to avoid overlap
      const angle = (i / numBumps) * 2 * Math.PI;
      const nextAngle = ((i + 1) / numBumps) * 2 * Math.PI;

      const x1 = cx + rx * Math.cos(angle);
      const y1 = cy + ry * Math.sin(angle);
      const x2 = cx + rx * Math.cos(nextAngle);
      const y2 = cy + ry * Math.sin(nextAngle);

      const midAngle = (angle + nextAngle) / 2;
      // Point on ellipse at midAngle, then push outward
      const midX = cx + rx * Math.cos(midAngle);
      const midY = cy + ry * Math.sin(midAngle);
      const cx1 = midX + bumpSize * Math.cos(midAngle);
      const cy1 = midY + bumpSize * Math.sin(midAngle);

      if (i === 0) {
        path.moveTo(x1, y1);
      }

      path.quadraticCurveTo(cx1, cy1, x2, y2);
    }

    path.closePath();
    return path;
  };

  // Annotation path (rounded rectangle, no tail)
  const getAnnotationPath = () => {
    const path = new Path2D();
    const x = 10;
    const y = 10;
    const w = estimatedWidth;
    const h = estimatedHeight;
    const r = 8;

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

  // Text block path (larger rectangle for text)
  const getTextBlockPath = () => {
    const path = new Path2D();
    const x = 10;
    const y = 10;
    const w = estimatedWidth;
    const h = estimatedHeight;
    const r = 6;

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

  // Draw bubble based on type
  if (bubbleType === 'thought') {
    // Draw cloud path for thought bubble
    const cloudPath = getThoughtBubblePath();
    ctx.fillStyle = "white";
    ctx.fill(cloudPath);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke(cloudPath);
  } else {
    // Draw path for other bubble types
    const bubblePath = bubbleType === 'annotation' ? getAnnotationPath() :
                       bubbleType === 'text-block' ? getTextBlockPath() :
                       getSpeechBubblePath();

    if (bubbleType === 'text-block') {
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fill(bubblePath);
      // No stroke for text blocks
    } else {
      ctx.fillStyle = "white";
      ctx.fill(bubblePath);
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.stroke(bubblePath);
    }
  }

  // Draw small thought bubbles for thought type
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

  // Draw text
  ctx.fillStyle = "black";
  ctx.font = `bold 14px "Balsamiq Sans", Arial, sans-serif`;
  ctx.textAlign = bubbleType === 'text-block' ? 'left' : 'center';
  ctx.textBaseline = "middle";

  // Handle text wrapping
  const maxWidth = estimatedWidth - padding * 2 - 20;
  const lineHeight = 18;
  const allLines: string[] = [];

  // Split by manual line breaks first
  const paragraphs = bubble.text.split('\n');

  // For text blocks, wrap each paragraph
  if (bubbleType === 'text-block') {
    paragraphs.forEach(paragraph => {
      if (!paragraph.trim()) {
        allLines.push('');
        return;
      }
      const words = paragraph.split(' ');
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
          allLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });

      if (currentLine) {
        allLines.push(currentLine);
      }
    });
  } else {
    // For other bubble types, just use manual breaks
    allLines.push(...paragraphs);
  }

  const startY = cy - ((allLines.length - 1) * lineHeight) / 2;
  const textX = bubbleType === 'text-block' ? padding + 10 : cx;

  allLines.forEach((line, i) => {
    ctx.fillText(line, textX, startY + i * lineHeight);
  });

  // Calculate position in mm relative to slot
  const xMm = (bubble.x / 100) * slotWidthMm;
  const yMm = (bubble.y / 100) * slotHeightMm;

  return {
    dataUrl: canvas.toDataURL("image/png"),
    widthMm: bubbleWidthMm,
    heightMm: bubbleHeightMm,
    xMm: xMm - bubbleWidthMm / 2, // Center bubble on position
    yMm: yMm - bubbleHeightMm / 2,
  };
};

// Generate page with multiple photos according to template
const generatePageWithSlots = async (
  pdf: jsPDF,
  photos: Photo[],
  slots: PhotoSlot[],
  offsetX: number = 0 // Horizontal offset for right page in spread
): Promise<void> => {
  // Add each photo according to slot position
  for (let i = 0; i < slots.length; i++) {
    const photo = photos[i];
    const slot = slots[i];

    if (!photo?.url) continue;

    try {
      // Use original high-res image if available, fallback to preview
      const imageUrl = photo.originalUrl || photo.url;
      const cropArea = photo.cropArea;

      // Calculate slot position and size in mm (with horizontal offset for spreads)
      const slotX = slot.x * PAGE_SIZE + offsetX;
      const slotY = slot.y * PAGE_SIZE;
      const slotWidth = slot.width * PAGE_SIZE;
      const slotHeight = slot.height * PAGE_SIZE;

      // Calculate REAL slot aspect ratio from dimensions
      const slotAspect = slotWidth / slotHeight;

      // Process photo at full quality WITH correct slot aspect ratio
      let finalImageUrl: string;

      if (cropArea && imageUrl !== photo.url) {
        console.log(`Crop area: ${cropArea.width}x${cropArea.height} (aspect ${(cropArea.width/cropArea.height).toFixed(3)})`);
        console.log(`Slot: ${slotWidth}x${slotHeight}mm (aspect ${slotAspect.toFixed(3)})`);

        // Crop with SLOT aspect ratio (force to match slot)
        finalImageUrl = await cropImageAtFullQuality(imageUrl, cropArea, slotAspect);
      } else {
        // No crop info - use preview
        finalImageUrl = imageUrl;
      }

      // Image should now match slot aspect ratio perfectly - fill slot
      const image = await loadImage(finalImageUrl);
      const imageAspect = image.width / image.height;
      const aspectDiff = Math.abs(imageAspect - slotAspect);

      let photoWidth: number;
      let photoHeight: number;
      let photoX: number;
      let photoY: number;

      if (aspectDiff < 0.02) {
        // Aspect ratios match - fill slot completely
        photoWidth = slotWidth;
        photoHeight = slotHeight;
        photoX = slotX;
        photoY = slotY;
        console.log(`PERFECT FIT: ${photoWidth.toFixed(1)}x${photoHeight.toFixed(1)}mm`);
      } else {
        // Shouldn't happen - use contain
        console.warn(`Aspect mismatch! Image=${imageAspect.toFixed(3)}, Slot=${slotAspect.toFixed(3)}`);
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
        console.log(`CONTAIN: ${photoWidth.toFixed(1)}x${photoHeight.toFixed(1)}mm`);
      }

      pdf.addImage(finalImageUrl, "JPEG", photoX, photoY, photoWidth, photoHeight, undefined, "FAST");

      // Add black comic-style border around photo (only for mini-scenes, not full-page backgrounds)
      const isFullPage = slot.width >= 1.0 && slot.height >= 1.0;
      if (!isFullPage) {
        pdf.setDrawColor(0, 0, 0); // Black
        pdf.setLineWidth(0.75); // ~0.75mm thickness (similar to 3px in editor)
        pdf.rect(photoX, photoY, photoWidth, photoHeight, 'S'); // 'S' = stroke only
      }

      // Add caption if exists
      if (photo.caption) {
        const captionHeight = 10;
        const captionY = slotY + slotHeight - captionHeight;
        const captionImage = renderTextToCanvas(photo.caption, Math.floor(slotWidth * 18), 100);
        pdf.addImage(captionImage, "PNG", slotX + 2, captionY, slotWidth - 4, captionHeight, undefined, "FAST");
      }

      // Add speech bubbles if exist
      if (photo.speechBubbles && photo.speechBubbles.length > 0) {
        for (const bubble of photo.speechBubbles) {
          const bubbleData = renderSpeechBubbleToCanvas(bubble, slotWidth, slotHeight);
          if (bubbleData.dataUrl) {
            const bubbleX = slotX + bubbleData.xMm;
            const bubbleY = slotY + bubbleData.yMm;
            pdf.addImage(
              bubbleData.dataUrl,
              "PNG",
              bubbleX,
              bubbleY,
              bubbleData.widthMm,
              bubbleData.heightMm,
              undefined,
              "FAST"
            );
          }
        }
      }
    } catch (error) {
      console.error("Error adding photo to PDF:", error);
    }
  }
};

// Generate PDF from album with spreads
export async function generateAlbumPDF(album: Album): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [PAGE_SIZE, PAGE_SIZE],
    compress: true,
  });

  // Delete default first page
  pdf.deletePage(1);

  // Generate cover if exists
  if (album.cover.frontImage?.url || album.cover.backImage?.url) {
    pdf.addPage([COVER_WIDTH, COVER_HEIGHT], "landscape");

    if (album.cover.backImage?.url) {
      try {
        pdf.addImage(album.cover.backImage.url, "JPEG", 0, 0, 206, COVER_HEIGHT, undefined, "FAST");
      } catch (error) {
        console.error("Error loading back cover:", error);
      }
    }

    if (album.cover.frontImage?.url) {
      try {
        pdf.addImage(album.cover.frontImage.url, "JPEG", 252, 0, 206, COVER_HEIGHT, undefined, "FAST");
      } catch (error) {
        console.error("Error loading front cover:", error);
      }
    }

    if (album.cover.title) {
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text(album.cover.title, COVER_WIDTH / 2, COVER_HEIGHT / 2, {
        align: "center",
      });
    }
  }

  // Generate spreads (two pages side by side)
  for (const spread of album.spreads) {
    const template = SPREAD_TEMPLATES.find((t) => t.id === spread.templateId);
    if (!template) continue;

    // Create spread page (left + right page side by side)
    const SPREAD_WIDTH = PAGE_SIZE * 2; // 412mm
    pdf.addPage([SPREAD_WIDTH, PAGE_SIZE], "landscape");

    // LEFT PAGE (x: 0 to PAGE_SIZE)
    const leftSlots = getPageSlots(template, 'left', album.withGaps);
    await generatePageWithSlots(pdf, spread.leftPhotos, leftSlots, 0);

    // RIGHT PAGE (x: PAGE_SIZE to SPREAD_WIDTH)
    const rightSlots = getPageSlots(template, 'right', album.withGaps);
    await generatePageWithSlots(pdf, spread.rightPhotos, rightSlots, PAGE_SIZE);
  }

  return pdf.output("blob");
}

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
