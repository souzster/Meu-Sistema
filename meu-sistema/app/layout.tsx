import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const fonte = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--fonte",
});

export const metadata: Metadata = {
  title: "Seu Nome | Cartão de visita",
  description: "Quem sou eu e como falar comigo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={fonte.variable}>
      <body>{children}</body>
    </html>
  );
}