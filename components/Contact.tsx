import { site } from "@/content/site";
import { SectionMark } from "./SectionMark";

export function Contact() {
  return (
    <section id="contact" className="scroll-mt-16 px-4 py-16 md:px-8 md:py-28">
      <SectionMark label="Let's work together" />
      <div className="grid gap-12 md:grid-cols-[1.2fr_0.8fr]">
        <div className="max-w-2xl space-y-6 text-[22px] font-medium leading-[1.35] tracking-[0.01em] md:text-[28px]">
          <p>Interested in working together?</p>
          <p className="text-[16px] leading-[1.55] tracking-[0.01em] text-muted md:text-[18px]">
            Do you have an editorial project and think we a good fit?
          </p>
          <p className="max-w-xl text-[15px] leading-[1.6] tracking-[0.01em]">
            I rebrand, create websites from scratch, love to take pics. If you
            have a cool venue, i might also play there?
          </p>
          <p className="pt-2 text-[13px] font-medium tracking-[0.06em]">
            Send an email at{" "}
            <a
              href={`mailto:${site.email}`}
              className="underline underline-offset-4 transition-colors hover:text-olive-deep"
            >
              {site.email}
            </a>
          </p>
        </div>
        <div className="flex flex-col justify-end gap-8 text-[13px] font-medium uppercase tracking-[0.16em]">
          <p>
            Location
            <br />
            {site.location}
          </p>
          <p>
            <a
              href={site.linkedin}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              LinkedIn
            </a>
          </p>
        </div>
      </div>
      <footer className="mt-24 flex flex-wrap items-center justify-between gap-4 border-t border-ink pt-4 text-[11px] uppercase tracking-[0.16em]">
        <span>
          © {new Date().getFullYear()} {site.name}
        </span>
        <span>Image · Sound · Dev</span>
      </footer>
    </section>
  );
}
