"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { ZonaSelect, ZONA_A_COORDINAR } from "@/components/ZonaSelect";
import { zonas } from "@/data/zonas";
import { construirTextoPedido, construirUrlWhatsapp } from "@/lib/whatsapp";

type Modalidad = "delivery" | "retiro";

export default function CheckoutPage() {
  const { items, subtotal, vaciar } = useCart();

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad>("delivery");
  const [direccion, setDireccion] = useState("");
  const [zonaId, setZonaId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const zonaSeleccionada = zonas.find((z) => z.id === zonaId);
  const aCoordinar = modalidad === "delivery" && zonaId === ZONA_A_COORDINAR;
  const costoEnvio = modalidad === "delivery" && zonaSeleccionada ? zonaSeleccionada.costoEnvio : 0;

  function manejarConfirmar() {
    if (!nombre.trim() || !telefono.trim()) {
      setError("Completá tu nombre y teléfono.");
      return;
    }
    if (modalidad === "delivery" && (!direccion.trim() || !zonaId)) {
      setError("Completá la dirección y elegí una zona.");
      return;
    }
    setError(null);

    const texto = construirTextoPedido(items, subtotal, costoEnvio, {
      nombre,
      telefono,
      modalidad,
      direccion: modalidad === "delivery" ? direccion : undefined,
      zonaNombre: aCoordinar ? undefined : zonaSeleccionada?.nombre,
      aCoordinar,
    });

    vaciar();
    window.location.href = construirUrlWhatsapp(texto);
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-lg text-brand-black/70">Tu carrito está vacío.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-brand-black">Finalizar pedido</h1>

      <div className="mb-4 flex flex-col gap-1">
        <label className="text-sm font-semibold text-brand-black" htmlFor="nombre">
          Nombre
        </label>
        <input
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-md border border-brand-black/20 px-3 py-2"
        />
      </div>

      <div className="mb-4 flex flex-col gap-1">
        <label className="text-sm font-semibold text-brand-black" htmlFor="telefono">
          Teléfono
        </label>
        <input
          id="telefono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="rounded-md border border-brand-black/20 px-3 py-2"
        />
      </div>

      <div className="mb-4 flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="modalidad"
            checked={modalidad === "delivery"}
            onChange={() => setModalidad("delivery")}
          />
          Delivery
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="modalidad"
            checked={modalidad === "retiro"}
            onChange={() => setModalidad("retiro")}
          />
          Retiro en el local
        </label>
      </div>

      {modalidad === "delivery" && (
        <>
          <div className="mb-4 flex flex-col gap-1">
            <label className="text-sm font-semibold text-brand-black" htmlFor="direccion">
              Dirección
            </label>
            <input
              id="direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="rounded-md border border-brand-black/20 px-3 py-2"
            />
          </div>
          <div className="mb-4 flex flex-col gap-1">
            <label className="text-sm font-semibold text-brand-black">Zona de envío</label>
            <ZonaSelect value={zonaId} onChange={setZonaId} />
          </div>
        </>
      )}

      <p className="mb-4 text-sm text-brand-black/70">
        Forma de pago: pagás al recibir (efectivo o transferencia coordinada por WhatsApp).
      </p>

      {error && <p className="mb-4 text-sm font-semibold text-brand-red">{error}</p>}

      <button
        type="button"
        onClick={manejarConfirmar}
        className="w-full rounded-md bg-brand-red px-4 py-3 text-center font-semibold text-white"
      >
        Enviar pedido por WhatsApp
      </button>
    </main>
  );
}
