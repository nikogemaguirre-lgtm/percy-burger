"use client";

import { useState } from "react";
import { Producto, Combo } from "@/data/types";
import { ProductosAdmin } from "./ProductosAdmin";
import { CombosAdmin } from "./CombosAdmin";

export function AdminPanel({
  productosIniciales,
  combosIniciales,
}: {
  productosIniciales: Producto[];
  combosIniciales: Combo[];
}) {
  const [productos, setProductos] = useState(productosIniciales);
  const [combos, setCombos] = useState(combosIniciales);

  return (
    <>
      <ProductosAdmin productos={productos} combos={combos} onProductosChange={setProductos} />
      <CombosAdmin combos={combos} productosDisponibles={productos} onCombosChange={setCombos} />
    </>
  );
}
