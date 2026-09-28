import type { Album, Photo } from "./types";

// Drop files into public/photos/<album>/, then register them here.
// First 3 per album = hero stack + overlay covers.
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

// Placeholder night album — replace files in public/photos/night/ when ready.
const nightPhotos: Photo[] = [
  {
    slug: "night-01",
    filename: "NIGHT_01",
    src: "/photos/night/stack-01.jpg",
    alt: "Series: night — close embrace on a fallen trunk",
    year: "'26",
    location: "Night",
    span: "tall",
  },
  {
    slug: "night-02",
    filename: "NIGHT_02",
    src: "/photos/night/stack-02.jpg",
    alt: "Series: night — embrace on a fallen trunk",
    year: "'26",
    location: "Night",
    span: "tall",
  },
  {
    slug: "night-03",
    filename: "NIGHT_03",
    src: "/photos/night/stack-03.jpg",
    alt: "Series: night — seated on a fallen trunk",
    year: "'26",
    location: "Night",
    span: "tall",
  },
];

export const albums: Album[] = [
  {
    id: "doubles",
    label: "series: doubles",
    photos: doublesPhotos,
  },
  {
    id: "night",
    label: "series: night",
    photos: nightPhotos,
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
