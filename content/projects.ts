import type { Project } from "./types";

export const projects: Project[] = [
  {
    slug: "co-erasmus",
    title: "Co-Erasmus",
    year: "'26",
    role: "Product · co-founder",
    summary:
      "Peer-to-peer housing for Erasmus students: list the room you leave, find the one you need, talk before you commit. No fees. Built with Ahmed Mahouachi from a bachelor thesis into a live platform, now in partnership with ESN Paris, ESN Bonn, and ESN Aachen.",
    url: "https://co-erasmus.eu/",
    preview: true,
    embedQuery: "consent=necessary",
  },
  {
    slug: "portfolio",
    title: "Portfolio",
    year: "'26",
    role: "Design · build",
    summary:
      "This site — image, sound, and products in one place. A living studio rather than a static CV, built to hold the work and grow with it.",
    url: "/",
    preview: true,
    embedQuery: "embed=1",
  },
  {
    slug: "project-003",
    title: "Project 003",
    year: "'—",
    role: "Placeholder",
    summary: "Another slot. Same fields as Co-Erasmus — keep the writing short.",
    placeholder: true,
  },
];
