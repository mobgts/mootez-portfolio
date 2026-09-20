import { site } from "@/content/site";
import { SectionMark } from "./SectionMark";

export function Process() {
  return (
    <section id="process" className="scroll-mt-16 px-4 py-16 md:px-8 md:py-24">
      <SectionMark label="How the three sit together" />
      <ol>
        {site.process.map((step) => (
          <li
            key={step.n}
            className="grid grid-cols-[auto_1fr] gap-6 border-t border-ink py-8 md:grid-cols-[120px_280px_1fr] md:gap-10"
          >
            <span className="font-display text-5xl leading-none tracking-wide">
              {step.n}
            </span>
            <h3 className="pt-2 text-[13px] font-medium uppercase tracking-[0.2em]">
              {step.title}
            </h3>
            <p className="max-w-xl pt-2 text-[15px] uppercase leading-[1.5] tracking-[0.08em] md:justify-self-end">
              {step.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
