import type { Metadata } from "next";
import { Instrument_Serif, Inter, Noto_Sans_Bengali } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProviders } from "@/components/providers";
import "./globals.css";

const displaySerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const ui = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Loaded so that Bangla creator names render as text rather than tofu boxes.
// It sits after the Latin faces in the stack, so Latin text is unaffected.
const bengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Talent Grid",
  description: "The creator database.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${displaySerif.variable} ${ui.variable} ${bengali.variable} bg-canvas text-ink`}
      >
        <AppProviders>
          <TooltipProvider delayDuration={120}>{children}</TooltipProvider>
        </AppProviders>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
