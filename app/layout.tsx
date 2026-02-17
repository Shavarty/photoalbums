import type { Metadata } from "next";
import { IBM_Plex_Sans, Playfair_Display, Balsamiq_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  subsets: ["latin", "cyrillic"],
});

const playfairDisplay = Playfair_Display({
  weight: ["400", "600", "700"],
  variable: "--font-playfair-display",
  subsets: ["latin", "cyrillic"],
});

const balsamiqSans = Balsamiq_Sans({
  weight: ["400", "700"],
  variable: "--font-balsamiq-sans",
  subsets: ["latin", "cyrillic"],
});

// Cover title fonts (local) - относительно app/layout.tsx
const iceAge = localFont({
  src: "./fonts/iceageruss.ttf",
  variable: "--font-ice-age",
  display: "swap",
  fallback: ["Impact", "Arial Black", "sans-serif"],
});

const fkAlako = localFont({
  src: "./fonts/fkalakokz.ttf",
  variable: "--font-fk-alako",
  display: "swap",
  fallback: ["Brush Script MT", "cursive"],
});

export const metadata: Metadata = {
  title: "Фотоальбомы КНИГОДАР",
  description: "Создайте персонализированный фотоальбом для печати",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${ibmPlexSans.variable} ${playfairDisplay.variable} ${balsamiqSans.variable} ${iceAge.variable} ${fkAlako.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
