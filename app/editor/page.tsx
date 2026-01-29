"use client";

import { useState } from "react";
import Link from "next/link";
import { Album, Spread, Photo } from "@/lib/types";
import { SPREAD_TEMPLATES } from "@/lib/spread-templates";
import { generateAlbumPDF, downloadPDF } from "@/lib/pdf-generator-spreads";
import ImageCropModal from "@/components/ImageCropModal";
import SpreadEditor from "@/components/SpreadEditor";

export default function EditorPage() {
  const [album, setAlbum] = useState<Album>({
    id: crypto.randomUUID(),
    title: "Новый альбом",
    cover: {
      frontImage: null,
      backImage: null,
    },
    spreads: [],
    withGaps: true, // default to having gaps
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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
      // New generator works directly with spreads
      const pdfBlob = await generateAlbumPDF(album);
      const filename = `${album.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}_${Date.now()}.pdf`;
      downloadPDF(pdfBlob, filename);
      alert("PDF успешно создан и скачан!");
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
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition">
              ← Назад
            </Link>
            <input
              type="text"
              value={album.title}
              onChange={(e) =>
                setAlbum((prev) => ({ ...prev, title: e.target.value }))
              }
              className="text-2xl font-serif font-bold border-none focus:outline-none focus:ring-2 focus:ring-brand-orange rounded px-2"
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={album.withGaps}
                onChange={(e) =>
                  setAlbum((prev) => ({ ...prev, withGaps: e.target.checked, updatedAt: new Date() }))
                }
                className="w-4 h-4 text-brand-orange focus:ring-brand-orange rounded"
              />
              <span className="text-gray-700">Отступы между фото</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="btn-gradient px-6 py-2 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? "Создаем PDF..." : "Скачать PDF"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-8 px-6 grid lg:grid-cols-4 gap-8">
        {/* Sidebar - Templates */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-4 sticky top-8">
            <h3 className="font-semibold mb-4">
              Развороты ({album.spreads.length})
            </h3>

            {/* Add spread buttons */}
            <div className="space-y-2 mb-4">
              {SPREAD_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => addSpread(template.id)}
                  className="w-full px-4 py-3 bg-brand-gray hover:bg-gray-200 rounded-lg text-sm transition text-left"
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-gray-600">
                    {template.description}
                  </div>
                </button>
              ))}
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
        <div className="lg:col-span-3">
          {album.spreads.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <p className="text-gray-500 mb-4">
                Альбом пустой. Добавьте первый разворот!
              </p>
              <button
                onClick={() => addSpread("classic")}
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
