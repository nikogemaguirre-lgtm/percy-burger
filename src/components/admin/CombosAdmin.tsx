"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Producto, Combo } from "@/data/types";
import { AdminModal } from "./AdminModal";
import { ComboForm } from "./ComboForm";
import { ComboInput, crearCombo, actualizarCombo, borrarCombo } from "@/lib/catalogo-admin";

export function CombosAdmin({
  combos,
  productosDisponibles,
  onCombosChange,
}: {
  combos: Combo[];
  productosDisponibles: Producto[];
  onCombosChange: Dispatch<SetStateAction<Combo[]>>;
}) {
  const [editando, setEditando] = useState<Combo | "nuevo" | null>(null);

  async function manejarGuardar(input: ComboInput) {
    if (editando === "nuevo") {
      const creado = await crearCombo(input);
      onCombosChange((prev) => [...prev, creado]);
    } else if (editando) {
      const actualizado = await actualizarCombo(editando.id, input);
      onCombosChange((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
    }
    setEditando(null);
  }

  function manejarBorrar(combo: Combo) {
    if (!window.confirm(`¿Borrar "${combo.nombre}"?`)) return;
    borrarCombo(combo.id).then(() => {
      onCombosChange((prev) => prev.filter((c) => c.id !== combo.id));
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">Combos ({combos.length})</h2>
        <button
          type="button"
          onClick={() => setEditando("nuevo")}
          className="rounded-md bg-brand-orange px-3 py-1 text-sm font-semibold text-white"
        >
          Nuevo
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {combos.map((combo) => (
          <li
            key={combo.id}
            className="flex items-center justify-between rounded-md border border-brand-black/10 px-3 py-2"
          >
            <div>
              <span className="font-medium">{combo.nombre}</span>
              <span className="ml-2 text-sm text-brand-black/60">{combo.activo ? "activo" : "inactivo"}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(combo)}
                className="text-sm text-brand-orange-burnt underline"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => manejarBorrar(combo)}
                className="text-sm text-brand-red underline"
              >
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {editando && (
        <AdminModal titulo={editando === "nuevo" ? "Nuevo combo" : "Editar combo"} onClose={() => setEditando(null)}>
          <ComboForm
            comboInicial={editando === "nuevo" ? undefined : editando}
            productosDisponibles={productosDisponibles}
            onGuardar={manejarGuardar}
            onCancelar={() => setEditando(null)}
          />
        </AdminModal>
      )}
    </section>
  );
}
