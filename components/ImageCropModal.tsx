"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Area } from "react-easy-crop";
import { CropArea } from "@/lib/types";

interface CropResult {
  previewUrl: string; // Low-res preview for editor
  originalUrl: string; // Original high-res for PDF
  cropArea: CropArea; // Crop coordinates
}

interface ImageCropModalProps {
  imageUrl: string;
  aspectRatio: number; // 1 for square, 0.5 for half-square (quad layout)
  slotWidth: number; // slot width in relative units (0-1)
  slotHeight: number; // slot height in relative units (0-1)
  onComplete: (result: CropResult) => void;
  onCancel: () => void;
}

// Helper to create LIGHTWEIGHT preview for editor (not for print!)
const createPreviewImage = async (
  imageSrc: string,
  crop: Area,
  targetAspectRatio: number,  // Use same aspect ratio as cropper/slot
  retryCount: number = 0
): Promise<string> => {
  try {
    const image = await loadImage(imageSrc);

    // Wait a bit for image to be fully ready (helps on mobile)
    await new Promise(resolve => setTimeout(resolve, 50));

  // Aggressively downscale source image for mobile stability
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const MAX_SOURCE_DIMENSION = isMobile ? 1536 : 3072; // Very conservative for mobile
  let sourceImage = image;

  // Always downscale if too large
  if (image.width > MAX_SOURCE_DIMENSION || image.height > MAX_SOURCE_DIMENSION) {
    console.log(`Downscaling source image from ${image.width}x${image.height}...`);

    try {
      const downscaleCanvas = document.createElement("canvas");
      const downscaleCtx = downscaleCanvas.getContext("2d", { willReadFrequently: false, alpha: false });

      if (!downscaleCtx) {
        throw new Error("Canvas context not available");
      }

      const scale = Math.min(MAX_SOURCE_DIMENSION / image.width, MAX_SOURCE_DIMENSION / image.height);
      downscaleCanvas.width = Math.round(image.width * scale);
      downscaleCanvas.height = Math.round(image.height * scale);

      // Verify downscale canvas is not too large
      if (downscaleCanvas.width * downscaleCanvas.height > 4000000) {
        throw new Error("Downscaled image still too large");
      }

      // Use better image smoothing
      downscaleCtx.imageSmoothingEnabled = true;
      downscaleCtx.imageSmoothingQuality = 'high';

      downscaleCtx.drawImage(image, 0, 0, downscaleCanvas.width, downscaleCanvas.height);

      // Create new image from downscaled canvas
      const downscaledDataUrl = downscaleCanvas.toDataURL("image/jpeg", 0.88);
      sourceImage = await loadImage(downscaledDataUrl);

      // Adjust crop coordinates for downscaled image
      crop = {
        x: crop.x * scale,
        y: crop.y * scale,
        width: crop.width * scale,
        height: crop.height * scale
      };

      console.log(`Downscaled to ${sourceImage.width}x${sourceImage.height}, crop adjusted`);
    } catch (downscaleError) {
      console.error("Downscaling failed, trying more aggressive reduction:", downscaleError);

      // Fallback: use even smaller size
      const FALLBACK_DIMENSION = 1024;
      const fallbackScale = Math.min(FALLBACK_DIMENSION / image.width, FALLBACK_DIMENSION / image.height);

      const fallbackCanvas = document.createElement("canvas");
      fallbackCanvas.width = Math.round(image.width * fallbackScale);
      fallbackCanvas.height = Math.round(image.height * fallbackScale);

      const fallbackCtx = fallbackCanvas.getContext("2d", { alpha: false });
      if (fallbackCtx) {
        fallbackCtx.drawImage(image, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
        const fallbackDataUrl = fallbackCanvas.toDataURL("image/jpeg", 0.80);
        sourceImage = await loadImage(fallbackDataUrl);

        crop = {
          x: crop.x * fallbackScale,
          y: crop.y * fallbackScale,
          width: crop.width * fallbackScale,
          height: crop.height * fallbackScale
        };

        console.log(`Fallback downscale to ${sourceImage.width}x${sourceImage.height}`);
      }
    }
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", {
    willReadFrequently: false,
    alpha: false // No alpha channel for JPEG
  });

  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  // PREVIEW: Use SLOT aspect ratio (same as cropper enforces)
  // This ensures preview matches PDF output exactly
  // Real 300 DPI processing will happen in PDF generator using original image

  // Target max dimension for preview (small and fast)
  const MAX_PREVIEW_SIZE = 800; // max 800px on longest side

  let canvasWidth: number;
  let canvasHeight: number;

  if (targetAspectRatio > 1) {
    // Wider than tall
    canvasWidth = MAX_PREVIEW_SIZE;
    canvasHeight = Math.round(MAX_PREVIEW_SIZE / targetAspectRatio);
  } else {
    // Taller than wide
    canvasHeight = MAX_PREVIEW_SIZE;
    canvasWidth = Math.round(MAX_PREVIEW_SIZE * targetAspectRatio);
  }

  // Already limited to 800px max, so dimensions are safe
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Verify canvas is valid
  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error(`Invalid canvas dimensions: ${canvas.width}x${canvas.height}`);
  }

  console.log(`Preview: ${canvasWidth}x${canvasHeight}px, aspect=${targetAspectRatio.toFixed(3)} (slot aspect ratio)`);

    // Use better image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw cropped image at correct resolution
    try {
      ctx.drawImage(
        sourceImage,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    } catch (error) {
      console.error("Error drawing image to canvas:", error);
      throw new Error("Не удалось нарисовать изображение на canvas");
    }

    // Convert to data URL with error handling
    let dataUrl: string;
    try {
      dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      if (!dataUrl || dataUrl === "data:,") {
        throw new Error("Empty data URL");
      }
    } catch (error) {
      console.error("Error converting canvas to data URL:", error);
      throw new Error("Не удалось конвертировать изображение");
    }

    return dataUrl;
  } catch (error: any) {
    // Retry up to 5 times with exponential backoff
    if (retryCount < 5) {
      const delay = 300 * Math.pow(2, retryCount); // 300ms, 600ms, 1200ms, 2400ms, 4800ms
      console.log(`Retrying image processing (attempt ${retryCount + 2}/6) after ${delay}ms...`);
      console.log(`Error was:`, error?.message || error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return createPreviewImage(imageSrc, crop, targetAspectRatio, retryCount + 1);
    }
    console.error("Final error after 6 attempts:", error);
    throw error;
  }
};

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    // Timeout after 60 seconds (generous for slow mobile connections)
    const timeout = setTimeout(() => {
      reject(new Error("Image load timeout (60s)"));
    }, 60000);

    img.onload = () => {
      clearTimeout(timeout);
      // Ensure image is fully decoded before resolving
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        console.log(`Image loaded: ${img.naturalWidth}x${img.naturalHeight}`);
        resolve(img);
      } else {
        reject(new Error(`Image not fully loaded: ${img.naturalWidth}x${img.naturalHeight}`));
      }
    };

    img.onerror = (e) => {
      clearTimeout(timeout);
      console.error("Image load error:", e);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
};

