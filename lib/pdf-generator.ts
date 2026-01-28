import { jsPDF } from "jspdf";
import { Album } from "./types";

// Print specs from typography
const PAGE_SIZE = 206; // mm (with 3mm bleed on each side = 200mm final)
const COVER_WIDTH = 458; // mm
const COVER_HEIGHT = 242; // mm
const DPI = 300;

// Convert mm to pixels at 300 DPI
const mmToPx = (mm: number): number => {
  return (mm * DPI) / 25.4;
};

// Load image and get dimensions
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

// Render text to canvas (solves Cyrillic encoding issue)
const renderTextToCanvas = (
  text: string,
  width: number,
  height: number
): string => {
  const canvas = document.createElement("canvas");
  const scale = 4; // High DPI
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Semi-transparent black background
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // White text
  ctx.fillStyle = "white";
  ctx.font = `${48 * scale}px IBM Plex Sans, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Wrap text if needed
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > (canvas.width - 60 * scale) && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Draw text lines
  const lineHeight = 50 * scale;
  const startY = (canvas.height - (lines.length * lineHeight)) / 2 + lineHeight / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
  });

  return canvas.toDataURL("image/png");
};

// Crop image to square maintaining aspect ratio (center crop)
const cropImageToSquare = async (
  img: HTMLImageElement,
  targetSize: number
): Promise<string> => {
  const canvas = document.createElement("canvas");
  const targetPx = mmToPx(targetSize);
  canvas.width = targetPx;
  canvas.height = targetPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  // Calculate crop dimensions
  const sourceSize = Math.min(img.width, img.height);
  const sourceX = (img.width - sourceSize) / 2;
  const sourceY = (img.height - sourceSize) / 2;

  // Draw cropped image at 300 DPI
  ctx.drawImage(
    img,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    targetPx,
    targetPx
  );

  return canvas.toDataURL("image/jpeg", 0.95);
};

// Crop image for spread (2:1 aspect ratio for two pages)
const cropImageForSpread = async (
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  isLeftHalf: boolean
): Promise<string> => {
  const canvas = document.createElement("canvas");
  const targetPxW = mmToPx(targetWidth);
  const targetPxH = mmToPx(targetHeight);
  canvas.width = targetPxW;
  canvas.height = targetPxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  // Calculate source dimensions for 2:1 aspect ratio
  let sourceWidth, sourceHeight, sourceX, sourceY;

  const imgRatio = img.width / img.height;
  const targetRatio = 2; // two pages side by side

  if (imgRatio > targetRatio) {
    // Image is wider - fit height
    sourceHeight = img.height;
    sourceWidth = img.height * targetRatio;
    sourceX = (img.width - sourceWidth) / 2;
    sourceY = 0;
  } else {
    // Image is taller - fit width
    sourceWidth = img.width;
    sourceHeight = img.width / targetRatio;
    sourceX = 0;
    sourceY = (img.height - sourceHeight) / 2;
  }

  // Draw left or right half
  if (isLeftHalf) {
    // Draw left half of image
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth / 2,
      sourceHeight,
      0,
      0,
      targetPxW,
      targetPxH
    );
  } else {
    // Draw right half of image
    ctx.drawImage(
      img,
      sourceX + sourceWidth / 2,
      sourceY,
      sourceWidth / 2,
      sourceHeight,
      0,
      0,
      targetPxW,
      targetPxH
    );
  }

  return canvas.toDataURL("image/jpeg", 0.95);
};

// Generate PDF from album
export async function generateAlbumPDF(album: Album): Promise<Blob> {
  // Create PDF with first page size
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
        const img = await loadImage(album.cover.backImage.url);
        const croppedData = await cropImageToSquare(img, 206);
        pdf.addImage(croppedData, "JPEG", 0, 0, 206, COVER_HEIGHT, undefined, "FAST");
      } catch (error) {
        console.error("Error loading back cover:", error);
      }
    }

    if (album.cover.frontImage?.url) {
      try {
        const img = await loadImage(album.cover.frontImage.url);
        const croppedData = await cropImageToSquare(img, 206);
        pdf.addImage(croppedData, "JPEG", 252, 0, 206, COVER_HEIGHT, undefined, "FAST");
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

  // Generate pages
  for (const page of album.pages) {
    if (page.layout === "single") {
      // One photo fills entire page
      if (!isFirstPage) {
        pdf.addPage([PAGE_SIZE, PAGE_SIZE], "portrait");
      } else {
        if (album.cover.frontImage?.url || album.cover.backImage?.url) {
          pdf.addPage([PAGE_SIZE, PAGE_SIZE], "portrait");
        }
        isFirstPage = false;
      }

      const photo = page.photos[0];
      if (photo?.url) {
        try {
          // Image is already cropped in editor, just use it directly
          pdf.addImage(photo.url, "JPEG", 0, 0, PAGE_SIZE, PAGE_SIZE, undefined, "FAST");

          if (photo.caption) {
            // Render caption as image to support Cyrillic
            const captionImage = renderTextToCanvas(photo.caption, 1800, 140);
            pdf.addImage(captionImage, "PNG", 10, PAGE_SIZE - 25, PAGE_SIZE - 20, 15, undefined, "FAST");
          }
        } catch (error) {
          console.error("Error loading image:", error);
        }
      }
    } else if (page.layout === "quad") {
      // 4 photos in 2x2 grid
      if (!isFirstPage) {
        pdf.addPage([PAGE_SIZE, PAGE_SIZE], "portrait");
      } else {
        if (album.cover.frontImage?.url || album.cover.backImage?.url) {
          pdf.addPage([PAGE_SIZE, PAGE_SIZE], "portrait");
        }
        isFirstPage = false;
      }

      const photoSize = PAGE_SIZE / 2;
      const positions = [
        [0, 0],
        [photoSize, 0],
        [0, photoSize],
        [photoSize, photoSize],
      ];

      for (let i = 0; i < page.photos.length && i < 4; i++) {
        const photo = page.photos[i];
        if (photo?.url) {
          try {
            // Images are already cropped in editor
            const [x, y] = positions[i];
            pdf.addImage(
              photo.url,
              "JPEG",
              x,
              y,
              photoSize,
              photoSize,
              undefined,
              "FAST"
            );

            // Add caption if exists
            if (photo.caption) {
              // Render caption as image to support Cyrillic
              const captionImage = renderTextToCanvas(photo.caption, 900, 100);
              pdf.addImage(captionImage, "PNG", x + 5, y + photoSize - 15, photoSize - 10, 10, undefined, "FAST");
            }
          } catch (error) {
            console.error("Error loading image:", error);
          }
        }
      }
    } else if (page.layout === "spread") {
      // Photo spreads across TWO pages (lay-flat binding)
      const photo = page.photos[0];
      if (photo?.url) {
        try {
          // Image is already cropped, split it in half for spread
          const img = await loadImage(photo.url);

          // Create canvas to split image
          const canvas = document.createElement("canvas");
          const targetPx = mmToPx(PAGE_SIZE);
          canvas.width = targetPx;
          canvas.height = targetPx;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas context not available");

          // LEFT PAGE - draw left half of image
          if (!isFirstPage) {
            pdf.addPage([PAGE_SIZE, PAGE_SIZE], "portrait");
          } else {
            if (album.cover.frontImage?.url || album.cover.backImage?.url) {
              pdf.addPage([PAGE_SIZE, PAGE_SIZE], "portrait");
            }
            isFirstPage = false;
          }

          ctx.clearRect(0, 0, targetPx, targetPx);
          ctx.drawImage(img, 0, 0, img.width / 2, img.height, 0, 0, targetPx, targetPx);
          const leftData = canvas.toDataURL("image/jpeg", 0.95);
          pdf.addImage(leftData, "JPEG", 0, 0, PAGE_SIZE, PAGE_SIZE, undefined, "FAST");

          // RIGHT PAGE - draw right half of image
          pdf.addPage([PAGE_SIZE, PAGE_SIZE], "portrait");
          ctx.clearRect(0, 0, targetPx, targetPx);
          ctx.drawImage(img, img.width / 2, 0, img.width / 2, img.height, 0, 0, targetPx, targetPx);
          const rightData = canvas.toDataURL("image/jpeg", 0.95);
          pdf.addImage(rightData, "JPEG", 0, 0, PAGE_SIZE, PAGE_SIZE, undefined, "FAST");

          // Add caption on right page if exists
          if (photo.caption) {
            // Render caption as image to support Cyrillic
            const captionImage = renderTextToCanvas(photo.caption, 1800, 140);
            pdf.addImage(captionImage, "PNG", 10, PAGE_SIZE - 25, PAGE_SIZE - 20, 15, undefined, "FAST");
          }

        } catch (error) {
          console.error("Error loading spread image:", error);
        }
      }
    }
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
