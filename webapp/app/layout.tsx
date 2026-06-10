import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Hanken_Grotesk,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

/* ─── Font loading (next/font/google — self-hosted, no FOUT) ─── */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display-loaded",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-ui-loaded",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-data-loaded",
  display: "swap",
});

/* ─── Metadata (includes manifest + iOS PWA links) ─── */
export const metadata: Metadata = {
  title: "Questline",
  description: "A premium habit tracker — warm, restrained, earned.",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  },
};

/* ─── Viewport (viewport-fit=cover for safe areas, theme-color light+dark) ─── */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2ed" },
    { media: "(prefers-color-scheme: dark)", color: "#15140f" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
