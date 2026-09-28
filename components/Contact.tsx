"use client";

import { useRef } from "react";
import { site } from "@/content/site";
import { FromNavMark } from "./FromNavMark";
import { SilkArrive, useSilkDrive } from "./AboutSilk";

export function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const drive = useSilkDrive(sectionRef);

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="scroll-mt-16 px-4 py-10 md:px-8 md:py-16"
    >
      <FromNavMark navId="contact" label="Contact" />
      <SilkArrive
        drive={drive}
        strength={1}
        className="max-w-2xl space-y-6 text-[22px] font-medium leading-[1.35] tracking-[0.01em] md:text-[28px]"
      >
        <p>Interested in working together?</p>
        <p className="text-[16px] leading-[1.55] tracking-[0.01em] text-muted md:text-[18px]">
          Have a product or creative project and think we&apos;d be a good fit?
        </p>
        <p className="pt-2 text-[13px] font-medium tracking-[0.06em]">
          Send me an email at{" "}
          <a
            href={`mailto:${site.email}`}
            className="underline underline-offset-4 transition-colors hover:text-olive-deep"
          >
            {site.email}
          </a>
        </p>
      </SilkArrive>
      <SilkArrive drive={drive} strength={0.7}>
        <footer className="mt-24 border-t border-ink pt-4 text-[11px] lowercase tracking-[0.16em]">
          © {new Date().getFullYear()} {site.name}.{site.surname}
        </footer>
      </SilkArrive>
    </section>
  );
}
