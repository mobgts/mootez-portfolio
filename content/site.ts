import type { NavItem } from "./types";

export const site = {
  name: "mootez",
  surname: "bgts",
  year: "'26",
  manifesto:
    "I work between image, sound, and products. Photography, DJ sets, and things I ship.",
  coords: {
    lat: "50°44′02″ N",
    lng: "7°05′59″ E",
  },
  location: "Bonn, Germany",
  email: "boughattas.mootez@hotmail.com",
  linkedin: "https://www.linkedin.com/in/mootez-boughattas-2371261a8",
  nav: [
    { id: "image", label: "albums" },
    // sound + dev hidden for now
    { id: "about", label: "about" },
    { id: "contact", label: "contact" },
  ] satisfies NavItem[],
  about: {
    story:
      "Hey, I am Mootez Boughattas, an independent photographer based in Bonn. I believe in self-expression through stopping motion, and keeping motion too :) I started a journey of holding lenses years ago. I’m honoured to take you through it, and through what and how I see.",
    body: "My style is expanding, but the human element will mostly stay at its core. Sometimes I’m spontaneous with street photography, but lately directing and editorial work have been giving me joy.",
  },
};
