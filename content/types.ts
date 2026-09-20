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

export type Set = {
  slug: string;
  filename: string;
  title: string;
  year: string;
  venue: string;
  cover: string;
  embedUrl?: string;
};

export type Project = {
  slug: string;
  title: string;
  year: string;
  role: string;
  summary: string;
  url?: string;
  placeholder?: boolean;
};
