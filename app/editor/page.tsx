"use client";

import { useState } from "react";
import Link from "next/link";
import { Album, Spread, Photo } from "@/lib/types";
import { SPREAD_TEMPLATES } from "@/lib/spread-templates";
import { generateAlbumPDF, downloadPDF } from "@/lib/pdf-generator-spreads";
import ImageCropModal from "@/components/ImageCropModal";
import SpreadEditor from "@/components/SpreadEditor";
import SpreadPreview from "@/components/SpreadPreview";

export default function EditorPage() {
  const [album, setAlbum] = useState<Album>({
    id: crypto.randomUUID(),
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
  const disabledTemplates = ["panorama", "focus", "magazine"];

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

  // Add new spread
  const addSpread = (templateId: string) => {
    const template = SPREAD_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const createEmptyPhotos = (count: number): Photo[] =>
      Array(count)
        .fill(null)
        .map(() => ({
          id: crypto.randomUUID(),
          file: null,
          url: "",
          caption: "",
        }));

    const newSpread: Spread = {
      id: crypto.randomUUID(),
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

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        console.log('Opening crop modal - aspectRatio:', slot.aspectRatio, 'slot:', slot.id, 'size:', slot.width, 'x', slot.height);
        setCropModal({
          imageUrl: url,
          spreadId,
          side,
          photoIndex,
          aspectRatio: slot.aspectRatio,
          slotWidth: slot.width,
          slotHeight: slot.height,
        });
      }
    };
    input.click();
  };

  // Complete photo upload after crop
  const completePhotoUpload = (croppedImageUrl: string) => {
    if (!cropModal) return;

    const { spreadId, side, photoIndex } = cropModal;

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
                  ? { ...photo, url: croppedImageUrl, file: null }
                  : photo
              ),
            }
          : spread
      ),
      updatedAt: new Date(),
    }));

    setCropModal(null);
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

  // Generate PDF and download
  const handleGeneratePDF = async () => {
    if (album.spreads.length === 0) {
      alert("Добавьте хотя бы один разворот!");
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
      <header className="bg-brand-olive text-white px-4 md:px-6 py-3 md:py-4 sticky top-0 z-40">
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
                <SpreadEditor
                  key={spread.id}
                  spread={spread}
                  withGaps={album.withGaps}
                  onPhotoClick={(side, idx) =>
                    handlePhotoClick(spread.id, side, idx)
                  }
                  onCaptionChange={(side, idx, caption) =>
                    handleCaptionChange(spread.id, side, idx, caption)
                  }
                />
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
    </div>
  );
}
