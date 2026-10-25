import type { Album, Photo } from "./types";

/**
 * Photo catalog — one folder per series, numbered files only.
 *
 *   public/photos/<albumId>/01.jpg   ← scroll lead 1
 *   public/photos/<albumId>/02.jpg   ← scroll lead 2
 *   public/photos/<albumId>/03.jpg   ← scroll lead 3
 *   public/photos/<albumId>/04.jpg…  ← reel + expand
 *
 * Rules (every series):
 * - Array order MUST match filename order (01, 02, 03…).
 * - First 3 entries = scroll leads. Overwrite 01.jpg to change lead 1.
 * - One file per shot. No stack-*, -hq, -2k, series/, or _stage/.
 * - Staging only: public/photos/inbox/
 * - Special (not albums): hero/, sets/
 */

const doublesPhotos: Photo[] = [
  {
    slug: "doubles-01",
    filename: "DOUBLES_01",
    src: "/photos/doubles/01.jpg",
    alt: "Series: doubles — embrace on a fallen trunk",
    year: "'26",
    location: "Forest",
    span: "tall",
  },
  {
    slug: "doubles-02",
    filename: "DOUBLES_02",
    src: "/photos/doubles/02.jpg",
    alt: "Series: doubles — seated on a fallen trunk",
    year: "'26",
    location: "Forest",
    span: "tall",
  },
  {
    slug: "doubles-03",
    filename: "DOUBLES_03",
    src: "/photos/doubles/03.jpg",
    alt: "Series: doubles — close embrace on a fallen trunk",
    year: "'26",
    location: "Forest",
    span: "tall",
  },
];

const drowningPhotos: Photo[] = [
  {
    slug: "drowning-01",
    filename: "DROWNING_01",
    src: "/photos/drowning/01.jpg",
    alt: "Series: drowning — splash covering a face in a night pool",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "drowning-02",
    filename: "DROWNING_02",
    src: "/photos/drowning/02.jpg",
    alt: "Series: drowning — scream emerging from dark water with flowers",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "drowning-03",
    filename: "DROWNING_03",
    src: "/photos/drowning/03.jpg",
    alt: "Series: drowning — splash erupting from a night pool",
    year: "'26",
    location: "Water",
    span: "wide",
  },
  {
    slug: "drowning-04",
    filename: "DROWNING_04",
    src: "/photos/drowning/04.jpg",
    alt: "Series: drowning — standing waist-deep holding a bouquet",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "drowning-05",
    filename: "DROWNING_05",
    src: "/photos/drowning/05.jpg",
    alt: "Series: drowning — kneeling in a blue pool in a green dress",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "drowning-06",
    filename: "DROWNING_06",
    src: "/photos/drowning/06.jpg",
    alt: "Series: drowning — submerged face-up with flowers on the chest",
    year: "'26",
    location: "Water",
    span: "wide",
  },
  {
    slug: "drowning-07",
    filename: "DROWNING_07",
    src: "/photos/drowning/07.jpg",
    alt: "Series: drowning — seated in an inflatable pool at night",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "drowning-08",
    filename: "DROWNING_08",
    src: "/photos/drowning/08.jpg",
    alt: "Series: drowning — arm rising from dark water with pink flowers",
    year: "'26",
    location: "Water",
    span: "wide",
  },
  {
    slug: "drowning-09",
    filename: "DROWNING_09",
    src: "/photos/drowning/09.jpg",
    alt: "Series: drowning — torso floating in dark water at golden hour",
    year: "'26",
    location: "Water",
    span: "wide",
  },
  {
    slug: "drowning-10",
    filename: "DROWNING_10",
    src: "/photos/drowning/10.jpg",
    alt: "Series: drowning — wet lace dress clinging in dark water",
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
    id: "drowning",
    label: "series: drowning",
    photos: drowningPhotos,
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
