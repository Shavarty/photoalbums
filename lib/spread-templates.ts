// Spread templates for photo albums
// Each spread = 2 pages (left + right) with different layouts

export interface PhotoSlot {
  id: string;
  aspectRatio: number; // width/height (e.g., 1 for square, 4/3 for landscape, 3/4 for portrait)
  width: number; // relative width (0-1)
  height: number; // relative height (0-1)
  x: number; // position x (0-1)
  y: number; // position y (0-1)
}

export interface PageLayout {
  slots: PhotoSlot[];
}

export interface SpreadTemplate {
  id: string;
  name: string;
  description: string;
  leftPage: PageLayout;
  rightPage: PageLayout;
  leftPageNoGaps?: PageLayout; // Optional: layout without gaps
  rightPageNoGaps?: PageLayout; // Optional: layout without gaps
}

// Template 1: Classic - 1 photo left, 3 horizontal photos right
export const TEMPLATE_CLASSIC: SpreadTemplate = {
  id: "classic",
  name: "Классический",
  description: "1 фото слева, 3 горизонтальных справа",
  // WITH gaps (2% everywhere)
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1,
        width: 0.96,
        height: 0.96,
        x: 0.02,
        y: 0.02,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 1 / 0.31,
        width: 0.96,
        height: 0.30,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "right-2",
        aspectRatio: 1 / 0.31,
        width: 0.96,
        height: 0.31,
        x: 0.02,
        y: 0.34,
      },
      {
        id: "right-3",
        aspectRatio: 1 / 0.31,
        width: 0.96,
        height: 0.31,
        x: 0.02,
        y: 0.67,
      },
    ],
  },
  // WITHOUT gaps (edge-to-edge)
  leftPageNoGaps: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1,
        width: 1.0,
        height: 1.0,
        x: 0,
        y: 0,
      },
    ],
  },
  rightPageNoGaps: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 1 / 0.333,
        width: 1.0,
        height: 0.333,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 1 / 0.333,
        width: 1.0,
        height: 0.333,
        x: 0,
        y: 0.333,
      },
      {
        id: "right-3",
        aspectRatio: 1 / 0.334,
        width: 1.0,
        height: 0.334,
        x: 0,
        y: 0.666,
      },
    ],
  },
};

// Template 2: 6 Photos Mix - more compact, visually balanced
export const TEMPLATE_6PHOTOS: SpreadTemplate = {
  id: "6photos",
  name: "6 фото микс",
  description: "Разнообразная раскладка 6 фотографий",
  // WITH gaps (2% everywhere)
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1,
        width: 0.96,
        height: 0.96,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "left-2",
        aspectRatio: 4 / 3,
        width: 0.47,
        height: 0.34,
        x: 0.51,
        y: 0.64,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 1,
        width: 0.47,
        height: 0.47,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "right-2",
        aspectRatio: 1 / 0.47,
        width: 0.96,
        height: 0.47,
        x: 0.02,
        y: 0.51,
      },
      {
        id: "right-3",
        aspectRatio: 1,
        width: 0.47,
        height: 0.47,
        x: 0.51,
        y: 0.02,
      },
    ],
  },
  // WITHOUT gaps (edge-to-edge, perfect visual alignment)
  leftPageNoGaps: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1,
        width: 1.0,
        height: 1.0,
        x: 0,
        y: 0,
      },
      {
        id: "left-2",
        aspectRatio: 4 / 3,
        width: 0.50,
        height: 0.36,
        x: 0.50,
        y: 0.64,
      },
    ],
  },
  rightPageNoGaps: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 1,
        width: 0.50,
        height: 0.50,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 2,
        width: 1.0,
        height: 0.50,
        x: 0,
        y: 0.50,
      },
      {
        id: "right-3",
        aspectRatio: 1,
        width: 0.50,
        height: 0.50,
        x: 0.50,
        y: 0,
      },
    ],
  },
};

