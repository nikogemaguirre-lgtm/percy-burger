"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function CerrarSesionButton() {
  const router = useRouter();

  async function manejarCerrarSesion() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={manejarCerrarSesion} className="text-sm text-brand-red underline">
      Cerrar sesión
    </button>
  );
}
