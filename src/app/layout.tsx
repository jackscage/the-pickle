import type { Metadata, Viewport } from "next";
import { Nunito, Caveat } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

// Used only for the text inside a pickle -- never for interface chrome.
// See PROJECT_SPEC.md section 17.
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Pickle",
  description:
    "A jar that fills up, gets sealed, and opens all at once. For your people only.",
};

export const viewport: Viewport = {
  themeColor: "#3E5641",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${nunito.variable} ${caveat.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
