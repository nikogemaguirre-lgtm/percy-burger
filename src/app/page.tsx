import { productos } from "@/data/menu";
import { combos } from "@/data/combos";
import { ProductoCard } from "@/components/ProductoCard";
import { ComboCard } from "@/components/ComboCard";
import { Hero } from "@/components/Hero";
import { Ubicacion } from "@/components/Ubicacion";
import { Producto } from "@/data/types";

const CATEGORIAS: { key: Producto["categoria"]; titulo: string }[] = [
  { key: "clasica", titulo: "Burgers clásicas" },
  { key: "especial", titulo: "Especiales" },
  { key: "extra", titulo: "Extras" },
  { key: "bebida", titulo: "Bebidas" },
];

export default function Home() {
  const combosActivos = combos.filter((c) => c.activo);

  return (
    <>
      <Hero />
      <main className="mx-auto max-w-5xl px-4 py-8">
      {combosActivos.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold text-brand-black">Promos</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {combosActivos.map((combo) => (
              <ComboCard key={combo.id} combo={combo} />
            ))}
          </div>
        </section>
      )}
      {CATEGORIAS.map(({ key, titulo }) => {
        const productosCategoria = productos.filter((p) => p.categoria === key);
        if (productosCategoria.length === 0) return null;
        return (
          <section key={key} className="mb-10">
            <h2 className="mb-4 text-2xl font-bold text-brand-black">{titulo}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {productosCategoria.map((producto) => (
                <ProductoCard key={producto.id} producto={producto} />
              ))}
            </div>
          </section>
        );
      })}
      </main>
      <Ubicacion />
    </>
  );
}
