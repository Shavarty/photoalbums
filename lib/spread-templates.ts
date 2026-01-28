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
// Standard gaps: 2% edges, 2% center, 2% between photos
export const TEMPLATE_CLASSIC: SpreadTemplate = {
  id: "classic",
  name: "Классический",
  description: "1 фото слева, 3 горизонтальных справа",
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1, // square
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
        aspectRatio: 1 / 0.31, // horizontal (≈3.2:1)
        width: 0.96,
        height: 0.30,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "right-2",
        aspectRatio: 1 / 0.31, // horizontal (≈3.2:1)
        width: 0.96,
        height: 0.31,
        x: 0.02,
        y: 0.34,
      },
      {
        id: "right-3",
        aspectRatio: 1 / 0.31, // horizontal (≈3.2:1)
        width: 0.96,
        height: 0.31,
        x: 0.02,
        y: 0.67,
      },
    ],
  },
};

// Template 2: 6 Photos Mix
// Standard gaps: 2% edges, 2% center, 2% between photos
export const TEMPLATE_6PHOTOS: SpreadTemplate = {
  id: "6photos",
  name: "6 фото микс",
  description: "Разнообразная раскладка 6 фотографий",
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1, // square - large
        width: 0.66,
        height: 0.66,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "left-2",
        aspectRatio: 1, // small square
        width: 0.28,
        height: 0.28,
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
        width: 0.46,
        height: 0.46,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "right-2",
        aspectRatio: 1 / 0.30, // horizontal (≈3.2:1)
        width: 0.96,
        height: 0.30,
        x: 0.02,
        y: 0.68,
      },
      {
        id: "right-3",
        aspectRatio: 0.46 / 0.18, // horizontal (2.6:1)
        width: 0.46,
        height: 0.18,
        x: 0.52,
        y: 0.02,
      },
    ],
  },
};

// Template 3: Simple Grid
// Standard gaps: 2% edges, 2% center, 2% between photos
export const TEMPLATE_GRID: SpreadTemplate = {
  id: "grid",
  name: "Сетка",
  description: "По 2 фото на каждой странице",
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1 / 0.47, // horizontal (2.1:1)
        width: 0.96,
        height: 0.47,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "left-2",
        aspectRatio: 1 / 0.47, // horizontal (2.1:1)
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
        aspectRatio: 1 / 0.47, // horizontal (2.1:1)
        width: 0.96,
        height: 0.47,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "right-2",
        aspectRatio: 1 / 0.47, // horizontal (2.1:1)
        width: 0.96,
        height: 0.47,
        x: 0.02,
        y: 0.51,
      },
    ],
  },
};

// Template 4: Asymmetric - vertical strip + mixed layout
// Standard gaps: 2% edges, 2% center, 2% between photos
// Perfect visual alignment on all sides
export const TEMPLATE_ASYMMETRIC: SpreadTemplate = {
  id: "asymmetric",
  name: "Асимметричный",
  description: "Вертикальная полоса слева, микс справа",
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 9 / 21, // narrow vertical strip
        width: 0.411,
        height: 0.96,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "left-2",
        aspectRatio: 5 / 4, // slightly horizontal
        width: 0.529,
        height: 0.418,
        x: 0.451,
        y: 0.02,
      },
      {
        id: "left-3",
        aspectRatio: 1, // square
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
        aspectRatio: 16 / 9, // wide horizontal
        width: 0.96,
        height: 0.54,
        x: 0.02,
        y: 0.02,
      },
      {
        id: "right-2",
        aspectRatio: 1, // square
        width: 0.4,
        height: 0.4,
        x: 0.02,
        y: 0.58,
      },
      {
        id: "right-3",
        aspectRatio: 4 / 3, // horizontal
        width: 0.54,
        height: 0.4,
        x: 0.44,
        y: 0.58,
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

// Utility to apply/remove edge gaps from slot coordinates
// All templates are designed WITH 2% gaps everywhere
// This function removes ONLY edge gaps (page borders), keeping gaps BETWEEN photos
export function applyGaps(slot: PhotoSlot, withGaps: boolean): PhotoSlot {
  if (withGaps) {
    // Return as-is (templates already have gaps)
    return slot;
  }

  // Remove ONLY edge gaps (2% from page borders)
  // Keep gaps between photos intact
  const GAP = 0.02;
  const TOLERANCE = 0.001;

  let newX = slot.x;
  let newY = slot.y;
  let newWidth = slot.width;
  let newHeight = slot.height;

  // Check if slot touches left edge
  if (Math.abs(slot.x - GAP) < TOLERANCE) {
    newX = 0;
    newWidth = slot.width + GAP;
  }

  // Check if slot touches right edge
  if (Math.abs(slot.x + slot.width - (1 - GAP)) < TOLERANCE) {
    newWidth = 1 - newX;
  }

  // Check if slot touches top edge
  if (Math.abs(slot.y - GAP) < TOLERANCE) {
    newY = 0;
    newHeight = slot.height + GAP;
  }

  // Check if slot touches bottom edge
  if (Math.abs(slot.y + slot.height - (1 - GAP)) < TOLERANCE) {
    newHeight = 1 - newY;
  }

  return {
    ...slot,
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  };
}
