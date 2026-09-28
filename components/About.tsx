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
      <div className="mr-auto w-full max-w-5xl md:ml-10 md:pr-8 lg:ml-14">
        <div className="flex w-full flex-col items-stretch gap-10 md:flex-row md:items-start md:gap-14 lg:gap-16">
          <div className="relative mx-auto aspect-[3/2] w-full max-w-[22rem] shrink-0 overflow-hidden md:mx-0 md:max-w-[26rem] lg:max-w-[28rem]">
            <AboutPhoto
              src={heroPhoto.src}
              maskSrc={heroPhoto.maskSrc}
              alt={heroPhoto.alt}
            />
          </div>
          <SilkArrive
            drive={drive}
            strength={1}
            className="relative z-10 w-full max-w-md space-y-5 text-[16px] font-medium leading-[1.5] tracking-[0.01em] md:text-[18px]"
          >
            <p>{site.about.story}</p>
            <p className="text-[14px] leading-[1.55] tracking-[0.01em] text-muted md:text-[15px]">
              {site.about.body}
            </p>
          </SilkArrive>
        </div>
      </div>
    </section>
  );
}
