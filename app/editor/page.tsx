"use client";

import { useState } from "react";
import Link from "next/link";
import { Album, Page, Photo, LayoutType, LAYOUT_CONFIG } from "@/lib/types";
import { generateAlbumPDF, downloadPDF } from "@/lib/pdf-generator";
import ImageCropModal from "@/components/ImageCropModal";

export default function EditorPage() {
  const [album, setAlbum] = useState<Album>({
    id: crypto.randomUUID(),
    title: "Новый альбом",
    cover: {
      frontImage: null,
      backImage: null,
    },
    pages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Crop modal state
  const [cropModal, setCropModal] = useState<{
    imageUrl: string;
    pageId: string;
    photoIndex: number;
    aspectRatio: number;
  } | null>(null);

  // Generate and download PDF
  const handleGeneratePDF = async () => {
    if (album.pages.length === 0) {
      alert("Добавьте хотя бы одну страницу с фото!");
      return;
    }

    setIsGeneratingPDF(true);
    try {
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

  // Add new page
  const addPage = (layout: LayoutType = "single") => {
    const newPage: Page = {
      id: crypto.randomUUID(),
      layout,
      photos: Array(LAYOUT_CONFIG[layout].slots).fill(null).map(() => ({
        id: crypto.randomUUID(),
        file: null,
        url: "",
        caption: "",
      })),
    };
    setAlbum((prev) => ({
      ...prev,
      pages: [...prev.pages, newPage],
      updatedAt: new Date(),
    }));
  };

  // Start photo upload - open crop modal
  const startPhotoUpload = (pageId: string, photoIndex: number, file: File, layout: LayoutType) => {
    const url = URL.createObjectURL(file);
    // Determine aspect ratio based on layout
    const aspectRatio = layout === "spread" ? 2 : 1; // 2:1 for spread, square for others
    setCropModal({ imageUrl: url, pageId, photoIndex, aspectRatio });
  };

  // Complete photo upload after crop
  const completePhotoUpload = (croppedImageUrl: string) => {
    if (!cropModal) return;

    const { pageId, photoIndex } = cropModal;
    setAlbum((prev) => ({
      ...prev,
      pages: prev.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              photos: page.photos.map((photo, idx) =>
                idx === photoIndex ? { ...photo, file: null, url: croppedImageUrl } : photo
              ),
            }
          : page
      ),
      updatedAt: new Date(),
    }));

    setCropModal(null);
  };

  // Delete page
  const deletePage = (pageId: string) => {
    setAlbum((prev) => ({
      ...prev,
      pages: prev.pages.filter((page) => page.id !== pageId),
      updatedAt: new Date(),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition"
            >
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
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => alert("Предпросмотр в разработке")}
              className="px-6 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition font-medium"
            >
              Предпросмотр
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="btn-gradient px-6 py-2 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? "Создаем PDF..." : "Создать PDF"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-8 px-6 grid lg:grid-cols-4 gap-8">
        {/* Sidebar - Page List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-4 sticky top-8">
            <h3 className="font-semibold mb-4">Страницы ({album.pages.length})</h3>

            {/* Add page buttons */}
            <div className="space-y-2 mb-4">
              <button
                onClick={() => addPage("single")}
                className="w-full px-4 py-2 bg-brand-gray hover:bg-gray-200 rounded-lg text-sm transition"
              >
                + 1 фото
              </button>
              <button
                onClick={() => addPage("quad")}
                className="w-full px-4 py-2 bg-brand-gray hover:bg-gray-200 rounded-lg text-sm transition"
              >
                + 4 фото
              </button>
              <button
                onClick={() => addPage("spread")}
                className="w-full px-4 py-2 bg-brand-gray hover:bg-gray-200 rounded-lg text-sm transition"
              >
                + Разворот
              </button>
            </div>

            {/* Page thumbnails */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {album.pages.map((page, index) => (
                <div
                  key={page.id}
                  onClick={() => setSelectedPageId(page.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                    selectedPageId === page.id
                      ? "border-brand-orange bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      Стр. {index + 1}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(page.id);
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Удалить
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    {LAYOUT_CONFIG[page.layout].name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="lg:col-span-3">
          {album.pages.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <p className="text-gray-500 mb-4">
                Альбом пустой. Добавьте первую страницу!
              </p>
              <button
                onClick={() => addPage("single")}
                className="btn-gradient px-8 py-3 text-white font-semibold"
              >
                Добавить страницу
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {album.pages.map((page, pageIndex) => (
                <div
                  key={page.id}
                  className="bg-white rounded-xl shadow-sm p-6"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">
                      Страница {pageIndex + 1} -{" "}
                      {LAYOUT_CONFIG[page.layout].name}
                    </h3>
                  </div>

                  {/* Photo slots */}
                  <div
                    className={`grid gap-4 ${
                      page.layout === "quad" ? "grid-cols-2" : "grid-cols-1"
                    }`}
                  >
                    {page.photos.map((photo, photoIndex) => (
                      <div key={photo.id} className="space-y-2">
                        <div
                          className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-brand-orange transition cursor-pointer"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement)
                                .files?.[0];
                              if (file) {
                                startPhotoUpload(page.id, photoIndex, file, page.layout);
                              }
                            };
                            input.click();
                          }}
                        >
                          {photo.url ? (
                            <img
                              src={photo.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-gray-400">
                                Загрузить фото
                              </span>
                            </div>
                          )}
                        </div>
                        {photo.url && (
                          <input
                            type="text"
                            placeholder="Добавить подпись..."
                            value={photo.caption || ""}
                            onChange={(e) => {
                              setAlbum((prev) => ({
                                ...prev,
                                pages: prev.pages.map((p) =>
                                  p.id === page.id
                                    ? {
                                        ...p,
                                        photos: p.photos.map((ph, idx) =>
                                          idx === photoIndex
                                            ? { ...ph, caption: e.target.value }
                                            : ph
                                        ),
                                      }
                                    : p
                                ),
                              }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
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
          onComplete={completePhotoUpload}
          onCancel={() => setCropModal(null)}
        />
      )}
    </div>
  );
}
