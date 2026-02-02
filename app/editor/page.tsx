"use client";

import { useState } from "react";
import Link from "next/link";
import { Album, Spread, Photo } from "@/lib/types";
import { SPREAD_TEMPLATES } from "@/lib/spread-templates";
import { generateAlbumPDF, downloadPDF } from "@/lib/pdf-generator-spreads";
import ImageCropModal from "@/components/ImageCropModal";
import SpreadEditor from "@/components/SpreadEditor";
import TokenSummary from "@/components/TokenSummary";
import SpreadPreview from "@/components/SpreadPreview";
import SpeechBubbleModal from "@/components/SpeechBubbleModal";

// Generate unique ID (works on both server and client)
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export default function EditorPage() {
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

  // Speech bubble modal state
  const [speechBubbleModal, setSpeechBubbleModal] = useState<{
    spreadId: string;
    side: "left" | "right";
    photoIndex: number;
    x: number;
    y: number;
    bubbleId?: string; // If editing existing bubble
    initialText?: string;
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

    // CALCULATE aspect ratio from actual slot dimensions (ignore slot.aspectRatio)
    const realAspectRatio = slot.width / slot.height;

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
            modelId: result.modelId
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
          // Не показываем alert, просто логируем - чтобы не мешать пользователю
          console.error("User will see original photo instead");
        }
      } catch (error: any) {
        console.error("Background stylization error:", error);
        // Не показываем alert, просто логируем
        console.error("User will see original photo instead");
      }
    }
  };

  // Handle caption change
  const handleCaptionChange = (
    spreadId: string,
    side: "left" | "right",
    photoIndex: number,
    caption: string
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
                idx === photoIndex ? { ...photo, caption } : photo
              ),
            }
          : spread
      ),
      updatedAt: new Date(),
    }));
  };

  // Handle speech bubble addition
  const handleAddSpeechBubble = (
    spreadId: string,
    side: "left" | "right",
    photoIndex: number,
    x: number,
    y: number
  ) => {
    setSpeechBubbleModal({
      spreadId,
      side,
      photoIndex,
      x,
      y,
    });
  };

  // Handle speech bubble edit
  const handleEditSpeechBubble = (
    spreadId: string,
    side: "left" | "right",
    photoIndex: number,
    bubbleId: string
  ) => {
    const spread = album.spreads.find(s => s.id === spreadId);
    if (!spread) return;

    const photos = side === "left" ? spread.leftPhotos : spread.rightPhotos;
    const photo = photos[photoIndex];
    const bubble = photo?.speechBubbles?.find(b => b.id === bubbleId);

    if (bubble) {
      setSpeechBubbleModal({
        spreadId,
        side,
        photoIndex,
        x: bubble.x,
        y: bubble.y,
        bubbleId: bubble.id,
        initialText: bubble.text,
      });
    }
  };

  // Handle speech bubble delete
  const handleDeleteSpeechBubble = (
    spreadId: string,
    side: "left" | "right",
    photoIndex: number,
    bubbleId: string
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
                idx === photoIndex
                  ? {
                      ...photo,
                      speechBubbles: photo.speechBubbles?.filter(b => b.id !== bubbleId) || [],
                    }
                  : photo
              ),
            }
          : spread
      ),
      updatedAt: new Date(),
    }));
  };

  // Handle speech bubble move (drag)
  const handleMoveSpeechBubble = (
    spreadId: string,
    side: "left" | "right",
    photoIndex: number,
    bubbleId: string,
    x: number,
    y: number
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
                idx === photoIndex
                  ? {
                      ...photo,
                      speechBubbles: photo.speechBubbles?.map(b =>
                        b.id === bubbleId ? { ...b, x, y } : b
                      ) || [],
                    }
                  : photo
              ),
            }
          : spread
      ),
      updatedAt: new Date(),
    }));
  };

  // Save speech bubble (add or edit)
  const saveSpeechBubble = (text: string, tailDirection: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
    if (!speechBubbleModal) return;

    const { spreadId, side, photoIndex, x, y, bubbleId, initialText } = speechBubbleModal;

    setAlbum((prev) => ({
      ...prev,
      spreads: prev.spreads.map((spread) =>
        spread.id === spreadId
          ? {
              ...spread,
              [side === "left" ? "leftPhotos" : "rightPhotos"]: (
                side === "left" ? spread.leftPhotos : spread.rightPhotos
              ).map((photo, idx) => {
                if (idx !== photoIndex) return photo;

                const bubbles = photo.speechBubbles || [];

                // Edit existing bubble
                if (bubbleId) {
                  return {
                    ...photo,
                    speechBubbles: bubbles.map(b =>
                      b.id === bubbleId
                        ? { ...b, text, tailDirection }
                        : b
                    ),
                  };
                }

                // Add new bubble
                return {
                  ...photo,
                  speechBubbles: [
                    ...bubbles,
                    {
                      id: generateId(),
                      x,
                      y,
                      text,
                      tailDirection,
                    },
                  ],
                };
              }),
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
          </div>
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="btn-gradient px-4 md:px-6 py-2 text-white text-sm md:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isGeneratingPDF ? "PDF..." : "Скачать"}
          </button>
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
            placeholder="Название альбома"
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
                  {SPREAD_TEMPLATES.map((template) => {
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
              {SPREAD_TEMPLATES.map((template) => {
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
                Альбом пустой. Добавьте первый разворот!
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
                    onCaptionChange={(side, idx, caption) =>
                      handleCaptionChange(spread.id, side, idx, caption)
                    }
                    onAddSpeechBubble={(side, idx, x, y) =>
                      handleAddSpeechBubble(spread.id, side, idx, x, y)
                    }
                    onEditSpeechBubble={(side, idx, bubbleId) =>
                      handleEditSpeechBubble(spread.id, side, idx, bubbleId)
                    }
                    onDeleteSpeechBubble={(side, idx, bubbleId) =>
                      handleDeleteSpeechBubble(spread.id, side, idx, bubbleId)
                    }
                    onMoveSpeechBubble={(side, idx, bubbleId, x, y) =>
                      handleMoveSpeechBubble(spread.id, side, idx, bubbleId, x, y)
                    }
                  />
                  <TokenSummary
                    photos={[...spread.leftPhotos, ...spread.rightPhotos]}
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
          onSave={saveSpeechBubble}
          onCancel={() => setSpeechBubbleModal(null)}
        />
      )}
    </div>
  );
}
