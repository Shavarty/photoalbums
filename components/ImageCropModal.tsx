"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Area } from "react-easy-crop";

interface ImageCropModalProps {
  imageUrl: string;
  aspectRatio: number; // 1 for square, 0.5 for half-square (quad layout)
  slotWidth: number; // slot width in relative units (0-1)
  slotHeight: number; // slot height in relative units (0-1)
  onComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
}

// Helper to create cropped image
const createCroppedImage = async (
  imageSrc: string,
  crop: Area,
  slotWidth: number,
  slotHeight: number,
  targetDPI: number = 300
): Promise<string> => {
  const image = await loadImage(imageSrc);

  // Check if source image is too large and downscale it first
  const MAX_SOURCE_DIMENSION = 4096; // Max dimension for source image
  let sourceImage = image;

  if (image.width > MAX_SOURCE_DIMENSION || image.height > MAX_SOURCE_DIMENSION) {
    console.warn(`Source image too large (${image.width}x${image.height}), downscaling...`);
    const downscaleCanvas = document.createElement("canvas");
    const downscaleCtx = downscaleCanvas.getContext("2d");

    if (!downscaleCtx) {
      throw new Error("Canvas context not available");
    }

    const scale = Math.min(MAX_SOURCE_DIMENSION / image.width, MAX_SOURCE_DIMENSION / image.height);
    downscaleCanvas.width = Math.round(image.width * scale);
    downscaleCanvas.height = Math.round(image.height * scale);

    downscaleCtx.drawImage(image, 0, 0, downscaleCanvas.width, downscaleCanvas.height);

    // Create new image from downscaled canvas
    const downscaledDataUrl = downscaleCanvas.toDataURL("image/jpeg", 0.92);
    sourceImage = await loadImage(downscaledDataUrl);

    // Adjust crop coordinates for downscaled image
    crop = {
      x: crop.x * scale,
      y: crop.y * scale,
      width: crop.width * scale,
      height: crop.height * scale
    };
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  // Calculate output size at 300 DPI based on actual slot size
  // For 206mm page at 300 DPI = 2429 pixels
  const mmToPx = (mm: number) => (mm * targetDPI) / 25.4;
  const pageSize = mmToPx(206);

  // Canvas size should match the actual slot dimensions on the page
  let canvasWidth = Math.round(pageSize * slotWidth);
  let canvasHeight = Math.round(pageSize * slotHeight);

  // Mobile Safari has canvas size limit ~16.7 million pixels
  // Reduce DPI if needed for mobile devices
  const MAX_CANVAS_AREA = 16000000; // 16 megapixels (safe limit)
  const currentArea = canvasWidth * canvasHeight;

  if (currentArea > MAX_CANVAS_AREA) {
    const scale = Math.sqrt(MAX_CANVAS_AREA / currentArea);
    canvasWidth = Math.round(canvasWidth * scale);
    canvasHeight = Math.round(canvasHeight * scale);
    console.warn(`Canvas too large for mobile, reduced to ${canvasWidth}x${canvasHeight}`);
  }

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

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
    throw new Error("Не удалось обработать изображение");
  }

  return canvas.toDataURL("image/jpeg", 0.88);
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
      const croppedImageUrl = await createCroppedImage(
        imageUrl,
        croppedAreaPixels,
        slotWidth,
        slotHeight
      );
      onComplete(croppedImageUrl);
    } catch (error) {
      console.error("Error cropping image:", error);
      alert("Не удалось обработать изображение.\n\nПопробуйте выбрать другое фото.");
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