// Template 3: Simple Grid
export const TEMPLATE_GRID: SpreadTemplate = {
  id: "grid",
  name: "Сетка",
  description: "По 2 фото на каждой странице",
  // WITH gaps (2% everywhere)
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1 / 0.47,
        width: 0.96,
        height: 0.47,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "left-2",
        aspectRatio: 1 / 0.47,
        width: 0.96,
        height: 0.47,
        x: 0.02,
        y: 0.51,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 1 / 0.47,
        width: 0.96,
        height: 0.47,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "right-2",
        aspectRatio: 1 / 0.47,
        width: 0.96,
        height: 0.47,
        x: 0.02,
        y: 0.51,
      },
    ],
  },
  // WITHOUT gaps (edge-to-edge)
  leftPageNoGaps: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 2,
        width: 1.0,
        height: 0.5,
        x: 0,
        y: 0,
      },
      {
        id: "left-2",
        aspectRatio: 2,
        width: 1.0,
        height: 0.5,
        x: 0,
        y: 0.5,
      },
    ],
  },
  rightPageNoGaps: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 2,
        width: 1.0,
        height: 0.5,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 2,
        width: 1.0,
        height: 0.5,
        x: 0,
        y: 0.5,
      },
    ],
  },
};

// Template 4: Asymmetric - vertical strip + mixed layout
export const TEMPLATE_ASYMMETRIC: SpreadTemplate = {
  id: "asymmetric",
  name: "Асимметричный",
  description: "Вертикальная полоса слева, микс справа",
  // WITH gaps (2% everywhere)
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 9 / 21,
        width: 0.411,
        height: 0.96,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "left-2",
        aspectRatio: 5 / 4,
        width: 0.529,
        height: 0.418,
        x: 0.451,
        y: 0.02,
      },
      {
        id: "left-3",
        aspectRatio: 1,
        width: 0.529,
        height: 0.522,
        x: 0.451,
        y: 0.458,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 16 / 9,
        width: 0.96,
        height: 0.54,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "right-2",
        aspectRatio: 1,
        width: 0.4,
        height: 0.4,
        x: 0.02,
        y: 0.58,
      },
      {
        id: "right-3",
        aspectRatio: 4 / 3,
        width: 0.54,
        height: 0.4,
        x: 0.44,
        y: 0.58,
      },
    ],
  },
  // WITHOUT gaps (edge-to-edge, PERFECT alignment - no gaps anywhere)
  leftPageNoGaps: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 0.43,
        width: 0.43,
        height: 1.0,
        x: 0,
        y: 0,
      },
      {
        id: "left-2",
        aspectRatio: 5 / 4,
        width: 0.57,
        height: 0.456,
        x: 0.43,
        y: 0,
      },
      {
        id: "left-3",
        aspectRatio: 0.57 / 0.544,
        width: 0.57,
        height: 0.544,
        x: 0.43,
        y: 0.456,
      },
    ],
  },
  rightPageNoGaps: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 16 / 9,
        width: 1.0,
        height: 0.5625,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 1,
        width: 0.4375,
        height: 0.4375,
        x: 0,
        y: 0.5625,
      },
      {
        id: "right-3",
        aspectRatio: 9 / 7,
        width: 0.5625,
        height: 0.4375,
        x: 0.4375,
        y: 0.5625,
      },
    ],
  },
};

// Template 5: Panorama - for wide photos (16:9)
export const TEMPLATE_PANORAMA: SpreadTemplate = {
  id: "panorama",
  name: "Панорама",
  description: "Для широкоформатных снимков",
  // WITH gaps (2% everywhere)
  // Aspect ratios MATCH noGaps version to prevent stretching when switching modes
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1.815,  // 0.96 / 0.529 (slightly wider than 16:9)
        width: 0.96,
        height: 0.529,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "left-2",
        aspectRatio: 1.143,  // MATCHES noGaps (0.47 / 0.411)
        width: 0.47,
        height: 0.411,
        x: 0.02,
        y: 0.569,
      },
      {
        id: "left-3",
        aspectRatio: 1.143,  // MATCHES noGaps (0.47 / 0.411)
        width: 0.47,
        height: 0.411,
        x: 0.51,
        y: 0.569,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 1.846,  // 0.96 / 0.52
        width: 0.96,
        height: 0.52,
        x: 0.02,
        y: 0.46,
      },
      {
        id: "right-2",
        aspectRatio: 2.286,  // MATCHES noGaps (0.96 / 0.42)
        width: 0.96,
        height: 0.42,
        x: 0.02,
        y: 0.02,
      },
    ],
  },
  leftPageNoGaps: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 16 / 9,
        width: 1.0,
        height: 0.5625,
        x: 0,
        y: 0,
      },
      {
        id: "left-2",
        aspectRatio: 1.143,  // 0.5/0.4375 = 1.143
        width: 0.5,
        height: 0.4375,
        x: 0,
        y: 0.5625,
      },
      {
        id: "left-3",
        aspectRatio: 1.143,  // 0.5/0.4375 = 1.143
        width: 0.5,
        height: 0.4375,
        x: 0.5,
        y: 0.5625,
      },
    ],
  },
  rightPageNoGaps: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 16 / 9,
        width: 1.0,
        height: 0.5625,
        x: 0,
        y: 0.4375,
      },
      {
        id: "right-2",
        aspectRatio: 16 / 9,  // Match slot dimensions: 1.0/0.4375 = 2.286, use closest standard
        width: 1.0,
        height: 0.4375,
        x: 0,
        y: 0,
      },
    ],
  },
};

