"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Producto, Combo, ComboItem } from "@/data/types";
import { ComboInput, validarCombo, validarImagen, subirImagenCatalogo } from "@/lib/catalogo-admin";

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function ComboForm({
  comboInicial,
  productosDisponibles,
  onGuardar,
  onCancelar,
}: {
  comboInicial?: Combo;
  productosDisponibles: Producto[];
  onGuardar: (input: ComboInput) => Promise<void>;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(comboInicial?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(comboInicial?.descripcion ?? "");
  const [precio, setPrecio] = useState(String(comboInicial?.precio ?? ""));
  const [activo, setActivo] = useState(comboInicial?.activo ?? true);
  const [imagenUrl, setImagenUrl] = useState(comboInicial?.imagenUrl ?? "/placeholder.svg");
  const [items, setItems] = useState<ComboItem[]>(comboInicial?.productos ?? []);
  const [productoAAgregar, setProductoAAgregar] = useState(productosDisponibles[0]?.id ?? "");
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function agregarItem() {
    if (!productoAAgregar) return;
    if (items.some((item) => item.productoId === productoAAgregar)) return;
    setItems((prev) => [...prev, { productoId: productoAAgregar, cantidad: 1 }]);
  }

  function quitarItem(productoId: string) {
    setItems((prev) => prev.filter((item) => item.productoId !== productoId));
  }

  function cambiarCantidad(productoId: string, cantidad: number) {
    setItems((prev) => prev.map((item) => (item.productoId === productoId ? { ...item, cantidad } : item)));
  }

  async function manejarSeleccionImagen(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const errorImagen = validarImagen(archivo);
    if (errorImagen) {
      setError(errorImagen);
      return;
    }
    setSubiendoImagen(true);
    setError(null);
    try {
      const id = comboInicial?.id ?? `nuevo-${Date.now()}`;
      const url = await subirImagenCatalogo("combos", id, archivo);
      setImagenUrl(url);
    } catch {
      setError("No pudimos subir la imagen. Probá de nuevo.");
    } finally {
      setSubiendoImagen(false);
    }
  }

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    const input: ComboInput = {
      nombre,
      descripcion,
      precio: Number(precio),
      imagenUrl,
      activo,
      productos: items,
    };
    const errorValidacion = validarCombo(input);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onGuardar(input);
    } catch {
      setError("No pudimos guardar el combo. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarSubmit} className="flex flex-col gap-3">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre"
        required
        className="rounded-md border border-brand-black/20 px-3 py-2"
      />
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción"
        className="rounded-md border border-brand-black/20 px-3 py-2"
      />
      <input
        type="number"
        value={precio}
        onChange={(e) => setPrecio(e.target.value)}
        placeholder="Precio"
        required
        className="rounded-md border border-brand-black/20 px-3 py-2"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
        Activo
      </label>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={manejarSeleccionImagen} />
      {subiendoImagen && <p className="text-sm text-brand-black/60">Subiendo imagen...</p>}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-brand-black">Productos del combo</h3>
        <ul className="mb-2 flex flex-col gap-1">
          {items.map((item) => {
            const producto = productosDisponibles.find((p) => p.id === item.productoId);
            return (
              <li key={item.productoId} className="flex items-center justify-between text-sm">
                <span>{producto?.nombre ?? item.productoId}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={(e) => cambiarCantidad(item.productoId, Number(e.target.value))}
                    className="w-16 rounded-md border border-brand-black/20 px-2 py-1"
                  />
                  <button type="button" onClick={() => quitarItem(item.productoId)} className="text-brand-red">
                    Quitar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2">
          <select
            value={productoAAgregar}
            onChange={(e) => setProductoAAgregar(e.target.value)}
            className="flex-1 rounded-md border border-brand-black/20 px-3 py-2"
          >
            {productosDisponibles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({formatearPrecio(p.precios.simple)})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={agregarItem}
            className="rounded-md bg-brand-orange px-3 py-2 text-sm text-white"
          >
            Agregar
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-brand-red">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="rounded-md px-4 py-2 text-sm text-brand-black/70">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando || subiendoImagen}
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}
