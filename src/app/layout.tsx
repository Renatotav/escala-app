import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Gestão da Coordenadoria de Atendimento do PJe",
  description: "Sistema de gestão de escalas, banco de horas e elegibilidade híbrida",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${geist.variable} font-sans bg-gray-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
