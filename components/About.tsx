import Image from "next/image";
import { heroPhoto } from "@/content/photos";
import { site } from "@/content/site";
import { SectionMark } from "./SectionMark";

export function About() {
  return (
    <section
      id="about"
      className="story-about relative z-10 scroll-mt-16 px-5 py-12 md:min-h-[72vh] md:px-8 md:py-16"
    >
      <SectionMark label="About me" />
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,30rem)_minmax(12rem,1fr)] md:gap-16 lg:grid-cols-[minmax(0,34rem)_minmax(16rem,1fr)]">
        <div className="relative z-10 space-y-6 text-[22px] font-medium leading-[1.35] tracking-[0.01em] md:text-[28px]">
          <p>{site.about.lead}</p>
          <p className="text-[16px] leading-[1.55] tracking-[0.01em] text-muted md:text-[18px]">
            {site.about.body}
          </p>
        </div>
        <div className="relative aspect-[3/4] w-full overflow-hidden md:aspect-auto md:min-h-[58vh]">
          <Image
            src={heroPhoto.src}
            alt={heroPhoto.alt}
            fill
            className="object-cover object-[center_20%]"
            sizes="(max-width: 768px) 100vw, 40vw"
            priority
          />
        </div>
      </div>
    </section>
  );
}
