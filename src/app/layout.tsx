import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Percy Burger",
  description: "Pedí tu hamburguesa favorita de Percy Burger, Guaymallén, Mendoza.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-brand-black">
        <CartProvider>
          <Header />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
