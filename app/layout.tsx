import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { CursorRevealProvider } from "@/components/CursorReveal";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display-face",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans-face",
});

export const metadata: Metadata = {
  title: "mootez.bgts",
  description:
    "Image, sound, and products. Photography, DJ sets, and things I ship. Based in Bonn.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        <CursorRevealProvider>{children}</CursorRevealProvider>
      </body>
    </html>
  );
}