// Template 6: Focus - one large photo + small details
export const TEMPLATE_FOCUS: SpreadTemplate = {
  id: "focus",
  name: "Акцент",
  description: "Одно крупное фото + детали",
  // WITH gaps (2% everywhere)
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 4 / 3,
        width: 0.96,
        height: 0.72,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "left-2",
        aspectRatio: 16 / 9,
        width: 0.96,
        height: 0.22,
        x: 0.02,
        y: 0.76,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 1,
        width: 0.30,
        height: 0.30,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "right-2",
        aspectRatio: 1,
        width: 0.30,
        height: 0.30,
        x: 0.34,
        y: 0.02,
      },
      {
        id: "right-3",
        aspectRatio: 1,
        width: 0.30,
        height: 0.30,
        x: 0.66,
        y: 0.02,
      },
      {
        id: "right-4",
        aspectRatio: 3 / 2,
        width: 0.96,
        height: 0.62,
        x: 0.02,
        y: 0.34,
      },
    ],
  },
  leftPageNoGaps: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 4 / 3,
        width: 1.0,
        height: 0.75,
        x: 0,
        y: 0,
      },
      {
        id: "left-2",
        aspectRatio: 16 / 9,
        width: 1.0,
        height: 0.25,
        x: 0,
        y: 0.75,
      },
    ],
  },
  rightPageNoGaps: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 1,
        width: 0.333,
        height: 0.333,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 1,
        width: 0.333,
        height: 0.333,
        x: 0.333,
        y: 0,
      },
      {
        id: "right-3",
        aspectRatio: 1,
        width: 0.334,
        height: 0.333,
        x: 0.666,
        y: 0,
      },
      {
        id: "right-4",
        aspectRatio: 3 / 2,
        width: 1.0,
        height: 0.667,
        x: 0,
        y: 0.333,
      },
    ],
  },
};

// Template 7: Magazine - magazine-style mixed formats
export const TEMPLATE_MAGAZINE: SpreadTemplate = {
  id: "magazine",
  name: "Журнальный",
  description: "Журнальная вёрстка, микс форматов",
  // WITH gaps (2% everywhere)
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 3 / 2,
        width: 0.63,
        height: 0.42,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "left-2",
        aspectRatio: 3 / 4,
        width: 0.31,
        height: 0.42,
        x: 0.67,
        y: 0.02,
      },
      {
        id: "left-3",
        aspectRatio: 1,
        width: 0.47,
        height: 0.52,
        x: 0.02,
        y: 0.46,
      },
      {
        id: "left-4",
        aspectRatio: 4 / 5,
        width: 0.47,
        height: 0.52,
        x: 0.51,
        y: 0.46,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 16 / 9,
        width: 0.96,
        height: 0.54,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "right-2",
        aspectRatio: 3 / 2,
        width: 0.47,
        height: 0.40,
        x: 0.02,
        y: 0.58,
      },
      {
        id: "right-3",
        aspectRatio: 1,
        width: 0.47,
        height: 0.40,
        x: 0.51,
        y: 0.58,
      },
    ],
  },
  leftPageNoGaps: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 3 / 2,
        width: 0.667,
        height: 0.444,
        x: 0,
        y: 0,
      },
      {
        id: "left-2",
        aspectRatio: 3 / 4,
        width: 0.333,
        height: 0.444,
        x: 0.667,
        y: 0,
      },
      {
        id: "left-3",
        aspectRatio: 1,
        width: 0.50,
        height: 0.556,
        x: 0,
        y: 0.444,
      },
      {
        id: "left-4",
        aspectRatio: 4 / 5,
        width: 0.50,
        height: 0.556,
        x: 0.50,
        y: 0.444,
      },
    ],
  },
  rightPageNoGaps: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 16 / 9,
        width: 1.0,
        height: 0.5625,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 3 / 2,
        width: 0.50,
        height: 0.4375,
        x: 0,
        y: 0.5625,
      },
      {
        id: "right-3",
        aspectRatio: 1,
        width: 0.50,
        height: 0.4375,
        x: 0.50,
        y: 0.5625,
      },
    ],
  },
};

