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
  slotWidth: number,
  slotHeight: number,
  retryCount: number = 0
): Promise<string> => {
  try {
    const image = await loadImage(imageSrc);

    // Wait a bit for image to be fully ready (helps on mobile)
    await new Promise(resolve => setTimeout(resolve, 50));

  // Aggressively downscale source image for mobile stability
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const MAX_SOURCE_DIMENSION = isMobile ? 2048 : 4096; // Much smaller for mobile
  let sourceImage = image;

  // Always downscale if too large
  if (image.width > MAX_SOURCE_DIMENSION || image.height > MAX_SOURCE_DIMENSION) {
    console.log(`Downscaling source image from ${image.width}x${image.height}...`);
    const downscaleCanvas = document.createElement("canvas");
    const downscaleCtx = downscaleCanvas.getContext("2d", { willReadFrequently: false });

    if (!downscaleCtx) {
      throw new Error("Canvas context not available");
    }

    const scale = Math.min(MAX_SOURCE_DIMENSION / image.width, MAX_SOURCE_DIMENSION / image.height);
    downscaleCanvas.width = Math.round(image.width * scale);
    downscaleCanvas.height = Math.round(image.height * scale);

    // Use better image smoothing
    downscaleCtx.imageSmoothingEnabled = true;
    downscaleCtx.imageSmoothingQuality = 'high';

    downscaleCtx.drawImage(image, 0, 0, downscaleCanvas.width, downscaleCanvas.height);

    // Create new image from downscaled canvas
    const downscaledDataUrl = downscaleCanvas.toDataURL("image/jpeg", 0.90);
    sourceImage = await loadImage(downscaledDataUrl);

    // Adjust crop coordinates for downscaled image
    crop = {
      x: crop.x * scale,
      y: crop.y * scale,
      width: crop.width * scale,
      height: crop.height * scale
    };

    console.log(`Downscaled to ${sourceImage.width}x${sourceImage.height}, crop adjusted`);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", {
    willReadFrequently: false,
    alpha: false // No alpha channel for JPEG
  });

  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  // PREVIEW ONLY: Use low DPI for fast, reliable processing
  // Real 300 DPI processing will happen in PDF generator using original image
  const PREVIEW_DPI = 100; // Low DPI for editor preview only

  // Calculate output size based on actual slot size
  const mmToPx = (mm: number) => (mm * PREVIEW_DPI) / 25.4;
  const pageSize = mmToPx(206);

  // Canvas size for PREVIEW only (small and fast)
  let canvasWidth = Math.round(pageSize * slotWidth);
  let canvasHeight = Math.round(pageSize * slotHeight);

  // Very conservative limits for preview (we don't need high-res here!)
  const MAX_CANVAS_AREA = 2000000; // 2MP max - plenty for preview
  const MAX_DIMENSION = 1500; // 1500px max per dimension
  const currentArea = canvasWidth * canvasHeight;

  // Limit by area
  if (currentArea > MAX_CANVAS_AREA) {
    const scale = Math.sqrt(MAX_CANVAS_AREA / currentArea);
    canvasWidth = Math.round(canvasWidth * scale);
    canvasHeight = Math.round(canvasHeight * scale);
    console.log(`Canvas area reduced to ${canvasWidth}x${canvasHeight} (${(canvasWidth * canvasHeight / 1000000).toFixed(1)}MP)`);
  }

  // Limit by dimension
  if (canvasWidth > MAX_DIMENSION || canvasHeight > MAX_DIMENSION) {
    const scale = Math.min(MAX_DIMENSION / canvasWidth, MAX_DIMENSION / canvasHeight);
    canvasWidth = Math.round(canvasWidth * scale);
    canvasHeight = Math.round(canvasHeight * scale);
    console.log(`Canvas dimension limited to ${canvasWidth}x${canvasHeight}`);
  }

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Verify canvas is valid
  if (canvas.width === 0 || canvas.height === 0 || canvas.width > MAX_DIMENSION || canvas.height > MAX_DIMENSION) {
    throw new Error(`Invalid canvas dimensions: ${canvas.width}x${canvas.height}`);
  }

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
    // Retry up to 3 times with longer delays
    if (retryCount < 3) {
      const delay = 500 * (retryCount + 1); // 500ms, 1000ms, 1500ms
      console.log(`Retrying image processing (attempt ${retryCount + 2}/4) after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return createPreviewImage(imageSrc, crop, slotWidth, slotHeight, retryCount + 1);
    }
    console.error("Final error after all retries:", error);
    throw error;
  }
};

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    // Timeout after 30 seconds
    const timeout = setTimeout(() => {
      reject(new Error("Image load timeout"));
    }, 30000);

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
      const previewUrl = await createPreviewImage(
        imageUrl,
        croppedAreaPixels,
        slotWidth,
        slotHeight
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
