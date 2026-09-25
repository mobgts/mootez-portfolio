import { site } from "@/content/site";
import { SectionMark } from "./SectionMark";

export function About() {
  return (
    <section
      id="about"
      className="story-about relative z-10 scroll-mt-16 px-5 py-20 md:min-h-[88vh] md:px-8 md:py-28"
    >
      <SectionMark label="About me" />
      {/* Copy left; right half open for the embedded silk portrait. */}
      <div className="grid gap-10 md:grid-cols-[minmax(0,30rem)_minmax(12rem,1fr)] md:gap-20 lg:grid-cols-[minmax(0,34rem)_minmax(16rem,1fr)]">
        <div className="relative z-10 space-y-6 text-[22px] font-medium leading-[1.35] tracking-[0.01em] md:text-[28px]">
          <p>{site.about.lead}</p>
          <p className="text-[16px] leading-[1.55] tracking-[0.01em] text-muted md:text-[18px]">
            {site.about.body}
          </p>
          <ul className="space-y-2 border-t border-ink/25 pt-4 text-[12px] font-medium tracking-[0.06em]">
            {site.practices.map((practice) => (
              <li key={practice}>{practice}</li>
            ))}
          </ul>
        </div>
        <div
          className="pointer-events-none hidden min-h-[58vh] md:block"
          aria-hidden
        />
      </div>
    </section>
  );
}
