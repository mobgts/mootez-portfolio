"use client";

import { useState } from "react";
import { sets } from "@/content/sets";
import { SectionMark } from "./SectionMark";
import { Still } from "./Still";

export function SoundWork() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section id="sound" className="scroll-mt-16 px-4 py-16 md:px-8 md:py-24">
      <SectionMark label="Sound" extra="DJ sets · embed when ready" />
      <ul>
        {sets.map((set) => {
          const isOpen = open === set.slug;
          return (
            <li key={set.slug} className="border-t border-ink last:border-b">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : set.slug)}
                className="grid w-full grid-cols-[72px_1fr_auto] items-center gap-4 py-5 text-left md:grid-cols-[96px_1fr_auto_auto] md:gap-8"
              >
                <span className="relative block aspect-square overflow-hidden bg-ink/10">
                  <Still src={set.cover} alt="" sizes="96px" radius={110} />
                </span>
                <span>
                  <span className="block text-[13px] font-medium uppercase tracking-[0.16em]">
                    {set.filename}
                  </span>
                  <span className="mt-1 block text-[12px] uppercase tracking-[0.14em] text-muted">
                    {set.title} · {set.venue}
                  </span>
                </span>
                <span className="hidden text-[12px] uppercase tracking-[0.16em] md:block">
                  {isOpen ? "Close" : "Play"}
                </span>
                <span className="text-[13px] font-medium tracking-[0.16em]">
                  {set.year}
                </span>
              </button>
              {isOpen ? (
                <div className="border-t border-ink/20 pb-8 pt-4">
                  {set.embedUrl ? (
                    <iframe
                      title={set.title}
                      src={set.embedUrl}
                      className="h-[120px] w-full"
                      allow="autoplay"
                    />
                  ) : (
                    <p className="max-w-xl text-[13px] uppercase leading-6 tracking-[0.12em] text-muted">
                      No mix URL yet. When the set is ready, add a Mixcloud,
                      SoundCloud, or YouTube embed on this entry.
                    </p>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
