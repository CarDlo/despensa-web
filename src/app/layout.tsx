import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Despensa del Hogar 🏠",
  description: "Inventario de la despensa y sugerencias de almuerzo",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-[#f5f5f0]">{children}</body>
    </html>
  );
}
