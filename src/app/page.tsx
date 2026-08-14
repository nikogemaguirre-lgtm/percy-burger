import { productos } from "@/data/menu";
import { ProductoCard } from "@/components/ProductoCard";
import { Producto } from "@/data/types";

const CATEGORIAS: { key: Producto["categoria"]; titulo: string }[] = [
  { key: "clasica", titulo: "Burgers clásicas" },
  { key: "especial", titulo: "Especiales" },
  { key: "extra", titulo: "Extras" },
  { key: "bebida", titulo: "Bebidas" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
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
  );
}
