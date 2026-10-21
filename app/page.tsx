import { About } from "@/components/About";
import { Hero } from "@/components/Hero";
import { PageTint } from "@/components/PageTint";
import { SeriesExpandHost } from "@/components/SeriesExpand";
import { StickyNav } from "@/components/StickyNav";
import { StudioRail } from "@/components/StudioRail";
import { StoryShell } from "@/components/StoryShell";

export default function Home() {
  return (
    <>
      <StoryShell>
        <PageTint />
        <Hero />
        {/* Sound + Dev parked for now */}
        <About />
      </StoryShell>
      {/* Nav + expand sit outside the page stacking context so nav can stay above the album. */}
      <StudioRail />
      <StickyNav />
      <SeriesExpandHost />
    </>
  );
}
