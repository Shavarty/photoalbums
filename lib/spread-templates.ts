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

// Template 1: Classic - 1 photo left, 3 vertical photos right
export const TEMPLATE_CLASSIC: SpreadTemplate = {
  id: "classic",
  name: "Классический",
  description: "1 фото слева, 3 вертикальных справа",
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1, // square
        width: 1,
        height: 1,
        x: 0,
        y: 0,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 3 / 4, // vertical
        width: 1,
        height: 0.33,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 3 / 4, // vertical
        width: 1,
        height: 0.33,
        x: 0,
        y: 0.33,
      },
      {
        id: "right-3",
        aspectRatio: 3 / 4, // vertical
        width: 1,
        height: 0.34,
        x: 0,
        y: 0.66,
      },
    ],
  },
};

// Template 2: 6 Photos Mix
export const TEMPLATE_6PHOTOS: SpreadTemplate = {
  id: "6photos",
  name: "6 фото микс",
  description: "Разнообразная раскладка 6 фотографий",
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1, // square - large
        width: 0.7,
        height: 0.7,
        x: 0,
        y: 0,
      },
      {
        id: "left-2",
        aspectRatio: 5 / 4, // small horizontal
        width: 0.3,
        height: 0.3,
        x: 0.7,
        y: 0.7,
      },
    ],
  },
  rightPage: {
    slots: [
      {
        id: "right-1",
        aspectRatio: 3 / 4, // vertical
        width: 0.48,
        height: 0.48,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 4 / 3, // horizontal
        width: 1,
        height: 0.32,
        x: 0,
        y: 0.48,
      },
      {
        id: "right-3",
        aspectRatio: 3 / 4, // vertical
        width: 0.48,
        height: 0.2,
        x: 0.52,
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
  leftPage: {
    slots: [
      {
        id: "left-1",
        aspectRatio: 1,
        width: 1,
        height: 0.5,
        x: 0,
        y: 0,
      },
      {
        id: "left-2",
        aspectRatio: 1,
        width: 1,
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
        aspectRatio: 1,
        width: 1,
        height: 0.5,
        x: 0,
        y: 0,
      },
      {
        id: "right-2",
        aspectRatio: 1,
        width: 1,
        height: 0.5,
        x: 0,
        y: 0.5,
      },
    ],
  },
};

export const SPREAD_TEMPLATES = [
  TEMPLATE_CLASSIC,
  TEMPLATE_6PHOTOS,
  TEMPLATE_GRID,
];