// Template 8: Portrait - for portrait photos (3:4, 2:3)
export const TEMPLATE_PORTRAIT: SpreadTemplate = {
  id: "portrait",
  name: "Портретный",
  description: "Для вертикальных фотографий",
  // WITH gaps (2% everywhere)
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 3 / 4,
        width: 0.72,
        height: 0.96,
        x: 0.14,
        y: 0.02,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 3 / 4,
        width: 0.72,
        height: 0.96,
        x: 0.14,
        y: 0.02,
      },
    ],
  },
  leftPageNoGaps: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 3 / 4,
        width: 0.75,
        height: 1.0,
        x: 0.125,
        y: 0,
      },
    ],
  },
  rightPageNoGaps: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 3 / 4,
        width: 0.75,
        height: 1.0,
        x: 0.125,
        y: 0,
      },
    ],
  },
};

// Template 9: Squares - Instagram squares (1:1)
export const TEMPLATE_SQUARES: SpreadTemplate = {
  id: "squares",
  name: "Квадраты",
  description: "4 квадратных фото на каждой странице",
  // WITH gaps (2% everywhere)
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1,
        width: 0.47,
        height: 0.47,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "left-2",
        aspectRatio: 1,
        width: 0.47,
        height: 0.47,
        x: 0.51,
        y: 0.02,
      },
      {
        id: "left-3",
        aspectRatio: 1,
        width: 0.47,
        height: 0.47,
        x: 0.02,
        y: 0.51,
      },
      {
        id: "left-4",
        aspectRatio: 1,
        width: 0.47,
        height: 0.47,
        x: 0.51,
        y: 0.51,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 1,
        width: 0.47,
        height: 0.47,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "right-2",
        aspectRatio: 1,
        width: 0.47,
        height: 0.47,
        x: 0.51,
        y: 0.02,
      },
      {
        id: "right-3",
        aspectRatio: 1,
        width: 0.47,
        height: 0.47,
        x: 0.02,
        y: 0.51,
      },
      {
        id: "right-4",
        aspectRatio: 1,
        width: 0.47,
        height: 0.47,
        x: 0.51,
        y: 0.51,
      },
    ],
  },
  leftPageNoGaps: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1,
        width: 0.5,
        height: 0.5,
        x: 0,
        y: 0,
      },
      {
        id: "left-2",
        aspectRatio: 1,
        width: 0.5,
        height: 0.5,
        x: 0.5,
        y: 0,
      },
      {
        id: "left-3",
        aspectRatio: 1,
        width: 0.5,
        height: 0.5,
        x: 0,
        y: 0.5,
      },
      {
        id: "left-4",
        aspectRatio: 1,
        width: 0.5,
        height: 0.5,
        x: 0.5,
        y: 0.5,
      },
    ],
  },
  rightPageNoGaps: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 1,
        width: 0.5,
        height: 0.5,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 1,
        width: 0.5,
        height: 0.5,
        x: 0.5,
        y: 0,
      },
      {
        id: "right-3",
        aspectRatio: 1,
        width: 0.5,
        height: 0.5,
        x: 0,
        y: 0.5,
      },
      {
        id: "right-4",
        aspectRatio: 1,
        width: 0.5,
        height: 0.5,
        x: 0.5,
        y: 0.5,
      },
    ],
  },
};

// Template 10: Full Spread - one photo split across both pages (simple, no mini-scenes)
export const TEMPLATE_FULL_SPREAD: SpreadTemplate = {
  id: "full-spread",
  name: "Панорамный разворот",
  description: "Одно фото на весь разворот (2:1)",
  // Each page has ONE full-page slot (1:1)
  // Photo with 2:1 crop will be split: left half → left page, right half → right page
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1, // Square page
        width: 1.0,
        height: 1.0,
        x: 0,
        y: 0,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 1, // Square page
        width: 1.0,
        height: 1.0,
        x: 0,
        y: 0,
      },
    ],
  },
  // No-gaps version is the same (already full page)
  leftPageNoGaps: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1,
        width: 1.0,
        height: 1.0,
        x: 0,
        y: 0,
      },
    ],
  },
  rightPageNoGaps: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 1,
        width: 1.0,
        height: 1.0,
        x: 0,
        y: 0,
      },
    ],
  },
};

