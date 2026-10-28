import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("http://localhost:3100"),

  title: {
    default: "Цаг агаарын мэдээллийн систем",
    template: "%s | Цаг агаар",
  },

  description:
    "Монгол орны цаг агаарын одоогийн мэдээлэл, 7 хоногийн урьдчилсан мэдээ, агаарын чанар болон цаг агаарын түүхэн мэдээлэл.",

  applicationName: "Weather Web",

  keywords: [
    "Монгол цаг агаар",
    "цаг агаарын мэдээ",
    "7 хоногийн урьдчилсан мэдээ",
    "агаарын чанар",
    "Weather Mongolia",
  ],

  openGraph: {
    title: "Цаг агаарын мэдээллийн систем",
    description:
      "Монгол орны цаг агаар, урьдчилсан мэдээ болон агаарын чанар.",
    siteName: "Weather Web",
    locale: "mn_MN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="mn"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-white">
        {children}
      </body>
    </html>
  );
}
