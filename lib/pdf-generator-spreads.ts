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
// PRESERVES natural aspect ratio of crop area (NO FORCING!)
const cropImageAtFullQuality = async (
  imageUrl: string,
  cropArea: { x: number; y: number; width: number; height: number }
): Promise<string> => {
  const image = await loadImage(imageUrl);

  // Use NATURAL aspect ratio of crop area
  const cropAspectRatio = cropArea.width / cropArea.height;

  // Target size at 300 DPI
  const mmToPx = (mm: number) => (mm * 300) / 25.4;
  const MAX_SIZE_MM = 206; // Full page size
  const maxSizePx = mmToPx(MAX_SIZE_MM);

  // Calculate canvas size based on NATURAL crop aspect ratio
  let canvasWidth: number;
  let canvasHeight: number;

  if (cropAspectRatio > 1) {
    // Wider than tall
    canvasWidth = maxSizePx;
    canvasHeight = Math.round(maxSizePx / cropAspectRatio);
  } else {
    // Taller than wide
    canvasHeight = maxSizePx;
    canvasWidth = Math.round(maxSizePx * cropAspectRatio);
  }

  console.log(`Cropping at 300 DPI: ${canvasWidth}x${canvasHeight}px (aspect: ${cropAspectRatio.toFixed(3)})`);

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas context not available");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw cropped area WITHOUT any aspect ratio adjustment
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

      // COMPLETELY NEW APPROACH: Don't force aspect ratio, preserve crop as-is
      let finalImageUrl: string;
      let naturalAspect: number;

      if (cropArea && imageUrl !== photo.url) {
        // Calculate natural aspect ratio of crop area
        naturalAspect = cropArea.width / cropArea.height;
        console.log(`Crop area aspect: ${naturalAspect.toFixed(3)} (${cropArea.width}x${cropArea.height})`);

        // Crop at full quality WITHOUT forcing aspect ratio
        finalImageUrl = await cropImageAtFullQuality(imageUrl, cropArea);
      } else {
        // No crop info - use preview
        const image = await loadImage(photo.url);
        naturalAspect = image.width / image.height;
        finalImageUrl = imageUrl;
      }

      const slotAspect = slotWidth / slotHeight;
      console.log(`Slot aspect: ${slotAspect.toFixed(3)}, Natural aspect: ${naturalAspect.toFixed(3)}`);

      // ALWAYS use CONTAIN approach to preserve aspect ratio
      // This prevents ANY stretching
      let photoWidth: number;
      let photoHeight: number;
      let photoX: number;
      let photoY: number;

      if (naturalAspect > slotAspect) {
        // Image wider than slot - fit to width, letterbox top/bottom
        photoWidth = slotWidth;
        photoHeight = slotWidth / naturalAspect;
        photoX = slotX;
        photoY = slotY + (slotHeight - photoHeight) / 2;
        console.log(`FIT TO WIDTH: ${photoWidth.toFixed(1)}x${photoHeight.toFixed(1)}mm`);
      } else {
        // Image taller than slot - fit to height, pillarbox left/right
        photoHeight = slotHeight;
        photoWidth = slotHeight * naturalAspect;
        photoX = slotX + (slotWidth - photoWidth) / 2;
        photoY = slotY;
        console.log(`FIT TO HEIGHT: ${photoWidth.toFixed(1)}x${photoHeight.toFixed(1)}mm`);
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
