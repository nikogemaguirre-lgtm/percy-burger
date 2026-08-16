import { createClient } from "@supabase/supabase-js";
import { productos } from "../src/data/menu";
import { combos } from "../src/data/combos";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
}

const supabase = createClient(url, serviceRoleKey);

async function migrar() {
  const filasProductos = productos.map((p) => ({
    id: p.id,
    categoria: p.categoria,
    nombre: p.nombre,
    ingredientes: p.ingredientes,
    precio_simple: p.precios.simple,
    precio_doble: p.precios.doble ?? null,
    precio_triple: p.precios.triple ?? null,
    imagen_url: p.imagenUrl,
  }));

  const { error: errorProductos } = await supabase.from("productos").insert(filasProductos);
  if (errorProductos) throw new Error(`Error insertando productos: ${errorProductos.message}`);
  console.log(`${filasProductos.length} productos migrados.`);

  const filasCombos = combos.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    precio: c.precio,
    imagen_url: c.imagenUrl,
    activo: c.activo,
  }));

  const { error: errorCombos } = await supabase.from("combos").insert(filasCombos);
  if (errorCombos) throw new Error(`Error insertando combos: ${errorCombos.message}`);
  console.log(`${filasCombos.length} combos migrados.`);
}

migrar();
