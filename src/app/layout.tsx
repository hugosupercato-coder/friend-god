import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FRIEND GOD | Real-Time Stock Support & Resistance Tracker",
  description: "Real-time stock support/resistance tracker and portfolio manager for US and Thai stock markets with premium buy recommendations.",
  keywords: "stock support resistance, technical analysis, portfolio tracker, stock buy recommendation, Thai stock, US stock, FRIEND GOD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#030712] text-gray-100 selection:bg-purple-500/30 selection:text-purple-200">
        {children}
      </body>
    </html>
  );
}
