import { site } from "@/content/site";
import { SectionMark } from "./SectionMark";

export function Contact() {
  return (
    <section id="contact" className="scroll-mt-16 px-4 py-10 md:px-8 md:py-16">
      <SectionMark label="Contact" />
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
      <footer className="mt-24 border-t border-ink pt-4 text-[11px] lowercase tracking-[0.16em]">
        © {new Date().getFullYear()} {site.name}.{site.surname}
      </footer>
    </section>
  );
}
