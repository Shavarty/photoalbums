import { jsPDF } from "jspdf";
import { Album, Spread, Photo, CropArea } from "./types";
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
// Forces exact aspect ratio to match slot (fixes floating point rounding)
const cropImageAtFullQuality = async (
  imageUrl: string,
  cropArea: { x: number; y: number; width: number; height: number },
  targetAspectRatio: number
): Promise<string> => {
  const image = await loadImage(imageUrl);

  // Target size at 300 DPI with EXACT aspect ratio of slot
  const mmToPx = (mm: number) => (mm * 300) / 25.4;
  const MAX_SIZE_MM = 206; // Full page size
  const maxSizePx = mmToPx(MAX_SIZE_MM);

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

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas context not available");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw cropped area - will slightly adjust to match target aspect ratio
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
  ctx.font = `${Math.floor(height * 0.4)}px IBM Plex Sans, Arial, sans-serif`;
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

      // Process photo at full 300 DPI quality
      let finalImageUrl: string;

      if (cropArea && imageUrl !== photo.url) {
        // We have crop info + original image - crop at 300 DPI
        // Force aspect ratio to match slot exactly (fixes rounding issues)
        const slotAspectRatio = slotWidth / slotHeight;
        finalImageUrl = await cropImageAtFullQuality(imageUrl, cropArea, slotAspectRatio);
      } else {
        // No crop info or using preview - use as is
        finalImageUrl = imageUrl;
      }

      // Crop area aspect ratio should match slot aspect ratio (from cropper)
      // So image should fill slot perfectly with no gaps or stretching
      // Use slight tolerance for floating point rounding
      const image = await loadImage(finalImageUrl);
      const imageAspect = image.width / image.height;
      const slotAspect = slotWidth / slotHeight;
      const aspectDiff = Math.abs(imageAspect - slotAspect);

      let photoWidth: number;
      let photoHeight: number;
      let photoX: number;
      let photoY: number;

      if (aspectDiff < 0.01) {
        // Aspect ratios match - fill slot exactly (no gaps, no stretch)
        photoWidth = slotWidth;
        photoHeight = slotHeight;
        photoX = slotX;
        photoY = slotY;
      } else {
        // Aspect ratios don't match (shouldn't happen with proper crop)
        // Use CONTAIN to avoid stretching
        console.warn(`Aspect ratio mismatch: image=${imageAspect.toFixed(3)}, slot=${slotAspect.toFixed(3)}`);

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

      // Add caption if exists
      if (photo.caption) {
        const captionHeight = 10;
        const captionY = slotY + slotHeight - captionHeight;
        const captionImage = renderTextToCanvas(photo.caption, Math.floor(slotWidth * 18), 100);
        pdf.addImage(captionImage, "PNG", slotX + 2, captionY, slotWidth - 4, captionHeight, undefined, "FAST");
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
