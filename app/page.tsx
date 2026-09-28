import { About } from "@/components/About";
import { AlbumHost } from "@/components/AlbumHost";
import { Contact } from "@/components/Contact";
import { DevWork } from "@/components/DevWork";
import { Hero } from "@/components/Hero";
import { PageTint } from "@/components/PageTint";
import { SoundWork } from "@/components/SoundWork";
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
        <SoundWork />
        <DevWork />
        <About />
        <Contact />
      </StoryShell>
      <AlbumHost />
    </>
  );
}