// Template 11: Comic Spread Background - panoramic background + mini-scenes on top
export const TEMPLATE_COMIC_SPREAD_BG: SpreadTemplate = {
  id: "comic-spread-bg",
  name: "Комикс на фоне разворота",
  description: "Фоновое фото на весь разворот + мини-сцены поверх",
  // Background: full-page slots (will be filled with split 2:1 photo)
  // Mini-scenes: smaller slots on top
  leftPage: {
    slots: [
      {
        id: "left-bg",
        aspectRatio: 1,
        width: 1.0,
        height: 1.0,
        x: 0,
        y: 0,
      },
      {
        id: "left-mini-1",
        aspectRatio: 1,
        width: 0.45,
        height: 0.45,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "left-mini-2",
        aspectRatio: 4 / 3,
        width: 0.45,
        height: 0.34,
        x: 0.02,
        y: 0.64,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-bg",
        aspectRatio: 1,
        width: 1.0,
        height: 1.0,
        x: 0,
        y: 0,
      },
      {
        id: "right-mini-1",
        aspectRatio: 1,
        width: 0.45,
        height: 0.45,
        x: 0.53,
        y: 0.02,
      },
      {
        id: "right-mini-2",
        aspectRatio: 4 / 3,
        width: 0.45,
        height: 0.34,
        x: 0.53,
        y: 0.53,
      },
    ],
  },
  leftPageNoGaps: {
    slots: [
      {
        id: "left-bg",
        aspectRatio: 1,
        width: 1.0,
        height: 1.0,
        x: 0,
        y: 0,
      },
      {
        id: "left-mini-1",
        aspectRatio: 1,
        width: 0.48,
        height: 0.48,
        x: 0,
        y: 0,
      },
      {
        id: "left-mini-2",
        aspectRatio: 4 / 3,
        width: 0.48,
        height: 0.36,
        x: 0,
        y: 0.64,
      },
    ],
  },
  rightPageNoGaps: {
    slots: [
      {
        id: "right-bg",
        aspectRatio: 1,
        width: 1.0,
        height: 1.0,
        x: 0,
        y: 0,
      },
      {
        id: "right-mini-1",
        aspectRatio: 1,
        width: 0.48,
        height: 0.48,
        x: 0.52,
        y: 0,
      },
      {
        id: "right-mini-2",
        aspectRatio: 4 / 3,
        width: 0.48,
        height: 0.36,
        x: 0.52,
        y: 0.52,
      },
    ],
  },
};

// Template 12: Comic Strips - panoramic BG + 1:1 + 4:5 left; 21:9 + 21:9 + 2×16:9 right
// Left: слоты в левой части страницы, фон виден справа
// Right: верхняя 21:9 маленькая и правее, средняя 21:9 шире, пара 16:9 выровнена по ширине средней
// Все правая — правовыровнены (правый край = 0.918)
export const TEMPLATE_COMIC_STRIPS: SpreadTemplate = {
  id: "comic-strips",
  name: "Комикс: полосы",
  description: "Фоновая панорама + полосы",
  leftPage: {
    slots: [
      { id: "left-bg",     aspectRatio: 1,     width: 1.0,  height: 1.0,  x: 0,    y: 0    },
      { id: "left-mini-1", aspectRatio: 1,     width: 0.36, height: 0.36, x: 0.07, y: 0.07 }, // 1:1 квадрат
      { id: "left-mini-2", aspectRatio: 4 / 5, width: 0.36, height: 0.45, x: 0.07, y: 0.47 }, // 4:5 портрет
    ],
  },
  rightPage: {
    slots: [
      // Все слоты правовыровнены: правый край = 0.918, зазор между рядами = 0.030
      { id: "right-bg",     aspectRatio: 1,      width: 1.0,  height: 1.0,   x: 0,     y: 0     },
      { id: "right-mini-1", aspectRatio: 21 / 9, width: 0.50, height: 0.214, x: 0.418, y: 0.082 }, // малая 21:9 полоса
      { id: "right-mini-2", aspectRatio: 21 / 9, width: 0.80, height: 0.343, x: 0.118, y: 0.326 }, // большая 21:9 полоса
      { id: "right-mini-3", aspectRatio: 16 / 9, width: 0.39, height: 0.219, x: 0.118, y: 0.699 }, // пара 16:9
      { id: "right-mini-4", aspectRatio: 16 / 9, width: 0.39, height: 0.219, x: 0.528, y: 0.699 },
    ],
  },
  leftPageNoGaps: {
    slots: [
      { id: "left-bg",     aspectRatio: 1,     width: 1.0,  height: 1.0,  x: 0, y: 0    },
      { id: "left-mini-1", aspectRatio: 1,     width: 0.40, height: 0.40, x: 0, y: 0    },
      { id: "left-mini-2", aspectRatio: 4 / 5, width: 0.40, height: 0.50, x: 0, y: 0.42 },
    ],
  },
  rightPageNoGaps: {
    slots: [
      // Правовыровнены: правый край = 1.0
      { id: "right-bg",     aspectRatio: 1,      width: 1.0,  height: 1.0,   x: 0,    y: 0     },
      { id: "right-mini-1", aspectRatio: 21 / 9, width: 0.55, height: 0.236, x: 0.45,  y: 0     },
      { id: "right-mini-2", aspectRatio: 21 / 9, width: 0.85, height: 0.364, x: 0.15,  y: 0.246 },
      { id: "right-mini-3", aspectRatio: 16 / 9, width: 0.415, height: 0.233, x: 0.15,  y: 0.620 },
      { id: "right-mini-4", aspectRatio: 16 / 9, width: 0.415, height: 0.233, x: 0.585, y: 0.620 },
    ],
  },
};

