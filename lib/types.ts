// Types for photo album editor with spreads

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  modelId?: string; // Which Gemini model was used
  costUsd?: number; // Fixed price for fal.ai models (no token-based billing)
}

export type BubbleType = 'speech' | 'thought' | 'annotation' | 'text-block' | 'cover-title';

export interface SpeechBubble {
  id: string;
  x: number; // Position X in percentage (0-100)
  y: number; // Position Y in percentage (0-100)
  text: string;
  type?: BubbleType; // Default: 'speech'
  tailDirection?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  width?: number; // Custom width in pixels (for text-block type)
  height?: number; // Custom height in pixels (for text-block type)
  fontSize?: number; // Font size in pixels (default: 14 for bubbles, 64 for cover-title)
  scale?: number; // Uniform scale factor (default: 1.0)
  rotation?: number; // Rotation angle in degrees (default: 0)
  titleStyle?: 'ice-age' | 'fk-alako'; // For cover-title type
}

export interface Photo {
  id: string;
  file: File | null;
  url: string; // Preview URL (low-res for editor display)
  originalUrl?: string; // Original high-res URL for PDF generation
  cropArea?: CropArea; // Crop coordinates in pixels on original image
  tokens?: TokenUsage; // AI stylization token usage
  isStylizing?: boolean; // Currently being stylized
  hidden?: boolean; // Slot hidden by user (not rendered in editor or PDF)
}

export interface Spread {
  id: string;
  templateId: string; // reference to spread template
  leftPhotos: Photo[]; // photos for left page
  rightPhotos: Photo[]; // photos for right page
  bubbles?: SpeechBubble[]; // Spread-level bubbles (float freely over all slots)
}

// Cover is now a Spread with templateId = 'cover'
// Kept as a type alias for backward compatibility
export type Cover = Spread | null;

export interface StylizeSettings {
  activePreset: string;
  style: string;
  customPrompt: string;
  processInstructions: string;
}

export interface Album {
  id: string;
  title: string;
  cover: Cover;
  spreads: Spread[]; // changed from pages to spreads
  withGaps: boolean; // whether to use gaps between photos (applies to entire album)
  stylizeSettings?: StylizeSettings;
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
