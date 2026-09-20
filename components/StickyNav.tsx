"use client";

import { useEffect, useState } from "react";
import { site } from "@/content/site";

export function StickyNav() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.72);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`site-nav fixed inset-x-0 top-0 z-40 transition-transform duration-300 ${
        visible ? "translate-y-0" : "pointer-events-none -translate-y-full"
      }`}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-8">
        <a href="#top" className="font-sans text-xl font-medium leading-none tracking-[0.02em] md:text-2xl">
          {site.name}
        </a>
        <nav className="flex flex-1 items-center justify-end gap-4 overflow-x-auto text-[13px] font-medium tracking-[0.02em] md:justify-between md:gap-8 md:pl-16">
          {site.nav.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="shrink-0 text-ink/75 hover:text-olive-deep"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
