import { describe, it, expect } from "vitest";
import { combosQueUsanProducto } from "./catalogo-admin";
import type { Combo } from "@/data/types";

describe("combosQueUsanProducto", () => {
  const combos: Combo[] = [
    {
      id: "promo-1",
      nombre: "Promo 1",
      descripcion: "",
      precio: 1000,
      imagenUrl: "",
      activo: true,
      productos: [{ productoId: "cheese-burger", cantidad: 1 }],
    },
    {
      id: "promo-2",
      nombre: "Promo 2",
      descripcion: "",
      precio: 1000,
      imagenUrl: "",
      activo: true,
      productos: [{ productoId: "papas", cantidad: 1 }],
    },
  ];

  it("devuelve los combos que incluyen el producto", () => {
    expect(combosQueUsanProducto(combos, "cheese-burger")).toEqual([combos[0]]);
  });

  it("devuelve un arreglo vacío si ningún combo lo usa", () => {
    expect(combosQueUsanProducto(combos, "bebida-cola")).toEqual([]);
  });
});
