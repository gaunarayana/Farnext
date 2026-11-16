import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";

import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const sans = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
});

const heading = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: {
    default: "Farnext",
    template: "%s · Farnext",
  },
  description:
    "Livestock sales processing for agencies in Australia and New Zealand.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${heading.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
