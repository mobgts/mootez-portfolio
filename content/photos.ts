import type { Photo } from "./types";

// Replace files in public/photos, then point src here. No CMS.

export const photos: Photo[] = [
  {
    slug: "img-001",
    filename: "IMG_001_JPG",
    src: "/photos/img-001.jpg",
    alt: "Placeholder still — urban street",
    year: "'25",
    location: "Placeholder",
    span: "wide",
  },
  {
    slug: "img-002",
    filename: "IMG_002_JPG",
    src: "/photos/img-002.jpg",
    alt: "Placeholder still — city at night",
    year: "'24",
    location: "Placeholder",
    span: "square",
  },
  {
    slug: "img-003",
    filename: "IMG_003_JPG",
    src: "/photos/img-003.jpg",
    alt: "Placeholder still — landscape",
    year: "'24",
    location: "Placeholder",
    span: "tall",
  },
  {
    slug: "img-004",
    filename: "IMG_004_JPG",
    src: "/photos/img-004.jpg",
    alt: "Placeholder still — crowd and light",
    year: "'24",
    location: "Placeholder",
    span: "wide",
  },
  {
    slug: "img-005",
    filename: "IMG_005_JPG",
    src: "/photos/img-005.jpg",
    alt: "Placeholder still — sound",
    year: "'26",
    location: "Placeholder",
    span: "square",
  },
  {
    slug: "img-006",
    filename: "IMG_006_JPG",
    src: "/photos/img-006.jpg",
    alt: "Placeholder still — road",
    year: "'23",
    location: "Placeholder",
    span: "wide",
  },
  {
    slug: "img-007",
    filename: "IMG_007_JPG",
    src: "/photos/img-007.jpg",
    alt: "Placeholder still — listening",
    year: "'25",
    location: "Placeholder",
    span: "tall",
  },
  {
    slug: "img-008",
    filename: "IMG_008_JPG",
    src: "/photos/img-008.jpg",
    alt: "Placeholder still — interior",
    year: "'24",
    location: "Placeholder",
    span: "square",
  },
  {
    slug: "img-009",
    filename: "IMG_009_JPG",
    src: "/photos/img-009.jpg",
    alt: "Placeholder still — stage",
    year: "'23",
    location: "Placeholder",
    span: "wide",
  },
];

export const heroPhoto = {
  src: "/photos/hero-warp.jpg",
  flowSrc: "/photos/warp-flow.webp",
  bleedSrc: "/photos/hero-warp-bleed.jpg",
  alt: "Mootez Boughattas, warm-lit portrait pulled through a warped surface",
};
