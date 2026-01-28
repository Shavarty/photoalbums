"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  pdfBlob: Blob | null;
  onClose: () => void;
}

export default function PDFViewer({ pdfBlob, onClose }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  if (!pdfBlob) return null;

  const pdfUrl = URL.createObjectURL(pdfBlob);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-serif font-bold">Предпросмотр PDF</h2>
            <p className="text-sm text-gray-600">
              Страница {currentPage} из {numPages}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* PDF Display */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4 flex justify-center items-start">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="text-center py-12">
                <div className="text-gray-600">Загрузка PDF...</div>
              </div>
            }
            error={
              <div className="text-center py-12">
                <div className="text-red-600">Ошибка загрузки PDF</div>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={
                <div className="bg-white p-12 rounded shadow">
                  <div className="text-gray-600">Загрузка страницы...</div>
                </div>
              }
            />
          </Document>
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex justify-between items-center gap-4">
            {/* Page navigation */}
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Предыдущая
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                className="px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Следующая →
              </button>
            </div>

            {/* Zoom controls */}
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
                disabled={scale <= 0.5}
                className="px-3 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                −
              </button>
              <span className="text-sm text-gray-600 min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(2.0, s + 0.1))}
                disabled={scale >= 2.0}
                className="px-3 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition font-medium"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
