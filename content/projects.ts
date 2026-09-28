import type { Project } from "./types";

export const projects: Project[] = [
  {
    slug: "co-erasmus",
    title: "Co-Erasmus",
    year: "'26",
    role: "co-founder · design · build",
    summary:
      "We're building a peer-to-peer marketplace for verified Erasmus students while they're on exchange. They can sublet, rent, or swap rooms directly with each other, no landlords or agencies as middlemen.\n\nWe're aiming to make student housing fairer and more inclusive.",
    url: "https://co-erasmus.eu/",
    preview: true,
    embedQuery: "consent=necessary",
  },
  {
    slug: "portfolio",
    title: "Portfolio",
    year: "'26",
    role: "design · build",
    summary:
      "This is it, duh.\n\nThis is v1. The plan was to get the structure in place first, and I'll keep adding work. For now, the whole site feels more techy than I actually am. I've been thinking about a watery theme, but we'll see.\n\nI also wanted the portfolio to feel like one connected story. I'll keep building on that until it feels like a single immersive experience rather than a bunch of separate blocks.",
    url: "/",
    preview: true,
    embedQuery: "embed=1",
  },
  {
    slug: "my-section",
    title: "MySection",
    summary:
      "A native event management app that makes signing up for ESN events easy. Built for sections that don't have a system yet, with integrations for the ticketing and management tools they already use.",
    placeholder: true,
  },
];
