import { projects } from "@/content/projects";
import { SectionMark } from "./SectionMark";

export function DevWork() {
  const lead = projects[0];
  const rest = projects.slice(1);

  return (
    <section id="dev" className="scroll-mt-16 px-4 py-16 md:px-8 md:py-24">
      <SectionMark label="Dev" extra="Projects and products" />

      <article className="grid gap-8 border-t border-ink pt-8 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
            {lead.role} · {lead.year}
          </p>
          <h3 className="mt-3 font-display text-[18vw] leading-[0.85] tracking-wide md:text-[8rem]">
            {lead.title.toUpperCase()}
          </h3>
        </div>
        <div className="flex flex-col justify-end gap-8">
          <p className="max-w-md text-[16px] uppercase leading-[1.5] tracking-[0.06em]">
            {lead.summary}
          </p>
          {lead.url ? (
            <a
              href={lead.url}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] font-medium uppercase tracking-[0.2em] underline underline-offset-4"
            >
              co-erasmus.eu
            </a>
          ) : null}
        </div>
      </article>

      <div className="mt-16 grid gap-6 md:grid-cols-2">
        {rest.map((project) => (
          <article
            key={project.slug}
            className="flex min-h-[220px] flex-col justify-between border border-ink p-5"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.2em]">
              {project.year} · {project.role}
            </p>
            <div>
              <h3 className="font-display text-5xl tracking-wide">
                {project.title.toUpperCase()}
              </h3>
              <p className="mt-3 max-w-sm text-[13px] uppercase leading-5 tracking-[0.1em] text-muted">
                {project.summary}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
