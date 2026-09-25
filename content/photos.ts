import type { Album, Photo } from "./types";

// Replace files in public/photos, then point src here. No CMS.

const doublesPhotos: Photo[] = [
  {
    slug: "doubles-01",
    filename: "DOUBLES_01",
    src: "/photos/hero-stack-01.jpg",
    alt: "Series: doubles — embrace on a fallen trunk",
    year: "'26",
    location: "Forest",
    span: "tall",
  },
  {
    slug: "doubles-02",
    filename: "DOUBLES_02",
    src: "/photos/hero-stack-02.jpg",
    alt: "Series: doubles — seated on a fallen trunk",
    year: "'26",
    location: "Forest",
    span: "tall",
  },
  {
    slug: "doubles-03",
    filename: "DOUBLES_03",
    src: "/photos/hero-stack-03.jpg",
    alt: "Series: doubles — close embrace on a fallen trunk",
    year: "'26",
    location: "Forest",
    span: "tall",
  },
];

// Placeholder night album — swap in dedicated stills when ready.
const nightPhotos: Photo[] = [
  {
    slug: "night-01",
    filename: "NIGHT_01",
    src: "/photos/hero-stack-03.jpg",
    alt: "Series: night — close embrace on a fallen trunk",
    year: "'26",
    location: "Night",
    span: "tall",
  },
  {
    slug: "night-02",
    filename: "NIGHT_02",
    src: "/photos/hero-stack-01.jpg",
    alt: "Series: night — embrace on a fallen trunk",
    year: "'26",
    location: "Night",
    span: "tall",
  },
  {
    slug: "night-03",
    filename: "NIGHT_03",
    src: "/photos/hero-stack-02.jpg",
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
  src: "/photos/hero-warp.jpg",
  flowSrc: "/photos/warp-flow.webp",
  bleedSrc: "/photos/hero-warp-bleed.jpg",
  maskSrc: "/photos/hero-warp-mask.png",
  alt: "Mootez Boughattas, warm-lit portrait pulled through a warped surface",
};
