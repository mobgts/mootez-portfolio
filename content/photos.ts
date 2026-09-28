import type { Album, Photo } from "./types";

// Drop files into public/photos/<album>/, then register them here.
// First 3 per album = hero stack + overlay covers.
// Photos after that = hero singles preview (never repeats stack covers).
// Unassigned shots live in public/photos/inbox/ until you wire them.

const doublesPhotos: Photo[] = [
  {
    slug: "doubles-01",
    filename: "DOUBLES_01",
    src: "/photos/doubles/stack-01.jpg",
    alt: "Series: doubles — embrace on a fallen trunk",
    year: "'26",
    location: "Forest",
    span: "tall",
  },
  {
    slug: "doubles-02",
    filename: "DOUBLES_02",
    src: "/photos/doubles/stack-02.jpg",
    alt: "Series: doubles — seated on a fallen trunk",
    year: "'26",
    location: "Forest",
    span: "tall",
  },
  {
    slug: "doubles-03",
    filename: "DOUBLES_03",
    src: "/photos/doubles/stack-03.jpg",
    alt: "Series: doubles — close embrace on a fallen trunk",
    year: "'26",
    location: "Forest",
    span: "tall",
  },
];

const funeralPhotos: Photo[] = [
  {
    slug: "funeral-01",
    filename: "FUNERAL_01",
    src: "/photos/funeral/stack-01.jpg",
    alt: "Series: funeral — scream emerging from dark water with flowers",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "funeral-02",
    filename: "FUNERAL_02",
    src: "/photos/funeral/stack-02.jpg",
    alt: "Series: funeral — standing waist-deep holding a bouquet",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "funeral-03",
    filename: "FUNERAL_03",
    src: "/photos/funeral/stack-03.jpg",
    alt: "Series: funeral — submerged face-up with flowers on the chest",
    year: "'26",
    location: "Water",
    span: "wide",
  },
  {
    slug: "funeral-04",
    filename: "FUNERAL_04",
    src: "/photos/funeral/04.jpg",
    alt: "Series: funeral — arm rising from dark water with pink flowers",
    year: "'26",
    location: "Water",
    span: "wide",
  },
  {
    slug: "funeral-05",
    filename: "FUNERAL_05",
    src: "/photos/funeral/05.jpg",
    alt: "Series: funeral — torso floating in dark water at golden hour",
    year: "'26",
    location: "Water",
    span: "wide",
  },
];

export const albums: Album[] = [
  {
    id: "doubles",
    label: "series: doubles",
    photos: doublesPhotos,
  },
  {
    id: "funeral",
    label: "series: funeral",
    photos: funeralPhotos,
  },
];

/** Flat list for the image section / legacy lookups. */
export const photos: Photo[] = albums.flatMap((album) => album.photos);

export function getAlbum(id: string) {
  return albums.find((album) => album.id === id) ?? null;
}

export const heroPhoto = {
  src: "/photos/hero/warp.jpg",
  flowSrc: "/photos/hero/warp-flow.webp",
  bleedSrc: "/photos/hero/warp-bleed.jpg",
  maskSrc: "/photos/hero/warp-mask.png",
  alt: "Mootez Boughattas in a weathered boat on a grassy hillside under a storm sky",
};
