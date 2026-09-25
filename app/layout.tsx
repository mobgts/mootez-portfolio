import type { Metadata } from "next";
import { Space_Grotesk, Syne } from "next/font/google";
import { CursorRevealProvider } from "@/components/CursorReveal";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
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
      className={`${syne.variable} ${space.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        <CursorRevealProvider>{children}</CursorRevealProvider>
      </body>
    </html>
  );
}
