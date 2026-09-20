import { Contact } from "@/components/Contact";
import { DevWork } from "@/components/DevWork";
import { Hero } from "@/components/Hero";
import { ImageWork } from "@/components/ImageWork";
import { PageTint } from "@/components/PageTint";
import { Process } from "@/components/Process";
import { SoundWork } from "@/components/SoundWork";
import { StickyNav } from "@/components/StickyNav";
import { StoryShell } from "@/components/StoryShell";

export default function Home() {
  return (
    <StoryShell>
      <PageTint />
      <StickyNav />
      <Hero />
      <ImageWork />
      <SoundWork />
      <DevWork />
      <Process />
      <Contact />
    </StoryShell>
  );
}
