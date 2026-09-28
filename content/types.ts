export type NavItem = {
  id: string;
  label: string;
};

export type Photo = {
  slug: string;
  filename: string;
  src: string;
  alt: string;
  year: string;
  location: string;
  span: "wide" | "tall" | "square";
};

export type Album = {
  id: string;
  label: string;
  photos: Photo[];
};

export type Set = {
  slug: string;
  filename: string;
  title: string;
  year: string;
  venue: string;
  cover: string;
  /** Display duration, e.g. "7:01". */
  duration?: string;
  embedUrl?: string;
};

export type Project = {
  slug: string;
  title: string;
  year?: string;
  role?: string;
  summary: string;
  url?: string;
  /** When true, show project intro first; "See it" loads the live embed. */
  preview?: boolean;
  /**
   * Query string appended when opening the live embed
   * (e.g. "consent=necessary" for Co-Erasmus essential cookies).
   */
  embedQuery?: string;
  placeholder?: boolean;
};
