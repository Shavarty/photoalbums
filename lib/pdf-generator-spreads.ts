import { jsPDF } from "jspdf";
import { Album, Spread, Photo } from "./types";
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
  slots: PhotoSlot[]
): Promise<void> => {
  // Add each photo according to slot position
  for (let i = 0; i < slots.length; i++) {
    const photo = photos[i];
    const slot = slots[i];

    if (!photo?.url) continue;

    try {
      // Calculate slot position and size in mm
      const slotX = slot.x * PAGE_SIZE;
      const slotY = slot.y * PAGE_SIZE;
      const slotWidth = slot.width * PAGE_SIZE;
      const slotHeight = slot.height * PAGE_SIZE;

      // Photo already has correct aspect ratio from crop
      // Calculate dimensions to fit within slot while preserving aspect ratio
      const photoAspect = slot.aspectRatio;
      const slotAspect = slotWidth / slotHeight;

      let photoWidth: number;
      let photoHeight: number;
      let photoX: number;
      let photoY: number;

      if (photoAspect > slotAspect) {
        // Photo is wider than slot - fit to width
        photoWidth = slotWidth;
        photoHeight = slotWidth / photoAspect;
        photoX = slotX;
        photoY = slotY + (slotHeight - photoHeight) / 2; // center vertically
      } else {
        // Photo is taller than slot - fit to height
        photoHeight = slotHeight;
        photoWidth = slotHeight * photoAspect;
        photoX = slotX + (slotWidth - photoWidth) / 2; // center horizontally
        photoY = slotY;
      }

      // Add photo with preserved aspect ratio
      pdf.addImage(photo.url, "JPEG", photoX, photoY, photoWidth, photoHeight, undefined, "FAST");

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

  let isFirstPage = true;

  // Generate cover if exists
  if (album.cover.frontImage?.url || album.cover.backImage?.url) {
    if (!isFirstPage) {
      pdf.addPage([COVER_WIDTH, COVER_HEIGHT], "landscape");
    } else {
      pdf.deletePage(1);
      pdf.addPage([COVER_WIDTH, COVER_HEIGHT], "landscape");
      isFirstPage = false;
    }

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

  // Generate spreads
  for (const spread of album.spreads) {
    const template = SPREAD_TEMPLATES.find((t) => t.id === spread.templateId);
    if (!template) continue;

    // LEFT PAGE
    if (!isFirstPage) {
      pdf.addPage([PAGE_SIZE, PAGE_SIZE], "portrait");
    } else {
      if (album.cover.frontImage?.url || album.cover.backImage?.url) {
        pdf.addPage([PAGE_SIZE, PAGE_SIZE], "portrait");
      }
      isFirstPage = false;
    }

    const leftSlots = getPageSlots(template, 'left', album.withGaps);
    await generatePageWithSlots(pdf, spread.leftPhotos, leftSlots);

    // RIGHT PAGE
    pdf.addPage([PAGE_SIZE, PAGE_SIZE], "portrait");
    const rightSlots = getPageSlots(template, 'right', album.withGaps);
    await generatePageWithSlots(pdf, spread.rightPhotos, rightSlots);
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
