"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Album, Spread, Photo } from "@/lib/types";
import { SPREAD_TEMPLATES, PANORAMIC_BG_TEMPLATE_IDS } from "@/lib/spread-templates";
import { generateAlbumPDF, downloadPDF } from "@/lib/pdf-generator-spreads";
import ImageCropModal from "@/components/ImageCropModal";
import SpreadEditor from "@/components/SpreadEditor";
import SpreadPreview from "@/components/SpreadPreview";
import { saveAlbumToIDB, loadAlbumFromIDB } from "@/lib/albumStorage";
import { exportAlbum, importAlbumFromFile } from "@/lib/albumExport";

// Generate unique ID (works on both server and client)
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export default function EditorPage() {
  const [mode, setMode] = useState<'album' | 'comics'>('album');

  const [album, setAlbum] = useState<Album>({
    id: generateId(),
    title: "Название альбома",
    cover: {
      frontImage: null,
      backImage: null,
    },
    spreads: [],
    withGaps: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Detect comics mode from URL on client mount
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'comics') {
      setMode('comics');
      setAlbum(prev => prev.title === 'Название альбома' ? { ...prev, title: 'Название комикса' } : prev);
    }
  }, []);

  // --- Persistence: IndexedDB auto-save + Export/Import ---
  const [isInitialized, setIsInitialized] = useState(false);
  const [savedStatus, setSavedStatus] = useState<'idle' | 'saved'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const justLoadedRef = useRef(false);

  // Load album from IndexedDB on mount
  useEffect(() => {
    loadAlbumFromIDB().then((saved) => {
      if (saved) {
        setAlbum(saved);
        justLoadedRef.current = true;
      }
      setIsInitialized(true);
    });
  }, []);

  // Auto-save with 1s debounce
  useEffect(() => {
    if (!isInitialized) return;
    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      return;
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveAlbumToIDB(album).then(() => {
        setSavedStatus('saved');
        if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
        savedIndicatorRef.current = setTimeout(() => setSavedStatus('idle'), 2000);
      });
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [album, isInitialized]);

  const handleExport = () => exportAlbum(album);

  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const imported = await importAlbumFromFile(file);
      if (album.spreads.length > 0 && !confirm('Текущий альбом будет заменён на импортированный. Продолжить?')) return;
      setAlbum(imported);
    } catch {
      alert('Не удалось импортировать файл');
    }
  };

  const handleNewProject = () => {
    if (album.spreads.length > 0 && !confirm('Текущий альбом будет удалён. Создать новый?')) return;
    setAlbum({
      id: generateId(),
      title: mode === 'comics' ? 'Название комикса' : 'Название альбома',
      cover: { frontImage: null, backImage: null },
      spreads: [],
      withGaps: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Temporarily disabled templates
  const disabledTemplates: string[] = [];

  // Crop modal state
  const [cropModal, setCropModal] = useState<{
    imageUrl: string;
    spreadId: string;
    side: "left" | "right";
    photoIndex: number;
    aspectRatio: number;
    slotWidth: number;
    slotHeight: number;
  } | null>(null);

  // Speech bubble modal state (spread-level — no side/photoIndex)
  const [speechBubbleModal, setSpeechBubbleModal] = useState<{
    spreadId: string;
    x: number;
    y: number;
    bubbleId?: string; // If editing existing bubble
    initialText?: string;
    initialType?: 'speech' | 'thought' | 'annotation' | 'text-block';
    initialTailDirection?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  } | null>(null);

  // Add new spread
  const addSpread = (templateId: string) => {
    const template = SPREAD_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const createEmptyPhotos = (count: number): Photo[] =>
      Array(count)
        .fill(null)
        .map(() => ({
          id: generateId(),
          file: null,
          url: "",
          caption: "",
        }));

    const newSpread: Spread = {
      id: generateId(),
      templateId,
      leftPhotos: createEmptyPhotos(template.leftPage.slots.length),
      rightPhotos: createEmptyPhotos(template.rightPage.slots.length),
    };

    setAlbum((prev) => ({
      ...prev,
      spreads: [...prev.spreads, newSpread],
      updatedAt: new Date(),
    }));

    // Close sidebar on mobile after adding spread
    setSidebarOpen(false);
  };

  // Delete spread
  const deleteSpread = (spreadId: string) => {
    setAlbum((prev) => ({
      ...prev,
      spreads: prev.spreads.filter((s) => s.id !== spreadId),
      updatedAt: new Date(),
    }));
  };

  // Helper: Apply crop to image
  const applyCropToImage = async (imageUrl: string, cropArea: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = cropArea.width;
        canvas.height = cropArea.height;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(
          img,
          cropArea.x,
          cropArea.y,
          cropArea.width,
          cropArea.height,
          0,
          0,
          cropArea.width,
          cropArea.height
        );
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.onerror = () => reject(new Error("Failed to load image for cropping"));
      img.src = imageUrl;
    });
  };

  // Helper: Split 2:1 image into left and right halves at high resolution
  const splitImageInHalf = async (imageUrl: string): Promise<{ leftUrl: string; rightUrl: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const sourceWidth = img.width;
        const sourceHeight = img.height;
        const sourceHalfWidth = sourceWidth / 2;

        // Target size for PDF: ensure high resolution (at least 2000px per half)
        const MIN_SIZE = 2000;
        let targetWidth = sourceHalfWidth;
        let targetHeight = sourceHeight;

        // Scale up if source is too small
        if (targetHeight < MIN_SIZE) {
          const scale = MIN_SIZE / targetHeight;
          targetWidth = Math.round(sourceHalfWidth * scale);
          targetHeight = MIN_SIZE;
        }

        console.log(`Splitting image: source ${sourceWidth}x${sourceHeight} -> each half ${targetWidth}x${targetHeight}`);

        // Create canvas for left half
        const leftCanvas = document.createElement("canvas");
        leftCanvas.width = targetWidth;
        leftCanvas.height = targetHeight;
        const leftCtx = leftCanvas.getContext("2d", { alpha: false });
        if (!leftCtx) {
          reject(new Error("Failed to get left canvas context"));
          return;
        }
        leftCtx.imageSmoothingEnabled = true;
        leftCtx.imageSmoothingQuality = "high";
        leftCtx.drawImage(img, 0, 0, sourceHalfWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
        const leftUrl = leftCanvas.toDataURL("image/jpeg", 0.92);

        // Create canvas for right half
        const rightCanvas = document.createElement("canvas");
        rightCanvas.width = targetWidth;
        rightCanvas.height = targetHeight;
        const rightCtx = rightCanvas.getContext("2d", { alpha: false });
        if (!rightCtx) {
          reject(new Error("Failed to get right canvas context"));
          return;
        }
        rightCtx.imageSmoothingEnabled = true;
        rightCtx.imageSmoothingQuality = "high";
        rightCtx.drawImage(img, sourceHalfWidth, 0, sourceHalfWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
        const rightUrl = rightCanvas.toDataURL("image/jpeg", 0.92);

        resolve({ leftUrl, rightUrl });
      };
      img.onerror = () => reject(new Error("Failed to load image for splitting"));
      img.src = imageUrl;
    });
  };

  // Handle photo click - open file picker
  const handlePhotoClick = (spreadId: string, side: "left" | "right", photoIndex: number) => {
    const spread = album.spreads.find((s) => s.id === spreadId);
    if (!spread) return;

    const template = SPREAD_TEMPLATES.find((t) => t.id === spread.templateId);
    if (!template) return;

    const slot =
      side === "left"
        ? template.leftPage.slots[photoIndex]
        : template.rightPage.slots[photoIndex];

    // For full-spread templates: use 2:1 aspect ratio for background slots (photoIndex 0)
    // These templates split one 2:1 photo across both pages
    const isFullSpreadTemplate = PANORAMIC_BG_TEMPLATE_IDS.includes(template.id);
    const isBackgroundSlot = photoIndex === 0;
    const isFullSpread = isFullSpreadTemplate && isBackgroundSlot;
    const realAspectRatio = isFullSpread ? 2 : slot.width / slot.height;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.heic,.heif";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        let processedFile: File | Blob = file;

        // Check if file is HEIC/HEIF format and convert to JPEG
        const isHeic = file.type === "image/heic" ||
                       file.type === "image/heif" ||
                       file.name.toLowerCase().endsWith(".heic") ||
                       file.name.toLowerCase().endsWith(".heif");

        if (isHeic) {
          console.log("Converting HEIC to JPEG...");
          try {
            // Dynamic import to avoid SSR issues
            const heic2any = (await import("heic2any")).default;

            const convertedBlob = await heic2any({
              blob: file,
              toType: "image/jpeg",
              quality: 0.9,
            });

            // heic2any can return Blob or Blob[], handle both cases
            processedFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
            console.log("HEIC converted successfully");
          } catch (conversionError) {
            console.error("HEIC conversion failed:", conversionError);
            alert("Не удалось обработать HEIC изображение. Попробуйте конвертировать его в JPEG вручную.");
            return;
          }
        }

        // Compress large images for mobile stability
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const maxDimension = isMobile ? 2048 : 4096;

        console.log("Loading image for compression check...");
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          const objectUrl = URL.createObjectURL(processedFile);

          image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
          };
          image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image"));
          };

          image.src = objectUrl;
        });

        console.log(`Image loaded: ${img.width}x${img.height}`);

        // Compress if too large
        if (img.width > maxDimension || img.height > maxDimension) {
          console.log(`Compressing large image from ${img.width}x${img.height}...`);

          const canvas = document.createElement("canvas");
          const scale = Math.min(maxDimension / img.width, maxDimension / img.height);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);

          const ctx = canvas.getContext("2d", { alpha: false });
          if (!ctx) throw new Error("Canvas context unavailable");

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          processedFile = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Failed to compress image"));
              },
              "image/jpeg",
              0.88
            );
          });

          console.log(`Compressed to ${canvas.width}x${canvas.height}`);
        }

        const url = URL.createObjectURL(processedFile);
        console.log('Opening crop modal - REAL aspectRatio:', realAspectRatio.toFixed(3), 'slot:', slot.id, 'size:', slot.width, 'x', slot.height);
        setCropModal({
          imageUrl: url,
          spreadId,
          side,
          photoIndex,
          aspectRatio: realAspectRatio,  // Use REAL aspect ratio
          slotWidth: slot.width,
          slotHeight: slot.height,
        });
      } catch (error) {
        console.error("Error processing image:", error);
        alert("Не удалось загрузить изображение. Попробуйте выбрать фото меньшего размера.");
      }
    };
    input.click();
  };

  // Complete photo upload after crop
  const completePhotoUpload = async (result: { previewUrl: string; originalUrl: string; cropArea: any; tokens?: any; isStylizing?: boolean; modelId?: string; photoId?: string }) => {
    if (!cropModal) return;

    const { spreadId, side, photoIndex } = cropModal;

    // Check if this is full-spread template (2:1 photo split across both pages)
    const spread = album.spreads.find((s) => s.id === spreadId);
    const template = spread && SPREAD_TEMPLATES.find((t) => t.id === spread.templateId);
    const isFullSpreadTemplate = template ? PANORAMIC_BG_TEMPLATE_IDS.includes(template.id) : false;
    const isBackgroundSlot = photoIndex === 0;
    const isFullSpread = isFullSpreadTemplate && isBackgroundSlot;

    if (isFullSpread) {
      // Full-spread: crop at 2:1, optionally stylize, then split into left/right halves
      console.log("Full-spread detected! Processing 2:1 image...");
      try {
        // Step 1: Apply crop to originalUrl (it's the uncropped original file)
        const croppedOriginal = result.cropArea
          ? await applyCropToImage(result.originalUrl, result.cropArea)
          : result.originalUrl;

        let previewToSplit = result.previewUrl;
        let originalToSplit = croppedOriginal;

        // Step 2: If stylization requested, stylize the 2:1 image BEFORE splitting
        if (result.isStylizing && result.modelId) {
          console.log("Stylizing 2:1 image before splitting...");

          // Debug: check dimensions of original cropped image
          const checkOriginalDimensions = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              console.log(`ORIGINAL 2:1 cropped dimensions: ${img.width}x${img.height}, aspect ratio: ${(img.width/img.height).toFixed(2)}`);
              resolve(true);
            };
            img.src = previewToSplit;
          });

          // Save temporary split (for immediate feedback)
          const { leftUrl: tempLeftUrl, rightUrl: tempRightUrl } = await splitImageInHalf(previewToSplit);
          const { leftUrl: tempLeftOriginal, rightUrl: tempRightOriginal } = await splitImageInHalf(originalToSplit);

          setAlbum((prev) => ({
            ...prev,
            spreads: prev.spreads.map((spread) =>
              spread.id === spreadId
                ? {
                    ...spread,
                    leftPhotos: spread.leftPhotos.map((photo, idx) =>
                      idx === 0
                        ? {
                            ...photo,
                            url: tempLeftUrl,
                            originalUrl: tempLeftOriginal,
                            cropArea: undefined,
                            isStylizing: true, // Show loading state
                            file: null,
                          }
                        : photo
                    ),
                    rightPhotos: spread.rightPhotos.map((photo, idx) =>
                      idx === 0
                        ? {
                            ...photo,
                            url: tempRightUrl,
                            originalUrl: tempRightOriginal,
                            cropArea: undefined,
                            isStylizing: true, // Show loading state
                            file: null,
                          }
                        : photo
                    ),
                  }
                : spread
            ),
            updatedAt: new Date(),
          }));
          setCropModal(null);

          // Trigger stylization
          const apiResponse = await fetch('/api/stylize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: previewToSplit,
              modelId: result.modelId,
              prompt: getAssembledPrompt(album.stylizeSettings)
            })
          });

          const stylizeResult = await apiResponse.json();

          if (stylizeResult.success) {
            console.log("Stylization complete! Now cropping to 2:1 and splitting...");

            // Gemini returns images at 16:9 or 21:9 - we need to crop to 2:1 first!
            const cropTo2x1 = async (imageUrl: string): Promise<string> => {
              return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                  const currentAspect = img.width / img.height;
                  console.log(`Stylized image: ${img.width}x${img.height}, aspect: ${currentAspect.toFixed(2)}`);

                  // Calculate 2:1 crop from center
                  let cropWidth, cropHeight, cropX, cropY;

                  if (currentAspect > 2) {
                    // Image is wider than 2:1 - crop width
                    cropHeight = img.height;
                    cropWidth = cropHeight * 2; // 2:1 aspect
                    cropX = (img.width - cropWidth) / 2; // Center horizontally
                    cropY = 0;
                  } else {
                    // Image is taller than 2:1 - crop height
                    cropWidth = img.width;
                    cropHeight = cropWidth / 2; // 2:1 aspect
                    cropX = 0;
                    cropY = (img.height - cropHeight) / 2; // Center vertically
                  }

                  console.log(`Cropping to 2:1: from ${cropX},${cropY} size ${cropWidth}x${cropHeight}`);

                  // Create canvas with 2:1 aspect
                  const canvas = document.createElement("canvas");
                  canvas.width = cropWidth;
                  canvas.height = cropHeight;
                  const ctx = canvas.getContext("2d", { alpha: false });
                  if (!ctx) {
                    reject(new Error("Failed to get canvas context"));
                    return;
                  }
                  ctx.imageSmoothingEnabled = true;
                  ctx.imageSmoothingQuality = "high";
                  ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
                  resolve(canvas.toDataURL("image/jpeg", 0.92));
                };
                img.onerror = () => reject(new Error("Failed to load stylized image"));
                img.src = imageUrl;
              });
            };

            // Crop stylized result to 2:1
            const cropped2x1 = await cropTo2x1(stylizeResult.stylizedUrl);
            console.log("Cropped to 2:1, now splitting...");

            // Split the cropped 2:1 image
            const { leftUrl: stylizedLeftUrl, rightUrl: stylizedRightUrl } = await splitImageInHalf(cropped2x1);

            // Update both slots with stylized halves
            setAlbum((prev) => ({
              ...prev,
              spreads: prev.spreads.map((spread) =>
                spread.id === spreadId
                  ? {
                      ...spread,
                      leftPhotos: spread.leftPhotos.map((photo, idx) =>
                        idx === 0
                          ? {
                              ...photo,
                              url: stylizedLeftUrl,
                              originalUrl: stylizedLeftUrl,
                              tokens: stylizeResult.tokens,
                              isStylizing: false,
                            }
                          : photo
                      ),
                      rightPhotos: spread.rightPhotos.map((photo, idx) =>
                        idx === 0
                          ? {
                              ...photo,
                              url: stylizedRightUrl,
                              originalUrl: stylizedRightUrl,
                              tokens: undefined, // Токены считаются только на левой половине
                              isStylizing: false,
                            }
                          : photo
                      ),
                    }
                  : spread
              ),
              updatedAt: new Date(),
            }));
          } else {
            console.error("Stylization failed:", stylizeResult.error);
            // Keep the unstyled split images, just remove loading state
            setAlbum((prev) => ({
              ...prev,
              spreads: prev.spreads.map((spread) =>
                spread.id === spreadId
                  ? {
                      ...spread,
                      leftPhotos: spread.leftPhotos.map((photo, idx) =>
                        idx === 0 ? { ...photo, isStylizing: false } : photo
                      ),
                      rightPhotos: spread.rightPhotos.map((photo, idx) =>
                        idx === 0 ? { ...photo, isStylizing: false } : photo
                      ),
                    }
                  : spread
              ),
            }));
          }
        } else {
          // No stylization - just split and save
          const { leftUrl, rightUrl } = await splitImageInHalf(previewToSplit);
          const { leftUrl: leftOriginal, rightUrl: rightOriginal } = await splitImageInHalf(originalToSplit);

          setAlbum((prev) => ({
            ...prev,
            spreads: prev.spreads.map((spread) =>
              spread.id === spreadId
                ? {
                    ...spread,
                    leftPhotos: spread.leftPhotos.map((photo, idx) =>
                      idx === 0
                        ? {
                            ...photo,
                            url: leftUrl,
                            originalUrl: leftOriginal,
                            cropArea: undefined,
                            file: null,
                          }
                        : photo
                    ),
                    rightPhotos: spread.rightPhotos.map((photo, idx) =>
                      idx === 0
                        ? {
                            ...photo,
                            url: rightUrl,
                            originalUrl: rightOriginal,
                            cropArea: undefined,
                            file: null,
                          }
                        : photo
                    ),
                  }
                : spread
            ),
            updatedAt: new Date(),
          }));
          setCropModal(null);
          console.log("Image split successfully!");
        }
      } catch (error) {
        console.error("Error processing full-spread image:", error);
        // Убираем spinner на обоих слотах panoramic
        setAlbum((prev) => ({
          ...prev,
          spreads: prev.spreads.map((s) =>
            s.id === spreadId
              ? {
                  ...s,
                  leftPhotos: s.leftPhotos.map((photo, idx) =>
                    idx === 0 ? { ...photo, isStylizing: false } : photo
                  ),
                  rightPhotos: s.rightPhotos.map((photo, idx) =>
                    idx === 0 ? { ...photo, isStylizing: false } : photo
                  ),
                }
              : s
          ),
        }));
        alert("Не удалось обработать изображение. Попробуйте еще раз.");
        setCropModal(null);
      }
      return;
    }

    // Сначала сохраняем обычное фото (быстро закрываем modal)
    setAlbum((prev) => ({
      ...prev,
      spreads: prev.spreads.map((spread) =>
        spread.id === spreadId
          ? {
              ...spread,
              [side === "left" ? "leftPhotos" : "rightPhotos"]: (
                side === "left" ? spread.leftPhotos : spread.rightPhotos
              ).map((photo, idx) =>
                idx === photoIndex
                  ? {
                      ...photo,
                      url: result.previewUrl,        // Low-res preview for editor
                      originalUrl: result.originalUrl, // High-res for PDF
                      cropArea: result.cropArea,      // Crop coordinates
                      tokens: result.tokens,          // AI tokens if stylized
                      isStylizing: result.isStylizing || false, // Show progress if stylizing
                      file: null
                    }
                  : photo
              ),
            }
          : spread
      ),
      updatedAt: new Date(),
    }));

    setCropModal(null);

    // Если нужна стилизация - запускаем в фоне
    if (result.isStylizing && result.modelId) {
      console.log("Starting background stylization...");

      try {
        const apiResponse = await fetch('/api/stylize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: result.previewUrl,
            modelId: result.modelId,
            prompt: getAssembledPrompt(album.stylizeSettings)
          })
        });

        const stylizeResult = await apiResponse.json();

        if (stylizeResult.success) {
          // Обновляем фото стилизованной версией
          setAlbum((prev) => ({
            ...prev,
            spreads: prev.spreads.map((spread) =>
              spread.id === spreadId
                ? {
                    ...spread,
                    [side === "left" ? "leftPhotos" : "rightPhotos"]: (
                      side === "left" ? spread.leftPhotos : spread.rightPhotos
                    ).map((photo, idx) =>
                      idx === photoIndex
                        ? {
                            ...photo,
                            url: stylizeResult.stylizedUrl,
                            originalUrl: stylizeResult.stylizedUrl,
                            tokens: stylizeResult.tokens,
                            isStylizing: false
                          }
                        : photo
                    ),
                  }
                : spread
            ),
            updatedAt: new Date(),
          }));

          console.log("Stylization complete!");
        } else {
          console.error("Stylization failed:", stylizeResult.error);
          // Убираем spinner, оставляем оригинальное фото
          setAlbum((prev) => ({
            ...prev,
            spreads: prev.spreads.map((spread) =>
              spread.id === spreadId
                ? {
                    ...spread,
                    [side === "left" ? "leftPhotos" : "rightPhotos"]: (
                      side === "left" ? spread.leftPhotos : spread.rightPhotos
                    ).map((photo, idx) =>
                      idx === photoIndex ? { ...photo, isStylizing: false } : photo
                    ),
                  }
                : spread
            ),
          }));
        }
      } catch (error: any) {
        console.error("Background stylization error:", error);
        // Убираем spinner, оставляем оригинальное фото
        setAlbum((prev) => ({
          ...prev,
          spreads: prev.spreads.map((spread) =>
            spread.id === spreadId
              ? {
                  ...spread,
                  [side === "left" ? "leftPhotos" : "rightPhotos"]: (
                    side === "left" ? spread.leftPhotos : spread.rightPhotos
                  ).map((photo, idx) =>
                    idx === photoIndex ? { ...photo, isStylizing: false } : photo
                  ),
                }
              : spread
          ),
        }));
      }
    }
  };

  // Handle caption change
  // Handle delete photo
  const handleDeletePhoto = (
    spreadId: string,
    side: "left" | "right",
    photoIndex: number
  ) => {
    if (!confirm("Удалить это фото?")) return;

    setAlbum((prev) => ({
      ...prev,
      spreads: prev.spreads.map((spread) =>
        spread.id === spreadId
          ? {
              ...spread,
              [side === "left" ? "leftPhotos" : "rightPhotos"]: (
                side === "left" ? spread.leftPhotos : spread.rightPhotos
              ).map((photo, idx) =>
                idx === photoIndex
                  ? {
                      id: generateId(),
                      file: null,
                      url: "",
                    }
                  : photo
              ),
            }
          : spread
      ),
      updatedAt: new Date(),
    }));
  };

  // Toggle slot visibility (hide / show)
  const handleToggleSlot = (
    spreadId: string,
    side: "left" | "right",
    photoIndex: number
  ) => {
    setAlbum((prev) => ({
      ...prev,
      spreads: prev.spreads.map((spread) =>
        spread.id === spreadId
          ? {
              ...spread,
              [side === "left" ? "leftPhotos" : "rightPhotos"]: (
                side === "left" ? spread.leftPhotos : spread.rightPhotos
              ).map((photo, idx) =>
                idx === photoIndex ? { ...photo, hidden: !photo.hidden } : photo
              ),
            }
          : spread
      ),
      updatedAt: new Date(),
    }));
  };

  // --- Spread-level bubble handlers ---

  const handleAddBubble = (spreadId: string, x: number, y: number) => {
    setSpeechBubbleModal({ spreadId, x, y });
  };

  const handleEditBubble = (spreadId: string, bubbleId: string) => {
    const spread = album.spreads.find(s => s.id === spreadId);
    const bubble = spread?.bubbles?.find(b => b.id === bubbleId);
    if (bubble) {
      setSpeechBubbleModal({
        spreadId,
        x: bubble.x,
        y: bubble.y,
        bubbleId: bubble.id,
        initialText: bubble.text,
        initialType: bubble.type || 'speech',
        initialTailDirection: bubble.tailDirection || 'bottom-left',
      });
    }
  };

  const handleDeleteBubble = (spreadId: string, bubbleId: string) => {
    setAlbum((prev) => ({
      ...prev,
      spreads: prev.spreads.map((spread) =>
        spread.id === spreadId
          ? { ...spread, bubbles: (spread.bubbles || []).filter(b => b.id !== bubbleId) }
          : spread
      ),
      updatedAt: new Date(),
    }));
  };

  const handleMoveBubble = (spreadId: string, bubbleId: string, x: number, y: number) => {
    setAlbum((prev) => ({
      ...prev,
      spreads: prev.spreads.map((spread) =>
        spread.id === spreadId
          ? { ...spread, bubbles: (spread.bubbles || []).map(b => b.id === bubbleId ? { ...b, x, y } : b) }
          : spread
      ),
      updatedAt: new Date(),
    }));
  };

  const handleResizeBubble = (spreadId: string, bubbleId: string, width: number, height: number) => {
    setAlbum((prev) => ({
      ...prev,
      spreads: prev.spreads.map((spread) =>
        spread.id === spreadId
          ? { ...spread, bubbles: (spread.bubbles || []).map(b => b.id === bubbleId ? { ...b, width, height } : b) }
          : spread
      ),
      updatedAt: new Date(),
    }));
  };

  const handleScaleBubble = (spreadId: string, bubbleId: string, scale: number) => {
    setAlbum((prev) => ({
      ...prev,
      spreads: prev.spreads.map((spread) =>
        spread.id === spreadId
          ? { ...spread, bubbles: (spread.bubbles || []).map(b => b.id === bubbleId ? { ...b, scale } : b) }
          : spread
      ),
      updatedAt: new Date(),
    }));
  };

  const handleFontSizeBubble = (spreadId: string, bubbleId: string, fontSize: number) => {
    setAlbum((prev) => ({
      ...prev,
      spreads: prev.spreads.map((spread) =>
        spread.id === spreadId
          ? { ...spread, bubbles: (spread.bubbles || []).map(b => b.id === bubbleId ? { ...b, fontSize } : b) }
          : spread
      ),
      updatedAt: new Date(),
    }));
  };

  // Save speech bubble (add or edit) — spread-level
  const saveSpeechBubble = (
    text: string,
    type: 'speech' | 'thought' | 'annotation' | 'text-block',
    tailDirection: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  ) => {
    if (!speechBubbleModal) return;
    const { spreadId, x, y, bubbleId } = speechBubbleModal;

    setAlbum((prev) => ({
      ...prev,
      spreads: prev.spreads.map((spread) =>
        spread.id === spreadId
          ? {
              ...spread,
              bubbles: bubbleId
                ? (spread.bubbles || []).map(b =>
                    b.id === bubbleId ? { ...b, text, type, tailDirection } : b
                  )
                : [
                    ...(spread.bubbles || []),
                    { id: generateId(), x, y, text, type, tailDirection },
                  ],
            }
          : spread
      ),
      updatedAt: new Date(),
    }));

    setSpeechBubbleModal(null);
  };

  // Generate PDF and download
  const handleGeneratePDF = async () => {
    if (album.spreads.length === 0) {
      alert("Добавьте хотя бы один разворот!");
      return;
    }

    // Check if at least one photo exists in any spread
    const hasPhotos = album.spreads.some(spread =>
      [...spread.leftPhotos, ...spread.rightPhotos].some(photo => photo?.url)
    );

    if (!hasPhotos) {
      alert("Прежде чем скачать альбом, загрузите свои фотографии в ячейки разворотов");
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const pdfBlob = await generateAlbumPDF(album);
      const filename = `${album.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}_${Date.now()}.pdf`;
      downloadPDF(pdfBlob, filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Ошибка при создании PDF. Проверьте консоль.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // In comics mode, show comic-specific templates first
  const orderedTemplates = mode === 'comics'
    ? [...SPREAD_TEMPLATES].sort((a, b) => {
        const comicIds = ['comic-spread-bg', 'comic-strips', 'comic-quartet', 'comic-asymmetric', 'full-spread'];
        return (comicIds.includes(b.id) ? 1 : 0) - (comicIds.includes(a.id) ? 1 : 0);
      })
    : SPREAD_TEMPLATES;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-olive text-white px-4 md:px-6 py-3 md:py-4 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden flex-shrink-0 w-8 h-8 flex flex-col justify-center items-center gap-1.5"
              aria-label="Меню"
            >
              <span className="w-6 h-0.5 bg-white"></span>
              <span className="w-6 h-0.5 bg-white"></span>
              <span className="w-6 h-0.5 bg-white"></span>
            </button>

            <Link href="/" className="flex-shrink-0">
              <img
                src="/logo.svg"
                alt="Книгодар"
                className="h-7 md:h-8 w-auto"
              />
            </Link>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${mode === 'comics' ? 'bg-brand-orange/15 text-brand-orange' : 'bg-brand-olive/15 text-brand-olive'}`}>
              {mode === 'comics' ? 'Комикс' : 'Альбом'}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {savedStatus === 'saved' && (
              <span className="text-green-300 text-xs font-medium">✓ Сохранено</span>
            )}
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="btn-gradient px-4 md:px-6 py-2 text-white text-sm md:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? "PDF..." : "Скачать"}
            </button>
          </div>
        </div>
      </header>

      {/* Album Title Section */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <input
            type="text"
            value={album.title}
            onChange={(e) =>
              setAlbum((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder={mode === 'comics' ? "Название комикса" : "Название альбома"}
            className="text-xl md:text-3xl font-sans font-semibold border-none focus:outline-none focus:ring-2 focus:ring-brand-olive rounded px-2 w-full text-foreground placeholder-gray-400 text-center"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar - Mobile Overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            ></div>
            <div className="fixed top-0 left-0 bottom-0 w-80 bg-white z-40 shadow-xl lg:hidden overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                <h3 className="font-semibold text-lg">
                  Развороты ({album.spreads.length})
                </h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 flex items-center justify-center"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4">
                {/* Project actions */}
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={handleNewProject}
                    className="flex-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition"
                  >
                    Новый
                  </button>
                  <button
                    onClick={() => importFileRef.current?.click()}
                    className="flex-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition"
                  >
                    Импорт
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={album.spreads.length === 0}
                    className="flex-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Экспорт
                  </button>
                </div>

                {/* Gaps toggle */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={album.withGaps}
                      onChange={(e) =>
                        setAlbum((prev) => ({ ...prev, withGaps: e.target.checked, updatedAt: new Date() }))
                      }
                      className="w-4 h-4 text-brand-orange focus:ring-brand-orange rounded"
                    />
                    <span className="text-gray-700 font-medium">Отступы между фото</span>
                  </label>
                </div>

                {/* Add spread buttons */}
                <div className="space-y-2 mb-4">
                  {orderedTemplates.map((template) => {
                    const isDisabled = disabledTemplates.includes(template.id);
                    return (
                      <button
                        key={template.id}
                        onClick={() => !isDisabled && addSpread(template.id)}
                        disabled={isDisabled}
                        className={`w-full px-3 py-2 bg-brand-gray rounded-lg text-sm transition text-left flex items-center gap-3 ${
                          isDisabled
                            ? 'cursor-not-allowed'
                            : 'hover:bg-gray-200'
                        }`}
                      >
                        <SpreadPreview templateId={template.id} size={35} />
                        <div className="flex-1">
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs text-gray-600">
                            {template.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Spread list */}
                <div className="space-y-2">
                  {album.spreads.map((spread, index) => {
                    const template = SPREAD_TEMPLATES.find(
                      (t) => t.id === spread.templateId
                    );
                    return (
                      <div
                        key={spread.id}
                        className="p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">
                            Разворот {index + 1}
                          </span>
                          <button
                            onClick={() => deleteSpread(spread.id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Удалить
                          </button>
                        </div>
                        <div className="text-xs text-gray-500">
                          {template?.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Sidebar - Desktop */}
        <div className="hidden lg:block lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm p-4 sticky top-24 m-6">
            <h3 className="font-semibold mb-4">
              Развороты ({album.spreads.length})
            </h3>

            {/* Project actions */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={handleNewProject}
                className="flex-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition"
              >
                Новый
              </button>
              <button
                onClick={() => importFileRef.current?.click()}
                className="flex-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition"
              >
                Импорт
              </button>
              <button
                onClick={handleExport}
                disabled={album.spreads.length === 0}
                className="flex-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Экспорт
              </button>
            </div>

            {/* Gaps toggle */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={album.withGaps}
                  onChange={(e) =>
                    setAlbum((prev) => ({ ...prev, withGaps: e.target.checked, updatedAt: new Date() }))
                  }
                  className="w-4 h-4 text-brand-orange focus:ring-brand-orange rounded"
                />
                <span className="text-gray-700 font-medium">Отступы между фото</span>
              </label>
            </div>

            {/* Add spread buttons */}
            <div className="space-y-2 mb-4">
              {orderedTemplates.map((template) => {
                const isDisabled = disabledTemplates.includes(template.id);
                return (
                  <button
                    key={template.id}
                    onClick={() => !isDisabled && addSpread(template.id)}
                    disabled={isDisabled}
                    className={`w-full px-3 py-2 bg-brand-gray rounded-lg text-sm transition text-left flex items-center gap-3 ${
                      isDisabled
                        ? 'cursor-not-allowed'
                        : 'hover:bg-gray-200'
                    }`}
                  >
                    <SpreadPreview templateId={template.id} size={35} />
                    <div className="flex-1">
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-gray-600">
                        {template.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Spread list */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {album.spreads.map((spread, index) => {
                const template = SPREAD_TEMPLATES.find(
                  (t) => t.id === spread.templateId
                );
                return (
                  <div
                    key={spread.id}
                    className="p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">
                        Разворот {index + 1}
                      </span>
                      <button
                        onClick={() => deleteSpread(spread.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Удалить
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      {template?.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 p-4 md:p-6">
          {album.spreads.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 md:p-12 text-center">
              <p className="text-gray-500 mb-4">
                {mode === 'comics' ? "Комикс пустой. Добавьте первый разворот!" : "Альбом пустой. Добавьте первый разворот!"}
              </p>
              <button
                onClick={() => setSidebarOpen(true)}
                className="btn-gradient px-8 py-3 text-white font-semibold"
              >
                Добавить разворот
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {album.spreads.map((spread) => (
                <div key={spread.id}>
                  <SpreadEditor
                    spread={spread}
                    withGaps={album.withGaps}
                    onPhotoClick={(side, idx) =>
                      handlePhotoClick(spread.id, side, idx)
                    }
                    onDeletePhoto={(side, idx) =>
                      handleDeletePhoto(spread.id, side, idx)
                    }
                    onToggleSlot={(side, idx) =>
                      handleToggleSlot(spread.id, side, idx)
                    }
                    onAddBubble={(x, y) =>
                      handleAddBubble(spread.id, x, y)
                    }
                    onEditBubble={(bubbleId) =>
                      handleEditBubble(spread.id, bubbleId)
                    }
                    onDeleteBubble={(bubbleId) =>
                      handleDeleteBubble(spread.id, bubbleId)
                    }
                    onMoveBubble={(bubbleId, x, y) =>
                      handleMoveBubble(spread.id, bubbleId, x, y)
                    }
                    onResizeBubble={(bubbleId, width, height) =>
                      handleResizeBubble(spread.id, bubbleId, width, height)
                    }
                    onScaleBubble={(bubbleId, scale) =>
                      handleScaleBubble(spread.id, bubbleId, scale)
                    }
                    onFontSizeBubble={(bubbleId, fontSize) =>
                      handleFontSizeBubble(spread.id, bubbleId, fontSize)
                    }
                  />
                </div>
              ))}

              {/* Add more spreads button */}
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="btn-gradient px-8 py-3 text-white font-semibold"
                >
                  + Добавить ещё разворот
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        type="file"
        ref={importFileRef}
        accept=".json"
        className="hidden"
        onChange={handleImportChange}
      />

      {/* Crop Modal */}
      {cropModal && (
        <ImageCropModal
          imageUrl={cropModal.imageUrl}
          aspectRatio={cropModal.aspectRatio}
          slotWidth={cropModal.slotWidth}
          slotHeight={cropModal.slotHeight}
          onComplete={completePhotoUpload}
          onCancel={() => setCropModal(null)}
        />
      )}

      {/* Speech Bubble Modal */}
      {speechBubbleModal && (
        <SpeechBubbleModal
          initialText={speechBubbleModal.initialText}
          initialType={speechBubbleModal.initialType}
          initialTailDirection={speechBubbleModal.initialTailDirection}
          onSave={saveSpeechBubble}
          onCancel={() => setSpeechBubbleModal(null)}
        />
      )}
    </div>
  );
}
