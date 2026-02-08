import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { CookieBanner } from "@/components/CookieBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Odds Compare · +EV Finder",
  description: "Compare sportsbook + Polymarket odds, find value bets, arbitrage, Kelly sizing. Free tool for bettors.",
  keywords: ["odds comparison", "sports betting", "value bets", "arbitrage", "Kelly criterion", "Polymarket"],
  openGraph: {
    title: "Odds Compare · +EV Finder",
    description: "Compare sportsbook + Polymarket odds, find value bets, Kelly sizing",
    type: "website",
  },
  metadataBase: new URL("https://odds-compare-beige.vercel.app"),
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}
