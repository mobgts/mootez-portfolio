import type { Photo } from "./types";

// Replace files in public/photos, then point src here. No CMS.

export const photos: Photo[] = [
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

export const heroPhoto = {
  src: "/photos/hero-warp.jpg",
  flowSrc: "/photos/warp-flow.webp",
  bleedSrc: "/photos/hero-warp-bleed.jpg",
  alt: "Mootez Boughattas, warm-lit portrait pulled through a warped surface",
};
