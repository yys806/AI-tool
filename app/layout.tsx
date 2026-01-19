import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";

const heading = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "AI Academic Cockpit",
  description: "AI 学术驾驶舱，提升论文阅读与系统设计效率。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body
        className={`${body.variable} ${heading.variable} min-h-screen bg-[var(--bg)] text-[color:var(--ink)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