// Template 13: Comic Quartet - panoramic BG + 16:9 + 5:4 зеркально на каждой странице
// Левая страница: оба слота прижаты к левому краю
// Правая страница: оба слота прижаты к правому краю (зеркало)
// 16:9 широкий сверху, 5:4 узже снизу; фон видно у корешка и по краям
export const TEMPLATE_COMIC_QUARTET: SpreadTemplate = {
  id: "comic-quartet",
  name: "Комикс: квартет",
  description: "Фоновая панорама + 4 сцены по углам",
  // Маржа 0.05 внешний, 0.08 top/bot. Слоты по углам, центр разворота — фон.
  // Верхние слоты (16:9) уменьшены на 30%: w=0.82*0.7=0.574, h=0.461*0.7=0.323
  // Нижние слоты (5:4) уменьшены на 15%: w=0.424*0.85=0.36, h=0.339*0.85=0.288
  leftPage: {
    slots: [
      { id: "left-bg",     aspectRatio: 1,      width: 1.0,   height: 1.0,   x: 0,    y: 0     },
      { id: "left-mini-1", aspectRatio: 16 / 9, width: 0.574, height: 0.323, x: 0.05, y: 0.08  }, // 16:9 прижат влево-верх
      { id: "left-mini-2", aspectRatio: 5 / 4,  width: 0.36,  height: 0.288, x: 0.05, y: 0.632 }, // 5:4 прижат влево-низ
    ],
  },
  rightPage: {
    slots: [
      // Зеркало левой: прижат вправо (правый край = 0.95)
      { id: "right-bg",     aspectRatio: 1,      width: 1.0,   height: 1.0,   x: 0,     y: 0     },
      { id: "right-mini-1", aspectRatio: 16 / 9, width: 0.574, height: 0.323, x: 0.376, y: 0.08  }, // 16:9 прижат вправо-верх
      { id: "right-mini-2", aspectRatio: 5 / 4,  width: 0.36,  height: 0.288, x: 0.59,  y: 0.632 }, // 5:4 прижат вправо-низ
    ],
  },
  leftPageNoGaps: {
    slots: [
      { id: "left-bg",     aspectRatio: 1,      width: 1.0,   height: 1.0,   x: 0, y: 0     },
      { id: "left-mini-1", aspectRatio: 16 / 9, width: 0.595, height: 0.335, x: 0, y: 0     },
      { id: "left-mini-2", aspectRatio: 5 / 4,  width: 0.374, height: 0.299, x: 0, y: 0.543 },
    ],
  },
  rightPageNoGaps: {
    slots: [
      { id: "right-bg",     aspectRatio: 1,      width: 1.0,   height: 1.0,   x: 0,    y: 0     },
      { id: "right-mini-1", aspectRatio: 16 / 9, width: 0.595, height: 0.335, x: 0.405, y: 0     },
      { id: "right-mini-2", aspectRatio: 5 / 4,  width: 0.374, height: 0.299, x: 0.626, y: 0.543 },
    ],
  },
};

