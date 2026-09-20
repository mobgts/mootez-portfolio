import { site } from "@/content/site";
import { SectionMark } from "./SectionMark";

export function Contact() {
  const [user, domain] = site.email.split("@");

  return (
    <section id="contact" className="scroll-mt-16 px-4 py-16 md:px-8 md:py-28">
      <SectionMark label="Let's work together" />
      <div className="grid gap-12 md:grid-cols-[1.2fr_0.8fr]">
        <a
          href={`mailto:${site.email}`}
          className="font-display text-[18vw] leading-[0.82] tracking-wide md:text-[8.5rem]"
        >
          <span className="block">{user.toUpperCase()}@</span>
          <span className="block">{domain.split(".")[0].toUpperCase()}</span>
          <span className="block">.{domain.split(".").slice(1).join(".").toUpperCase()}</span>
        </a>
        <div className="flex flex-col justify-end gap-8 text-[13px] font-medium uppercase tracking-[0.16em]">
          <p>
            Location
            <br />
            {site.location}
          </p>
          <p>
            <a href={site.linkedin} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              LinkedIn
            </a>
          </p>
          <p className="text-muted">
            {site.coords.lat}
            <br />
            {site.coords.lng}
          </p>
        </div>
      </div>
      <footer className="mt-24 flex flex-wrap items-center justify-between gap-4 border-t border-ink pt-4 text-[11px] uppercase tracking-[0.16em]">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <span>Image · Sound · Dev</span>
      </footer>
    </section>
  );
}
