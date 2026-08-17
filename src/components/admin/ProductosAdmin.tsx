"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Producto, Combo } from "@/data/types";
import { AdminModal } from "./AdminModal";
import { ProductoForm } from "./ProductoForm";
import {
  ProductoInput,
  crearProducto,
  actualizarProducto,
  borrarProducto,
  combosQueUsanProducto,
} from "@/lib/catalogo-admin";

export function ProductosAdmin({
  productos,
  combos,
  onProductosChange,
}: {
  productos: Producto[];
  combos: Combo[];
  onProductosChange: Dispatch<SetStateAction<Producto[]>>;
}) {
  const [editando, setEditando] = useState<Producto | "nuevo" | null>(null);
  const [avisoBorrado, setAvisoBorrado] = useState<{ producto: Producto; combos: Combo[] } | null>(null);

  async function manejarGuardar(input: ProductoInput) {
    if (editando === "nuevo") {
      const creado = await crearProducto(input);
      onProductosChange((prev) => [...prev, creado]);
    } else if (editando) {
      const actualizado = await actualizarProducto(editando.id, input);
      onProductosChange((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
    }
    setEditando(null);
  }

  function manejarBorrar(producto: Producto) {
    const combosAfectados = combosQueUsanProducto(combos, producto.id);
    if (combosAfectados.length > 0) {
      setAvisoBorrado({ producto, combos: combosAfectados });
      return;
    }
    if (!window.confirm(`¿Borrar "${producto.nombre}"?`)) return;
    borrarProducto(producto.id).then(() => {
      onProductosChange((prev) => prev.filter((p) => p.id !== producto.id));
    });
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">Productos ({productos.length})</h2>
        <button
          type="button"
          onClick={() => setEditando("nuevo")}
          className="rounded-md bg-brand-orange px-3 py-1 text-sm font-semibold text-white"
        >
          Nuevo
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {productos.map((producto) => (
          <li
            key={producto.id}
            className="flex items-center justify-between rounded-md border border-brand-black/10 px-3 py-2"
          >
            <div>
              <span className="font-medium">{producto.nombre}</span>
              <span className="ml-2 text-sm text-brand-black/60">{producto.categoria}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(producto)}
                className="text-sm text-brand-orange-burnt underline"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => manejarBorrar(producto)}
                className="text-sm text-brand-red underline"
              >
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {editando && (
        <AdminModal
          titulo={editando === "nuevo" ? "Nuevo producto" : "Editar producto"}
          onClose={() => setEditando(null)}
        >
          <ProductoForm
            productoInicial={editando === "nuevo" ? undefined : editando}
            onGuardar={manejarGuardar}
            onCancelar={() => setEditando(null)}
          />
        </AdminModal>
      )}
      {avisoBorrado && (
        <AdminModal titulo="No se puede borrar" onClose={() => setAvisoBorrado(null)}>
          <p className="text-sm text-brand-black/80">
            &quot;{avisoBorrado.producto.nombre}&quot; está incluido en:{" "}
            {avisoBorrado.combos.map((c) => c.nombre).join(", ")}. Sacalo de esos combos antes de borrarlo.
          </p>
        </AdminModal>
      )}
    </section>
  );
}
