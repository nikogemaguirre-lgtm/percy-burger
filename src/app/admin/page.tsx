import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerProductos, obtenerCombos } from "@/lib/catalogo";
import { CerrarSesionButton } from "@/components/admin/CerrarSesionButton";

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
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-brand-black">Productos ({productos.length})</h2>
        <ul className="flex flex-col gap-2">
          {productos.map((producto) => (
            <li key={producto.id} className="rounded-md border border-brand-black/10 px-3 py-2">
              <span className="font-medium">{producto.nombre}</span>
              <span className="ml-2 text-sm text-brand-black/60">{producto.categoria}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-black">Combos ({combos.length})</h2>
        <ul className="flex flex-col gap-2">
          {combos.map((combo) => (
            <li key={combo.id} className="rounded-md border border-brand-black/10 px-3 py-2">
              <span className="font-medium">{combo.nombre}</span>
              <span className="ml-2 text-sm text-brand-black/60">{combo.activo ? "activo" : "inactivo"}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