export default function ImageCropModal({
  imageUrl,
  aspectRatio,
  slotWidth,
  slotHeight,
  onComplete,
  onCancel,
}: ImageCropModalProps) {
  console.log('ImageCropModal rendered with aspectRatio:', aspectRatio, 'slot:', slotWidth, 'x', slotHeight);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset crop and zoom when image changes
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [imageUrl, aspectRatio]);

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    console.log('Saving crop - slot:', slotWidth, 'x', slotHeight, 'crop area:', croppedAreaPixels);
    setIsProcessing(true);

    try {
      // Create lightweight preview for editor display
      // Use SAME aspect ratio as cropper (which matches slot dimensions)
      const previewUrl = await createPreviewImage(
        imageUrl,
        croppedAreaPixels,
        aspectRatio  // Use cropper's aspect ratio (= slot aspect ratio)
      );

      // Verify we got a valid preview
      if (!previewUrl || !previewUrl.startsWith('data:image')) {
        throw new Error("Invalid preview result");
      }

      // Return complete crop result
      const result: CropResult = {
        previewUrl,              // Low-res for editor
        originalUrl: imageUrl,   // Original high-res for PDF
        cropArea: croppedAreaPixels  // Crop coordinates
      };

      console.log('Crop complete - preview size:', previewUrl.length, 'bytes');
      onComplete(result);
    } catch (error: any) {
      console.error("Error cropping image:", error);
      const errorMsg = error?.message || "Неизвестная ошибка";
      alert(
        "Не удалось обработать изображение.\n\n" +
        `Причина: ${errorMsg}\n\n` +
        "Попробуйте:\n" +
        "• Выбрать фото меньшего размера\n" +
        "• Перезагрузить страницу\n" +
        "• Использовать другой браузер"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-serif font-bold">Обрезка изображения</h2>
          <p className="text-gray-600 mt-1">
            Выберите область изображения для размещения в альбоме
          </p>
        </div>

        {/* Crop Area */}
        <div className="relative flex-1 bg-gray-900" style={{ minHeight: "400px" }}>
          <Cropper
            key={`${imageUrl}-${aspectRatio}`}
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div className="p-6 border-t border-gray-200">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Масштаб
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="px-6 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition font-medium disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="btn-gradient px-8 py-2 text-white font-semibold disabled:opacity-50"
            >
              {isProcessing ? "Обработка..." : "Применить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
