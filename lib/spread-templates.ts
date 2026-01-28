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
}

// Template 1: Classic - 1 photo left, 3 horizontal photos right
// Defined WITHOUT gaps (edge-to-edge), gaps added by applyGaps() if needed
export const TEMPLATE_CLASSIC: SpreadTemplate = {
  id: "classic",
  name: "Классический",
  description: "1 фото слева, 3 горизонтальных справа",
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1, // square
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
        aspectRatio: 1 / 0.333, // horizontal (3:1)
        width: 1.0,
        height: 0.333,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 1 / 0.333, // horizontal (3:1)
        width: 1.0,
        height: 0.333,
        x: 0,
        y: 0.333,
      },
      {
        id: "right-3",
        aspectRatio: 1 / 0.334, // horizontal (3:1)
        width: 1.0,
        height: 0.334,
        x: 0,
        y: 0.666,
      },
    ],
  },
};

// Template 2: 6 Photos Mix
// Defined WITHOUT gaps (edge-to-edge), gaps added by applyGaps() if needed
export const TEMPLATE_6PHOTOS: SpreadTemplate = {
  id: "6photos",
  name: "6 фото микс",
  description: "Разнообразная раскладка 6 фотографий",
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1, // square - large
        width: 0.70,
        height: 0.70,
        x: 0,
        y: 0,
      },
      {
        id: "left-2",
        aspectRatio: 1, // small square
        width: 0.30,
        height: 0.30,
        x: 0.70,
        y: 0.70,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 1, // square
        width: 0.48,
        height: 0.48,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 1 / 0.32, // horizontal (3.1:1)
        width: 1.0,
        height: 0.32,
        x: 0,
        y: 0.68,
      },
      {
        id: "right-3",
        aspectRatio: 0.52 / 0.20, // horizontal (2.6:1)
        width: 0.52,
        height: 0.20,
        x: 0.48,
        y: 0,
      },
    ],
  },
};

// Template 3: Simple Grid
// Defined WITHOUT gaps (edge-to-edge), gaps added by applyGaps() if needed
export const TEMPLATE_GRID: SpreadTemplate = {
  id: "grid",
  name: "Сетка",
  description: "По 2 фото на каждой странице",
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 2, // horizontal (2:1)
        width: 1.0,
        height: 0.5,
        x: 0,
        y: 0,
      },
      {
        id: "left-2",
        aspectRatio: 2, // horizontal (2:1)
        width: 1.0,
        height: 0.5,
        x: 0,
        y: 0.5,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 2, // horizontal (2:1)
        width: 1.0,
        height: 0.5,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 2, // horizontal (2:1)
        width: 1.0,
        height: 0.5,
        x: 0,
        y: 0.5,
      },
    ],
  },
};

// Template 4: Asymmetric - vertical strip + mixed layout
// Defined WITHOUT gaps (edge-to-edge), gaps added by applyGaps() if needed
export const TEMPLATE_ASYMMETRIC: SpreadTemplate = {
  id: "asymmetric",
  name: "Асимметричный",
  description: "Вертикальная полоса слева, микс справа",
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 9 / 21, // narrow vertical strip
        width: 0.428,
        height: 1.0,
        x: 0,
        y: 0,
      },
      {
        id: "left-2",
        aspectRatio: 5 / 4, // slightly horizontal
        width: 0.572,
        height: 0.458,
        x: 0.428,
        y: 0,
      },
      {
        id: "left-3",
        aspectRatio: 1, // square
        width: 0.542,
        height: 0.542,
        x: 0.428,
        y: 0.458,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 16 / 9, // wide horizontal
        width: 1.0,
        height: 0.5625,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 1, // square
        width: 0.4375,
        height: 0.4375,
        x: 0,
        y: 0.5625,
      },
      {
        id: "right-3",
        aspectRatio: 4 / 3, // horizontal
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

// Utility to add gaps to slot coordinates
// All templates are now designed WITHOUT gaps (slots edge-to-edge)
// This function ADDS 2% gaps everywhere when withGaps=true
export function applyGaps(slot: PhotoSlot, withGaps: boolean): PhotoSlot {
  if (!withGaps) {
    // Return as-is (no gaps)
    return slot;
  }

  // Add gaps: shrink slots to 96% working area and add 2% edges
  const GAP = 0.02;
  const WORKING_AREA = 0.96; // 1.0 - 2*GAP

  return {
    ...slot,
    x: slot.x * WORKING_AREA + GAP,
    y: slot.y * WORKING_AREA + GAP,
    width: slot.width * WORKING_AREA,
    height: slot.height * WORKING_AREA,
  };
}
