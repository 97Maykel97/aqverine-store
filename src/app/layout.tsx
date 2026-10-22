import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CartProvider } from "@/features/cart/ui/CartProvider";
import { Footer } from "@/shared/ui/footer/Footer";
import { Header } from "@/shared/ui/header/Header";

import "./globals.scss";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "AQVERINE — одежда для города",
    template: "%s — AQVERINE",
  },
  description: "AQVERINE — интернет-магазин городской одежды.",
  applicationName: "AQVERINE",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "AQVERINE",
    title: "AQVERINE — одежда для города",
    description: "Твой город, твои правила. Одежда для каждого твоего движения.",
    url: "/",
    images: [{ url: "/images/hero-city.png", width: 1586, height: 992, alt: "Городская коллекция AQVERINE" }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body>
        <CartProvider>
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
