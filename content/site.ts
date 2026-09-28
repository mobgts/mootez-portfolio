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
    lead: "Writing the about section feels a bit daunting. Who am I? What have I done? What's shaping me?",
    story:
      "Well, I'm trying to consolidate my digital hobbies here (sometimes not so much hobbies), which I guess makes me multidisciplinary? I build digital experiences that feel personal, I shoot photos, I mix sometimes, and I love to keep improving at the intersection. I'll see where this gets me. Love to have you on the journey :)",
    body: "My name is Mootez Boughattas, based in Bonn. If you're interested to know more, just hit me up :)",
  },
};
