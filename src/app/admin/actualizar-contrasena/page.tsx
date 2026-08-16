"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ActualizarContrasenaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function manejarGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setGuardando(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: errorUpdate } = await supabase.auth.updateUser({ password });
    setGuardando(false);
    if (errorUpdate) {
      setError("No pudimos actualizar la contraseña. Pedí un nuevo link de recuperación.");
      return;
    }
    router.push("/admin");
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-bold text-brand-black">Nueva contraseña</h1>
      <form onSubmit={manejarGuardar} className="flex flex-col gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
          required
          className="rounded-md border border-brand-black/20 px-3 py-2"
        />
        {error && <p className="text-sm text-brand-red">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="rounded-md bg-brand-red px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          Guardar
        </button>
      </form>
    </main>
  );
}
