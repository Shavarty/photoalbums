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
        width: 0.70,
        height: 0.70,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "left-2",
        aspectRatio: 1,
        width: 0.24,
        height: 0.24,
        x: 0.74,
        y: 0.74,
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
        width: 0.72,
        height: 0.72,
        x: 0,
        y: 0,
      },
      {
        id: "left-2",
        aspectRatio: 1,
        width: 0.28,
        height: 0.28,
        x: 0.72,
        y: 0.72,
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
        aspectRatio: 9 / 21,
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
        aspectRatio: 1,
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
        aspectRatio: 4 / 3,
        width: 0.5625,
        height: 0.4375,
        x: 0.4375,
        y: 0.5625,
      },
    ],
  },
};

export const SPREAD_TEMPLATES = [
  TEMPLATE_CLASSIC,
  TEMPLATE_6PHOTOS,
  TEMPLATE_GRID,
  TEMPLATE_ASYMMETRIC,
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
