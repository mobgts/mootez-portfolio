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
 * - onLanding: true → appears in the homepage scroll; else nav / expand only.
 */

const drowningPhotos: Photo[] = [
  {
    slug: "drowning-01",
    filename: "DROWNING_01",
    src: "/photos/drowning/01.jpg",
    alt: "Series: drowning — two figures and splash in a night inflatable pool",
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
    alt: "Series: drowning — submerged face-up holding a bouquet",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "drowning-04",
    filename: "DROWNING_04",
    src: "/photos/drowning/04.jpg",
    alt: "Series: drowning — standing waist-deep in sunglasses with a bouquet",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "drowning-05",
    filename: "DROWNING_05",
    src: "/photos/drowning/05.jpg",
    alt: "Series: drowning — kneeling in a blue pool in a floral dress",
    year: "'26",
    location: "Water",
    span: "wide",
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
    span: "wide",
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

const peoplePhotos: Photo[] = [
  {
    slug: "people-01",
    filename: "PEOPLE_01",
    src: "/photos/people/01.JPG",
    alt: "Series: people — reading a newspaper by a broken window",
    year: "'26",
    location: "Ruin",
    span: "tall",
  },
  {
    slug: "people-02",
    filename: "PEOPLE_02",
    src: "/photos/people/02.JPG",
    alt: "Series: people — green socks stepping on a plastic chair in ruin",
    year: "'26",
    location: "Ruin",
    span: "tall",
  },
  {
    slug: "people-03",
    filename: "PEOPLE_03",
    src: "/photos/people/03w.jpg",
    alt: "Series: people — blurred night gathering under a neon sign",
    year: "'26",
    location: "Night",
    span: "wide",
  },
  {
    slug: "people-04",
    filename: "PEOPLE_04",
    src: "/photos/people/04.JPG",
    alt: "Series: people — looking up with a folding knife and watermelon on stones",
    year: "'26",
    location: "Beach",
    span: "wide",
  },
  {
    slug: "people-05",
    filename: "PEOPLE_05",
    src: "/photos/people/05.JPG",
    alt: "Series: people — face rising from overgrown green",
    year: "'26",
    location: "Garden",
    span: "tall",
  },
  {
    slug: "people-06",
    filename: "PEOPLE_06",
    src: "/photos/people/06.JPG",
    alt: "Series: people — bare back among dense garden foliage",
    year: "'26",
    location: "Garden",
    span: "tall",
  },
  {
    slug: "people-07",
    filename: "PEOPLE_07",
    src: "/photos/people/07.JPG",
    alt: "Series: people — draped across a park bench at night",
    year: "'26",
    location: "Night",
    span: "wide",
  },
  {
    slug: "people-08",
    filename: "PEOPLE_08",
    src: "/photos/people/08.JPG",
    alt: "Series: people — wet back and bird tattoo in shallow water",
    year: "'26",
    location: "Water",
    span: "tall",
  },
  {
    slug: "people-09",
    filename: "PEOPLE_09",
    src: "/photos/people/09.jpg",
    alt: "Series: people — lying on concrete shading eyes with a cap",
    year: "'26",
    location: "Street",
    span: "tall",
  },
  {
    slug: "people-10",
    filename: "PEOPLE_10",
    src: "/photos/people/10.jpg",
    alt: "Series: people — two on a bench under a blue wall sculpture",
    year: "'26",
    location: "Street",
    span: "wide",
  },
  {
    slug: "people-11",
    filename: "PEOPLE_11",
    src: "/photos/people/11.JPG",
    alt: "Series: people — figure on a spiral stair behind a railing",
    year: "'26",
    location: "Ruin",
    span: "tall",
  },
  {
    slug: "people-12",
    filename: "PEOPLE_12",
    src: "/photos/people/12.JPG",
    alt: "Series: people — reclining in a garden chair by a hedge",
    year: "'26",
    location: "Garden",
    span: "tall",
  },
  {
    slug: "people-13",
    filename: "PEOPLE_13",
    src: "/photos/people/13.jpg",
    alt: "Series: people — mirror held over a face in a wicker chair",
    year: "'26",
    location: "Garden",
    span: "tall",
  },
  {
    slug: "people-14",
    filename: "PEOPLE_14",
    src: "/photos/people/14.JPG",
    alt: "Series: people — cutting watermelon on a pebble beach",
    year: "'26",
    location: "Beach",
    span: "tall",
  },
];

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
  {
    slug: "doubles-04",
    filename: "DOUBLES_04",
    src: "/photos/doubles/04.jpg",
    alt: "Series: doubles — embrace among sunlit forest canopy",
    year: "'26",
    location: "Forest",
    span: "tall",
  },
];

const acroPhotos: Photo[] = [
  {
    slug: "acro-01",
    filename: "ACRO_01",
    src: "/photos/acro/01.jpg",
    alt: "Series: acro — entangled limbs in black and white",
    year: "'26",
    location: "Field",
    span: "square",
  },
  {
    slug: "acro-02",
    filename: "ACRO_02",
    src: "/photos/acro/02.jpg",
    alt: "Series: acro — flyer balanced horizontal over a base",
    year: "'26",
    location: "Field",
    span: "tall",
  },
  {
    slug: "acro-03",
    filename: "ACRO_03",
    src: "/photos/acro/03.jpg",
    alt: "Series: acro — partner balance outdoors",
    year: "'26",
    location: "Field",
    span: "tall",
  },
  {
    slug: "acro-04",
    filename: "ACRO_04",
    src: "/photos/acro/04.jpg",
    alt: "Series: acro — lift against dark trees",
    year: "'26",
    location: "Field",
    span: "tall",
  },
  {
    slug: "acro-05",
    filename: "ACRO_05",
    src: "/photos/acro/05.jpg",
    alt: "Series: acro — clustered hands and feet",
    year: "'26",
    location: "Field",
    span: "square",
  },
  {
    slug: "acro-06",
    filename: "ACRO_06",
    src: "/photos/acro/06.jpg",
    alt: "Series: acro — paired pose on grass",
    year: "'26",
    location: "Field",
    span: "tall",
  },
];

const analogPhotos: Photo[] = [
  {
    slug: "analog-01",
    filename: "ANALOG_01",
    src: "/photos/analog/01.jpg",
    alt: "Series: analog — torso under a straw hat on a blue towel",
    year: "'26",
    location: "Beach",
    span: "tall",
  },
  {
    slug: "analog-02",
    filename: "ANALOG_02",
    src: "/photos/analog/02.jpg",
    alt: "Series: analog — riverside picnic with film flare",
    year: "'26",
    location: "River",
    span: "tall",
  },
  {
    slug: "analog-03",
    filename: "ANALOG_03",
    src: "/photos/analog/03.jpg",
    alt: "Series: analog — film still",
    year: "'26",
    location: "Film",
    span: "tall",
  },
  {
    slug: "analog-04",
    filename: "ANALOG_04",
    src: "/photos/analog/04.jpg",
    alt: "Series: analog — vertical film frame",
    year: "'26",
    location: "Film",
    span: "tall",
  },
  {
    slug: "analog-05",
    filename: "ANALOG_05",
    src: "/photos/analog/05.jpg",
    alt: "Series: analog — tall film frame",
    year: "'26",
    location: "Film",
    span: "tall",
  },
];

const gardeningPhotos: Photo[] = [
  {
    slug: "gardening-01",
    filename: "GARDENING_01",
    src: "/photos/gardening/01.JPG",
    alt: "Series: gardening — standing on a stool among potted plants",
    year: "'26",
    location: "Garden",
    span: "tall",
  },
  {
    slug: "gardening-02",
    filename: "GARDENING_02",
    src: "/photos/gardening/02.JPG",
    alt: "Series: gardening — seated with a yellow watering can",
    year: "'26",
    location: "Garden",
    span: "tall",
  },
  {
    slug: "gardening-03",
    filename: "GARDENING_03",
    src: "/photos/gardening/03.JPG",
    alt: "Series: gardening — portrait against a sheet backdrop",
    year: "'26",
    location: "Garden",
    span: "tall",
  },
  {
    slug: "gardening-04",
    filename: "GARDENING_04",
    src: "/photos/gardening/04.JPG",
    alt: "Series: gardening — staged outdoor portrait",
    year: "'26",
    location: "Garden",
    span: "tall",
  },
  {
    slug: "gardening-05",
    filename: "GARDENING_05",
    src: "/photos/gardening/05.JPG",
    alt: "Series: gardening — plants and softbox setup",
    year: "'26",
    location: "Garden",
    span: "tall",
  },
];

/** Full catalog — nav + expand. Landing scroll uses `landingAlbums`. */
export const albums: Album[] = [
  {
    id: "drowning",
    label: "series: drowning",
    onLanding: true,
    photos: drowningPhotos,
  },
  {
    id: "people",
    label: "series: people",
    onLanding: true,
    photos: peoplePhotos,
  },
  {
    id: "doubles",
    label: "series: doubles",
    photos: doublesPhotos,
  },
  {
    id: "acro",
    label: "series: acro",
    photos: acroPhotos,
  },
  {
    id: "analog",
    label: "series: analog",
    photos: analogPhotos,
  },
  {
    id: "gardening",
    label: "series: gardening",
    photos: gardeningPhotos,
  },
];

/** Albums that scrub on the homepage (drowning + people). */
export const landingAlbums: Album[] = albums.filter((album) => album.onLanding);

/** Flat list of landing shots only. */
export const landingPhotos: Photo[] = landingAlbums.flatMap(
  (album) => album.photos,
);

/**
 * Contact spiral — 12 shots, 2 per series, interleaved so the wheel reads mixed.
 * Keep this short: each entry is a WebGL texture on first About→Contact visit.
 */
const SPIRAL_PICKS: [string, string][] = [
  ["drowning", "drowning-01"],
  ["people", "people-03"],
  ["doubles", "doubles-01"],
  ["acro", "acro-04"],
  ["analog", "analog-05"],
  ["gardening", "gardening-04"],
  ["drowning", "drowning-04"],
  ["people", "people-08"],
  ["doubles", "doubles-04"],
  ["acro", "acro-03"],
  ["analog", "analog-03"],
  ["gardening", "gardening-03"],
];

export const spiralPhotos: Photo[] = SPIRAL_PICKS.map(([albumId, slug]) => {
  const album = albums.find((entry) => entry.id === albumId);
  const photo = album?.photos.find((entry) => entry.slug === slug);
  if (!photo) {
    throw new Error(`spiralPhotos: missing ${albumId}/${slug}`);
  }
  return photo;
});

/** Flat list for legacy lookups (all albums). */
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
