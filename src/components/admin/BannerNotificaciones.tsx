"use client";

import { useState, useSyncExternalStore } from "react";
import { convertirClaveVapid, esIphoneSinInstalar, soportaPush } from "@/lib/push-cliente";

type Estado = "oculto" | "ofrecer" | "instalar-primero" | "activado" | "error";

function suscribirse() {
  return () => {};
}

function obtenerEstadoInicialCliente(): Estado {
  if (!soportaPush()) return "oculto";
  if (Notification.permission === "denied" || Notification.permission === "granted") return "oculto";
  return esIphoneSinInstalar() ? "instalar-primero" : "ofrecer";
}

function obtenerEstadoInicialServidor(): Estado {
  return "oculto";
}

export function BannerNotificaciones() {
  const estadoInicial = useSyncExternalStore(suscribirse, obtenerEstadoInicialCliente, obtenerEstadoInicialServidor);
  const [estadoLocal, setEstadoLocal] = useState<Estado | null>(null);
  const estado = estadoLocal ?? estadoInicial;

  async function activar() {
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") {
      setEstadoLocal("error");
      return;
    }
    try {
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertirClaveVapid(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
      });
      await fetch("/api/push/suscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(suscripcion.toJSON()),
      });
      setEstadoLocal("activado");
    } catch {
      setEstadoLocal("error");
    }
  }

  if (estado === "oculto" || estado === "activado") return null;

  return (
    <div className="rounded-lg border border-brand-orange/30 bg-brand-orange/10 p-3 text-sm text-brand-black">
      {estado === "instalar-primero" && (
        <p>
          Para recibir avisos de pedidos nuevos, agregá esta página a tu pantalla de inicio primero
          (compartir → Agregar a inicio).
        </p>
      )}
      {estado === "ofrecer" && (
        <div className="flex items-center justify-between gap-3">
          <p>Activá los avisos para enterarte apenas entra un pedido nuevo.</p>
          <button
            type="button"
            onClick={activar}
            className="shrink-0 rounded-md bg-brand-orange px-3 py-2 font-semibold text-white"
          >
            Activar
          </button>
        </div>
      )}
      {estado === "error" && <p>No pudimos activar los avisos. Podés seguir usando la lista normalmente.</p>}
    </div>
  );
}
