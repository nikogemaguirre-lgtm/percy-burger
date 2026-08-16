import { obtenerProductos } from "@/lib/catalogo";
import { CarritoContenido } from "./CarritoContenido";

export default async function CarritoPage() {
  const productos = await obtenerProductos();
  const productosExtra = productos.filter((p) => p.categoria === "extra" || p.categoria === "bebida");
  return <CarritoContenido productosExtra={productosExtra} />;
}
