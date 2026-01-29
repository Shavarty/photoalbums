// Types for photo album editor with spreads

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Photo {
  id: string;
  file: File | null;
  url: string; // Preview URL (low-res for editor display)
  originalUrl?: string; // Original high-res URL for PDF generation
  cropArea?: CropArea; // Crop coordinates in pixels on original image
  caption?: string;
}

export interface Spread {
  id: string;
  templateId: string; // reference to spread template
  leftPhotos: Photo[]; // photos for left page
  rightPhotos: Photo[]; // photos for right page
}

export interface Cover {
  frontImage: Photo | null;
  backImage: Photo | null;
  title?: string;
}

export interface Album {
  id: string;
  title: string;
  cover: Cover;
  spreads: Spread[]; // changed from pages to spreads
  withGaps: boolean; // whether to use gaps between photos (applies to entire album)
  createdAt: Date;
  updatedAt: Date;
}

// Legacy types for backward compatibility
export type LayoutType = "single" | "quad" | "spread";

export interface Page {
  id: string;
  layout: LayoutType;
  photos: Photo[];
}

export const LAYOUT_CONFIG = {
  single: {
    name: "1 фото на страницу",
    slots: 1,
    description: "Одна фотография на всю страницу",
  },
  quad: {
    name: "4 фото на страницу",
    slots: 4,
    description: "Сетка 2×2",
  },
  spread: {
    name: "1 фото на разворот",
    slots: 1,
    description: "Фото растягивается на 2 страницы",
  },
};
