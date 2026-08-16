"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Producto } from "@/data/types";
import { ProductoInput, validarProducto, validarImagen, subirImagenCatalogo } from "@/lib/catalogo-admin";

const CATEGORIAS: Producto["categoria"][] = ["clasica", "especial", "extra", "bebida"];

export function ProductoForm({
  productoInicial,
  onGuardar,
  onCancelar,
}: {
  productoInicial?: Producto;
  onGuardar: (input: ProductoInput) => Promise<void>;
  onCancelar: () => void;
}) {
  const [categoria, setCategoria] = useState<Producto["categoria"]>(productoInicial?.categoria ?? "clasica");
  const [nombre, setNombre] = useState(productoInicial?.nombre ?? "");
  const [ingredientes, setIngredientes] = useState(productoInicial?.ingredientes ?? "");
  const [precioSimple, setPrecioSimple] = useState(String(productoInicial?.precios.simple ?? ""));
  const [precioDoble, setPrecioDoble] = useState(String(productoInicial?.precios.doble ?? ""));
  const [precioTriple, setPrecioTriple] = useState(String(productoInicial?.precios.triple ?? ""));
  const [imagenUrl, setImagenUrl] = useState(productoInicial?.imagenUrl ?? "/placeholder.svg");
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

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
      const id = productoInicial?.id ?? `nuevo-${Date.now()}`;
      const url = await subirImagenCatalogo("productos", id, archivo);
      setImagenUrl(url);
    } catch {
      setError("No pudimos subir la imagen. Probá de nuevo.");
    } finally {
      setSubiendoImagen(false);
    }
  }

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    const input: ProductoInput = {
      categoria,
      nombre,
      ingredientes,
      precios: {
        simple: Number(precioSimple),
        ...(precioDoble ? { doble: Number(precioDoble) } : {}),
        ...(precioTriple ? { triple: Number(precioTriple) } : {}),
      },
      imagenUrl,
    };
    const errorValidacion = validarProducto(input);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onGuardar(input);
    } catch {
      setError("No pudimos guardar el producto. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarSubmit} className="flex flex-col gap-3">
      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value as Producto["categoria"])}
        className="rounded-md border border-brand-black/20 px-3 py-2"
      >
        {CATEGORIAS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre"
        required
        className="rounded-md border border-brand-black/20 px-3 py-2"
      />
      <textarea
        value={ingredientes}
        onChange={(e) => setIngredientes(e.target.value)}
        placeholder="Ingredientes"
        className="rounded-md border border-brand-black/20 px-3 py-2"
      />
      <div className="flex gap-2">
        <input
          type="number"
          value={precioSimple}
          onChange={(e) => setPrecioSimple(e.target.value)}
          placeholder="Precio simple"
          required
          className="w-full rounded-md border border-brand-black/20 px-3 py-2"
        />
        <input
          type="number"
          value={precioDoble}
          onChange={(e) => setPrecioDoble(e.target.value)}
          placeholder="Precio doble (opcional)"
          className="w-full rounded-md border border-brand-black/20 px-3 py-2"
        />
        <input
          type="number"
          value={precioTriple}
          onChange={(e) => setPrecioTriple(e.target.value)}
          placeholder="Precio triple (opcional)"
          className="w-full rounded-md border border-brand-black/20 px-3 py-2"
        />
      </div>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={manejarSeleccionImagen} />
      {subiendoImagen && <p className="text-sm text-brand-black/60">Subiendo imagen...</p>}
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
