import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Percy Burger",
  description: "Pedí tu hamburguesa favorita de Percy Burger, Guaymallén, Mendoza.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-brand-black">{children}</body>
    </html>
  );
}
