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

const waterPhotos: Photo[] = [
  // Stack covers (mixed old + new)
  {
    slug: "water-01",
    filename: "WATER_01",
    src: "/photos/water/09-2k.jpg",
    alt: "Series: water — splash covering a face in a night pool",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "water-02",
    filename: "WATER_02",
    src: "/photos/water/stack-01.jpg",
    alt: "Series: water — scream emerging from dark water with flowers",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "water-03",
    filename: "WATER_03",
    src: "/photos/water/08-2k.jpg",
    alt: "Series: water — splash erupting from a night pool",
    year: "'26",
    location: "Water",
    span: "wide",
  },
  // Landing singles — lace last so it shows on the hero row
  {
    slug: "water-04",
    filename: "WATER_04",
    src: "/photos/water/stack-02.jpg",
    alt: "Series: water — standing waist-deep holding a bouquet",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "water-05",
    filename: "WATER_05",
    src: "/photos/water/06.jpg",
    alt: "Series: water — kneeling in a blue pool in a green dress",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "water-06",
    filename: "WATER_06",
    src: "/photos/water/stack-03.jpg",
    alt: "Series: water — submerged face-up with flowers on the chest",
    year: "'26",
    location: "Water",
    span: "wide",
  },
  {
    slug: "water-07",
    filename: "WATER_07",
    src: "/photos/water/07.jpg",
    alt: "Series: water — seated in an inflatable pool at night",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "water-08",
    filename: "WATER_08",
    src: "/photos/water/04.jpg",
    alt: "Series: water — arm rising from dark water with pink flowers",
    year: "'26",
    location: "Water",
    span: "wide",
  },
  {
    slug: "water-09",
    filename: "WATER_09",
    src: "/photos/water/05.jpg",
    alt: "Series: water — torso floating in dark water at golden hour",
    year: "'26",
    location: "Water",
    span: "wide",
  },
  {
    slug: "water-10",
    filename: "WATER_10",
    src: "/photos/water/10-2k.jpg",
    alt: "Series: water — wet lace dress clinging in dark water",
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
    id: "water",
    label: "series: water",
    photos: waterPhotos,
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
