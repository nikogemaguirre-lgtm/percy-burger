import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerProductos, obtenerCombos } from "@/lib/catalogo";
import { CerrarSesionButton } from "@/components/admin/CerrarSesionButton";
import { ProductosAdmin } from "@/components/admin/ProductosAdmin";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const [productos, combos] = await Promise.all([obtenerProductos(), obtenerCombos()]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-black">Panel de Percy Burger</h1>
        <CerrarSesionButton />
      </div>
      <ProductosAdmin productosIniciales={productos} combos={combos} />
    </main>
  );
}
