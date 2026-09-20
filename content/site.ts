import type { NavItem } from "./types";

export const site = {
  name: "mootez.bgts",
  surname: "",
  year: "'26",
  manifesto:
    "I work between image, sound, and products. Photography, DJ sets, and things I ship.",
  coords: {
    lat: "50°44′02″ N",
    lng: "7°05′59″ E",
  },
  location: "Bonn, Germany",
  email: "hello@mootezboughattas.com",
  linkedin: "https://www.linkedin.com/in/mootez-boughattas-2371261a8",
  nav: [
    { id: "about", label: "about" },
    { id: "image", label: "image" },
    { id: "sound", label: "sound" },
    { id: "dev", label: "dev" },
    { id: "contact", label: "contact" },
  ] satisfies NavItem[],
  about: {
    lead: "I spend time on stills, on nights, and on products that have to work in the world. Bonn is the base. The rest is movement.",
    body: "The photographs are how I look. The sets are how a room is held. The software is how an idea is asked to live outside a notebook. Co-Erasmus started as a bachelor thesis and became a room-swap for Erasmus students — peer to peer, no fees, built with Ahmed Mahouachi.",
    focus:
      "Nothing here is a separate brand. Image, sound, and code are one studio. Replace the placeholder stills and mixes with the work when it is ready to sit in this sequence.",
  },
  practices: ["Image / Photography", "Sound / DJ sets", "Dev / Products"],
  process: [
    {
      n: "01",
      title: "Collect",
      text: "Stills, recordings, and problems from the street — not a brief, a habit.",
    },
    {
      n: "02",
      title: "Hold",
      text: "Edit a series, a set, or a product until it has a shape that can stand alone.",
    },
    {
      n: "03",
      title: "Sequence",
      text: "Put image, sound, and code on the same timeline. Cut what does not belong.",
    },
    {
      n: "04",
      title: "Ship",
      text: "A print, a night, a live URL. The work is not finished in a folder.",
    },
    {
      n: "05",
      title: "Keep",
      text: "Live with it. What still feels true stays on this page.",
    },
  ],
};
