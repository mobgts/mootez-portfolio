import type { Metadata } from "next";
import { Barlow_Condensed, Bebas_Neue } from "next/font/google";
import { CursorRevealProvider } from "@/components/CursorReveal";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const barlow = Barlow_Condensed({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-barlow",
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
      className={`${bebas.variable} ${barlow.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        <CursorRevealProvider>{children}</CursorRevealProvider>
      </body>
    </html>
  );
}
