import { site } from "@/content/site";
import { SectionMark } from "./SectionMark";

export function About() {
  return (
    <section
      id="about"
      className="story-about relative z-10 scroll-mt-16 px-5 py-20 md:px-8 md:py-28"
    >
      <SectionMark label="About me" />
      <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
        <div className="space-y-6 text-[22px] font-medium leading-[1.35] tracking-[0.01em] md:text-[28px]">
          <p>{site.about.lead}</p>
          <p className="text-[16px] leading-[1.55] tracking-[0.01em] text-muted md:text-[18px]">
            {site.about.body}
          </p>
        </div>
        <div className="flex flex-col justify-between gap-10">
          <p className="max-w-sm text-[15px] leading-[1.6] tracking-[0.01em]">
            {site.about.focus}
          </p>
          <ul className="space-y-2 border-t border-ink/25 pt-4 text-[12px] font-medium tracking-[0.06em]">
            {site.practices.map((practice) => (
              <li key={practice}>{practice}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
