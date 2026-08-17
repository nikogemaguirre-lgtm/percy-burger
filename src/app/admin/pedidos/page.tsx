import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerPedidosActivos } from "@/lib/pedidos-admin";
import { CerrarSesionButton } from "@/components/admin/CerrarSesionButton";
import { PedidosAdmin } from "@/components/admin/PedidosAdmin";

export default async function PedidosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const pedidos = await obtenerPedidosActivos();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-black">Pedidos</h1>
        <CerrarSesionButton />
      </div>
      <PedidosAdmin pedidosIniciales={pedidos} />
    </main>
  );
}
