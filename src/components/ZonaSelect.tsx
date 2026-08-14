"use client";

import { zonas } from "@/data/zonas";

export const ZONA_A_COORDINAR = "__a_coordinar__";

export function ZonaSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full rounded-md border border-brand-black/20 px-3 py-2 text-brand-black"
    >
      <option value="" disabled>
        Elegí tu zona
      </option>
      {zonas.map((zona) => (
        <option key={zona.id} value={zona.id}>
          {zona.nombre} — envío ${zona.costoEnvio.toLocaleString("es-AR")}
        </option>
      ))}
      <option value={ZONA_A_COORDINAR}>Mi zona no está en la lista (a coordinar por WhatsApp)</option>
    </select>
  );
}
