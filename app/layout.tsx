import type { Metadata, Viewport } from "next";
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
  title: "Shen's tools",
  description:
    "Shen's tools：集成公式解码、架构绘图、代码解析、图转 LaTeX、提示词生成、报错分析、进制转换与二维码生成的八合一 AI 效率工具集。",
  applicationName: "Shen's tools",
  openGraph: {
    title: "Shen's tools",
    description: "八合一 AI 学术与工程效率工具集，BYOK 模式直连 SiliconFlow。",
    type: "website",
    locale: "zh_CN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f1ea",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body
        className={`${body.variable} ${heading.variable} min-h-screen bg-[var(--bg)] text-[color:var(--ink)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
