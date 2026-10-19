import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Footer } from "@/shared/ui/footer/Footer";
import { Header } from "@/shared/ui/header/Header";

import "./globals.scss";

export const metadata: Metadata = {
  title: {
    default: "AQVERINE — одежда для города",
    template: "%s — AQVERINE",
  },
  description: "AQVERINE — интернет-магазин городской одежды.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
