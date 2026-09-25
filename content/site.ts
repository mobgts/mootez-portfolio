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
  email: "yowassup@mootez.com",
  linkedin: "https://www.linkedin.com/in/mootez-boughattas-2371261a8",
  nav: [
    { id: "image", label: "image" },
    { id: "sound", label: "sound" },
    { id: "dev", label: "dev" },
    { id: "about", label: "about" },
    { id: "contact", label: "contact" },
  ] satisfies NavItem[],
  about: {
    lead: "I have been reflecting on how i am spending my time lately and felt a bit scattered between all these digital hobbies/not so much hobbies sometimes, and thought i need a structure going on from here. This portfolio serves as a consolidation point and a start to a long journey of learning, that i would love to take you on with me.",
    body: "My name is Mootez Boughattas, currently Bonn based, and i feel like i don't have much to say. If something comes up i will update this section.",
  },
  practices: ["Image / Photography", "Sound / DJ sets", "Dev / Products"],
};
