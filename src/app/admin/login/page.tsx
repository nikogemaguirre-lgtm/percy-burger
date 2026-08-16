"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviandoReset, setEnviandoReset] = useState(false);
  const [resetEnviado, setResetEnviado] = useState(false);

  async function manejarLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: errorLogin } = await supabase.auth.signInWithPassword({ email, password });
    if (errorLogin) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  async function manejarOlvideContrasena() {
    if (!email.trim()) {
      setError("Ingresá tu email arriba para poder enviarte el link.");
      return;
    }
    setEnviandoReset(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: errorReset } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/actualizar-contrasena`,
    });
    setEnviandoReset(false);
    if (errorReset) {
      setError("No pudimos enviar el mail de recuperación. Probá de nuevo.");
      return;
    }
    setResetEnviado(true);
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-bold text-brand-black">Ingresar</h1>
      <form onSubmit={manejarLogin} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="rounded-md border border-brand-black/20 px-3 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          required
          className="rounded-md border border-brand-black/20 px-3 py-2"
        />
        {error && <p className="text-sm text-brand-red">{error}</p>}
        <button type="submit" className="rounded-md bg-brand-red px-4 py-2 font-semibold text-white">
          Ingresar
        </button>
      </form>
      {resetEnviado ? (
        <p className="text-sm text-brand-black/70">Te enviamos un mail para restablecer tu contraseña.</p>
      ) : (
        <button
          type="button"
          onClick={manejarOlvideContrasena}
          disabled={enviandoReset}
          className="text-sm text-brand-orange-burnt underline disabled:opacity-50"
        >
          Olvidé mi contraseña
        </button>
      )}
    </main>
  );
}
