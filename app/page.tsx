import { About } from "@/components/About";
import { AlbumHost } from "@/components/AlbumHost";
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
        <StudioRail />
        <StickyNav />
        <Hero />
        {/* Sound + Dev parked for now */}
        <About />
      </StoryShell>
      <SeriesExpandHost />
      <AlbumHost />
    </>
  );
}
