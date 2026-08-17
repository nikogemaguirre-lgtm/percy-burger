import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";

export default function PublicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Header />
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
