"use client";

import { useRef } from "react";
import { heroPhoto } from "@/content/photos";
import { site } from "@/content/site";
import { AboutPhoto } from "./AboutPhoto";
import { FromNavMark } from "./FromNavMark";
import { SilkArrive, useSilkDrive } from "./AboutSilk";

export function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const drive = useSilkDrive(sectionRef);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="story-about relative z-10 scroll-mt-16 px-5 py-12 md:min-h-[72vh] md:px-8 md:py-16"
    >
      <FromNavMark navId="about" label="About" />
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,30rem)_minmax(12rem,1fr)] md:gap-12 lg:grid-cols-[minmax(0,34rem)_minmax(16rem,1fr)] lg:gap-14">
        <SilkArrive
          drive={drive}
          strength={1}
          className="relative z-10 space-y-5 text-[16px] font-medium leading-[1.5] tracking-[0.01em] md:text-[18px]"
        >
          <p>{site.about.lead}</p>
          <p>{site.about.story}</p>
          <p className="text-[14px] leading-[1.55] tracking-[0.01em] text-muted md:text-[15px]">
            {site.about.body}
          </p>
        </SilkArrive>
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[22rem] overflow-hidden md:mx-0 md:ml-6 md:aspect-auto md:max-w-[28rem] md:min-h-[52vh] lg:ml-8 lg:max-w-[30rem]">
          <AboutPhoto
            src={heroPhoto.src}
            maskSrc={heroPhoto.maskSrc}
            alt={heroPhoto.alt}
          />
        </div>
      </div>
    </section>
  );
}
