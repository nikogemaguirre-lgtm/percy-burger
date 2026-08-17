"use client";

import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si falla el registro (navegador sin soporte, contexto no seguro, etc.),
        // el panel sigue funcionando igual con el polling de 15s como fallback.
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-brand-black">
      <link rel="manifest" href="/manifest.json" />
      {children}
    </div>
  );
}