// Template 14: Comic Asymmetric - panoramic BG + 3×5:4 столбик + 9:16 (от 2-го слота) left; 4:3 + 4:5 right
// Left: 9:16 начинается с уровня 2-го слота 5:4 и заканчивается на уровне 3-го
// Right: оба слота правовыровнены, фон виден слева
export const TEMPLATE_COMIC_ASYMMETRIC: SpreadTemplate = {
  id: "comic-asymmetric",
  name: "Комикс: асимметрия",
  description: "Фоновая панорама + асимметричная раскладка",
  leftPage: {
    slots: [
      { id: "left-bg",     aspectRatio: 1,      width: 1.0,   height: 1.0,   x: 0,    y: 0     },
      { id: "left-mini-1", aspectRatio: 5 / 4,  width: 0.33,  height: 0.264, x: 0.07, y: 0.07  }, // 5:4 #1
      { id: "left-mini-2", aspectRatio: 5 / 4,  width: 0.33,  height: 0.264, x: 0.07, y: 0.364 }, // 5:4 #2
      { id: "left-mini-3", aspectRatio: 5 / 4,  width: 0.33,  height: 0.264, x: 0.07, y: 0.658 }, // 5:4 #3
      // 9:16 портрет — пока отключён
    ],
  },
  rightPage: {
    slots: [
      // Правовыровнены: правый край = 0.92
      { id: "right-bg",     aspectRatio: 1,     width: 1.0,  height: 1.0,   x: 0,    y: 0     },
      { id: "right-mini-1", aspectRatio: 4 / 3, width: 0.45, height: 0.338, x: 0.47, y: 0.092 }, // 4:3 сверху
      { id: "right-mini-2", aspectRatio: 4 / 5, width: 0.35, height: 0.438, x: 0.57, y: 0.470 }, // 4:5 снизу
    ],
  },
  leftPageNoGaps: {
    slots: [
      { id: "left-bg",     aspectRatio: 1,      width: 1.0,   height: 1.0,   x: 0, y: 0    },
      { id: "left-mini-1", aspectRatio: 5 / 4,  width: 0.35,  height: 0.280, x: 0, y: 0    },
      { id: "left-mini-2", aspectRatio: 5 / 4,  width: 0.35,  height: 0.280, x: 0, y: 0.30 },
      { id: "left-mini-3", aspectRatio: 5 / 4,  width: 0.35,  height: 0.280, x: 0, y: 0.60 },
      // 9:16 портрет — пока отключён
    ],
  },
  rightPageNoGaps: {
    slots: [
      // Правовыровнены: правый край = 0.95
      { id: "right-bg",     aspectRatio: 1,     width: 1.0,  height: 1.0,   x: 0,    y: 0    },
      { id: "right-mini-1", aspectRatio: 4 / 3, width: 0.45, height: 0.338, x: 0.50, y: 0    },
      { id: "right-mini-2", aspectRatio: 4 / 5, width: 0.35, height: 0.438, x: 0.60, y: 0.36 },
    ],
  },
};

// IDs шаблонов с panoramic 2:1 фоном, развёрнутым на две страницы
export const PANORAMIC_BG_TEMPLATE_IDS = [
  'comic-strips',
  'comic-quartet',
  'comic-asymmetric',
];

// Only comics templates (albums removed)
export const SPREAD_TEMPLATES = [
  TEMPLATE_COMIC_STRIPS,     // Panoramic BG + strips layout
  TEMPLATE_COMIC_QUARTET,    // Panoramic BG + 4 symmetric scenes
  TEMPLATE_COMIC_ASYMMETRIC, // Panoramic BG + asymmetric layout
];

// Get appropriate page layout based on gaps setting
export function getPageSlots(template: SpreadTemplate, side: 'left' | 'right', withGaps: boolean): PhotoSlot[] {
  if (withGaps) {
    return side === 'left' ? template.leftPage.slots : template.rightPage.slots;
  } else {
    const noGapsPage = side === 'left' ? template.leftPageNoGaps : template.rightPageNoGaps;
    if (noGapsPage) {
      return noGapsPage.slots;
    }
    // Fallback to default if no-gaps version not defined
    return side === 'left' ? template.leftPage.slots : template.rightPage.slots;
  }
}
