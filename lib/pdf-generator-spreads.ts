import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Album, Spread, Photo } from "./types";
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

  ctx.drawImage(image, cropArea.x, cropArea.y, cropArea.width, cropArea.height, 0, 0, canvasWidth, canvasHeight);

  return canvas.toDataURL("image/jpeg", 0.92);
};

// Capture bubbles overlay via html2canvas — pixel-perfect match with editor
// Returns a PNG dataUrl (with transparency) or null if the element isn't found / has no bubbles
const captureBubblesLayer = async (
  spreadId: string,
  spreadWidthMm: number,
  spreadHeightMm: number,
  pdf: jsPDF,
  offsetX: number = 0,
  offsetY: number = 0
): Promise<void> => {
  const el = document.getElementById(`bubbles-layer-${spreadId}`);
  if (!el) return;

  // Check if there are any visible bubble elements inside
  if (!el.children.length) return;

  // Measure the actual container to calculate the correct scale
  const container = document.getElementById(`spread-container-${spreadId}`);
  const containerRect = container
    ? container.getBoundingClientRect()
    : el.getBoundingClientRect();

  const containerWidthPx = containerRect.width;
  const containerHeightPx = containerRect.height;

  // Aim for ~200 DPI in the PDF output (good quality for text & graphics)
  // scale = (spreadWidthMm / 25.4 * 200) / containerWidthPx
  const targetDpi = 200;
  const targetWidthPx = (spreadWidthMm / 25.4) * targetDpi;
  const captureScale = Math.min(Math.max(targetWidthPx / containerWidthPx, 2), 6);

  const canvas = await html2canvas(el, {
    backgroundColor: null,       // transparent background (PNG)
    scale: captureScale,
    useCORS: true,
    allowTaint: false,
    logging: false,
    // Tell html2canvas the exact viewport so it doesn't clip anything
    width: containerWidthPx,
    height: containerHeightPx,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
  });

  // The captured image represents the EDITOR's viewport (containerWidthPx × containerHeightPx).
  // We map it to the PDF spread dimensions, preserving proportions.
  // For regular spreads (2:1 editor = 2:1 PDF) this is perfect.
  // For cover (2:1 editor → 1.89:1 PDF) there's a ~6% vertical stretch — acceptable.
  const imageData = canvas.toDataURL("image/png");
  if (imageData && imageData.length > 1000) {
    pdf.addImage(
      imageData, "PNG",
      offsetX, offsetY,
      spreadWidthMm, spreadHeightMm,
      undefined, "FAST"
    );
  }
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

  // Bubbles overlay — html2canvas capture of the editor DOM
  // The editor shows cover as 2:1 (two square pages), PDF is 1.89:1 (458:242).
  // We map the full editor overlay to the full PDF page (tiny ~6% vertical stretch — imperceptible).
  if (cover.bubbles && cover.bubbles.length > 0) {
    await captureBubblesLayer(cover.id, COVER_WIDTH, COVER_HEIGHT, pdf, 0, 0);
  }
};

// Generate all regular spreads pages
const generateSpreadsPages = async (pdf: jsPDF, album: Album): Promise<void> => {
  for (const spread of album.spreads) {
    const template = SPREAD_TEMPLATES.find(t => t.id === spread.templateId);
    if (!template) continue;

    const SPREAD_WIDTH = PAGE_SIZE * 2; // 412mm
    pdf.addPage([SPREAD_WIDTH, PAGE_SIZE], "landscape");

    const leftSlots = getPageSlots(template, 'left', album.withGaps);
    await generatePageWithSlots(pdf, spread.leftPhotos, leftSlots, template.id, PAGE_SIZE, PAGE_SIZE, 0);

    const rightSlots = getPageSlots(template, 'right', album.withGaps);
    await generatePageWithSlots(pdf, spread.rightPhotos, rightSlots, template.id, PAGE_SIZE, PAGE_SIZE, PAGE_SIZE);

    // Bubbles overlay — html2canvas, pixel-perfect from editor
    // Regular spreads: 2:1 editor matches 2:1 PDF → perfect alignment
    if (spread.bubbles && spread.bubbles.length > 0) {
      await captureBubblesLayer(spread.id, SPREAD_WIDTH, PAGE_SIZE, pdf, 0, 0);
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

// Legacy alias
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
