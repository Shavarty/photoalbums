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
  // This ensures 300 DPI for the final output
  canvas.width = Math.round(pageSize * slotWidth);
  canvas.height = Math.round(pageSize * slotHeight);

  // Draw cropped image at correct resolution
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL("image/jpeg", 0.95);
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
      alert("Ошибка при обрезке изображения");
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
