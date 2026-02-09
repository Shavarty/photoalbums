"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Area } from "react-easy-crop";
import { CropArea, TokenUsage, StylizeSettings } from "@/lib/types";
import { GEMINI_MODELS, DEFAULT_MODEL } from "@/lib/geminiModels";
import { STYLE_PRESETS, DEFAULT_PROCESS_INSTRUCTIONS } from "@/lib/stylization";

interface CropResult {
  previewUrl: string; // Low-res preview for editor
  originalUrl: string; // Original high-res for PDF
  cropArea: CropArea; // Crop coordinates
  tokens?: TokenUsage; // AI stylization tokens if used
  isStylizing?: boolean; // Flag that stylization is in progress
  modelId?: string; // Model to use for stylization
  photoId?: string; // Photo ID for progress tracking
}

interface ImageCropModalProps {
  imageUrl: string;
  aspectRatio: number; // 1 for square, 0.5 for half-square (quad layout)
  slotWidth: number; // slot width in relative units (0-1)
  slotHeight: number; // slot height in relative units (0-1)
  onComplete: (result: CropResult) => void;
  onCancel: () => void;
  stylizeSettings: StylizeSettings;
  onUpdateStylizeSettings: (updates: Partial<StylizeSettings>) => void;
}

// Helper to create LIGHTWEIGHT preview for editor (not for print!)
const createPreviewImage = async (
  imageSrc: string,
  crop: Area,
  targetAspectRatio: number,  // Use same aspect ratio as cropper/slot
  expansionMode: boolean = false,  // If true, create canvas with white background for AI expansion
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

  console.log(`Preview: ${canvasWidth}x${canvasHeight}px, aspect=${targetAspectRatio.toFixed(3)} (slot aspect ratio)${expansionMode ? ' [EXPANSION MODE]' : ''}`);

    // Use better image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw image
    try {
      if (expansionMode) {
        // EXPANSION MODE: Fill canvas with white, draw photo at crop position
        // This creates space for AI to extend the image

        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate scale factor from crop dimensions to canvas dimensions
        const scaleX = canvas.width / crop.width;
        const scaleY = canvas.height / crop.height;

        // Calculate source image dimensions in canvas space
        const sourceWidthScaled = sourceImage.width * scaleX;
        const sourceHeightScaled = sourceImage.height * scaleY;

        // Calculate position - crop.x and crop.y are the top-left of crop in source image
        // We need to offset by these values
        const destX = -crop.x * scaleX;
        const destY = -crop.y * scaleY;

        console.log(`Expansion: source ${sourceImage.width}x${sourceImage.height}, crop ${crop.width}x${crop.height}, scale ${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`);
        console.log(`Drawing at (${destX.toFixed(1)}, ${destY.toFixed(1)}) size ${sourceWidthScaled.toFixed(1)}x${sourceHeightScaled.toFixed(1)}`);

        ctx.drawImage(
          sourceImage,
          0,
          0,
          sourceImage.width,
          sourceImage.height,
          destX,
          destY,
          sourceWidthScaled,
          sourceHeightScaled
        );
      } else {
        // NORMAL CROP MODE: Draw cropped area to fill entire canvas
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
      }
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
      return createPreviewImage(imageSrc, crop, targetAspectRatio, expansionMode, retryCount + 1);
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
  stylizeSettings,
  onUpdateStylizeSettings,
}: ImageCropModalProps) {
  console.log('ImageCropModal rendered with aspectRatio:', aspectRatio, 'slot:', slotWidth, 'x', slotHeight);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [processExpanded, setProcessExpanded] = useState(false);

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

  // Сохранение БЕЗ стилизации
  const handleSaveWithoutStylization = async () => {
    if (!croppedAreaPixels) {
      alert("Сначала настройте область обрезки");
      return;
    }

    setIsProcessing(true);
    try {
      console.log("Creating cropped preview...");
      const isExpansionMode = zoom < 1.0;
      const croppedPreview = await createPreviewImage(
        imageUrl,
        croppedAreaPixels,
        aspectRatio,
        isExpansionMode
      );

      const result: CropResult = {
        previewUrl: croppedPreview,
        originalUrl: imageUrl,
        cropArea: croppedAreaPixels,
        tokens: undefined,
        isStylizing: false
      };

      onComplete(result);
    } catch (error: any) {
      console.error("Error cropping image:", error);
      alert("Не удалось обработать изображение: " + error.message);
      setIsProcessing(false);
    }
  };

  // Стилизация и сразу сохранение
  const handleStylizeAndSave = async () => {
    if (!croppedAreaPixels) {
      alert("Сначала настройте область обрезки");
      return;
    }

    setIsProcessing(true);

    try {
      // Создаем обрезанный фрагмент
      console.log("Creating cropped preview for stylization...");
      const isExpansionMode = zoom < 1.0;
      const croppedPreview = await createPreviewImage(
        imageUrl,
        croppedAreaPixels,
        aspectRatio,
        isExpansionMode
      );

      // Сохраняем обычное фото (чтобы быстро закрыть modal)
      const result: CropResult = {
        previewUrl: croppedPreview,
        originalUrl: imageUrl,
        cropArea: croppedAreaPixels,
        tokens: undefined,
        isStylizing: true,  // флаг что стилизация в процессе
        modelId: selectedModel
      };

      // Очищаем "дополнительные пожелания" перед закрытием modal
      onUpdateStylizeSettings({ customPrompt: '' });

      // Сразу закрываем modal и сохраняем
      onComplete(result);

    } catch (error: any) {
      console.error("Error during stylization:", error);
      alert("Не удалось обработать изображение: " + error.message);
      setIsProcessing(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3 md:p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-serif font-bold">Обрезка изображения</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Выберите область изображения для размещения в альбоме
          </p>
        </div>

        {/* Crop Area */}
        <div className="relative flex-1 bg-gray-900 min-h-[120px] md:min-h-[300px]">
          <Cropper
            key={`${imageUrl}-${aspectRatio}`}
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            restrictPosition={false}
          />
        </div>

        {/* Controls (scrollable on mobile if overflow) */}
        <div className="p-3 md:p-6 border-t border-gray-200 flex-shrink-0 overflow-y-auto" style={{ maxHeight: '40vh' }}>
          <div className="mb-3 md:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Масштаб
            </label>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              {zoom < 1
                ? "📐 Режим расширения: AI дорисует фон вокруг фото"
                : "✂️ Обычная обрезка"}
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Модель AI стилизации
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
            >
              {Object.values(GEMINI_MODELS).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} — ~${model.pricing.avgImageCost.toFixed(3)}/фото
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {GEMINI_MODELS[selectedModel]?.description}
            </p>
          </div>

          {/* Instructions Panel */}
          <div className="border-t border-gray-200 pt-3">
            <button
              onClick={() => setInstructionsOpen(!instructionsOpen)}
              className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-brand-orange transition"
            >
              <span className="flex items-center gap-2">
                <span>🎨</span>
                <span>Инструкции стилизации</span>
              </span>
              <svg className={`w-4 h-4 transition-transform ${instructionsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {instructionsOpen && (
              <div className="mt-3 space-y-3">
                {/* Block 1: Стиль иллюстрации */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Стиль иллюстрации</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {STYLE_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => onUpdateStylizeSettings({ activePreset: preset.id, style: preset.prompt })}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition ${
                          stylizeSettings.activePreset === preset.id
                            ? 'bg-brand-orange text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={stylizeSettings.style}
                    onChange={(e) => onUpdateStylizeSettings({ style: e.target.value, activePreset: 'custom' })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs resize-y focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                    rows={2}
                  />
                </div>

                {/* Block 2: Дополнительные пожелания */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Дополнительные пожелания</label>
                  <textarea
                    value={stylizeSettings.customPrompt}
                    onChange={(e) => onUpdateStylizeSettings({ customPrompt: e.target.value })}
                    placeholder="Например: чёрно-белый, добавить туман..."
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs resize-y focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                    rows={2}
                  />
                </div>

                {/* Block 3: Инструкции процесса (advanced) */}
                <div>
                  <button
                    onClick={() => setProcessExpanded(!processExpanded)}
                    className="text-[10px] text-gray-500 hover:text-gray-700 transition flex items-center gap-1"
                  >
                    <svg className={`w-2.5 h-2.5 transition-transform ${processExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>Инструкции процесса</span>
                    <span className="bg-gray-200 text-gray-500 px-1 py-0.5 rounded-full font-medium">advanced</span>
                  </button>
                  {stylizeSettings.processInstructions !== DEFAULT_PROCESS_INSTRUCTIONS && (
                    <button
                      onClick={() => onUpdateStylizeSettings({ processInstructions: DEFAULT_PROCESS_INSTRUCTIONS })}
                      className="text-[9px] text-brand-orange hover:underline ml-2"
                    >сбросить</button>
                  )}
                  {processExpanded && (
                    <textarea
                      value={stylizeSettings.processInstructions}
                      onChange={(e) => onUpdateStylizeSettings({ processInstructions: e.target.value })}
                      className="mt-1.5 w-full px-2 py-1.5 border border-gray-200 rounded text-[10px] text-gray-600 resize-y focus:ring-2 focus:ring-brand-orange focus:border-transparent bg-gray-50"
                      rows={4}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buttons — always visible at bottom */}
        <div className="p-3 md:p-4 border-t border-gray-100 flex-shrink-0 flex gap-2 sm:gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition font-medium text-sm disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSaveWithoutStylization}
            disabled={isProcessing}
            className="px-4 py-2 bg-purple-100 border border-purple-500 text-purple-600 rounded-full hover:bg-purple-200 transition font-medium text-sm disabled:opacity-50"
          >
            Применить
          </button>
          <button
            onClick={handleStylizeAndSave}
            disabled={isProcessing}
            className="btn-gradient px-5 py-2 text-white font-semibold text-sm disabled:opacity-50"
          >
            {isProcessing ? "Обработка..." : "🎨 Стилизовать"}
          </button>
        </div>
      </div>
    </div>
  );
}
