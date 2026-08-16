import { describe, it, expect } from "vitest";
import { mapRowAProducto, mapRowACombo, ProductoRow, ComboRow } from "./catalogo";

describe("mapRowAProducto", () => {
  it("mapea una fila con los tres tamaños de precio", () => {
    const row: ProductoRow = {
      id: "cheese-burger",
      categoria: "clasica",
      nombre: "Cheese Burger",
      ingredientes: "Pan de papa, carne, cheddar, salsa smash",
      precio_simple: 8500,
      precio_doble: 10000,
      precio_triple: 11500,
      imagen_url: "/productos/cheese-burger.jpg",
    };

    expect(mapRowAProducto(row)).toEqual({
      id: "cheese-burger",
      categoria: "clasica",
      nombre: "Cheese Burger",
      ingredientes: "Pan de papa, carne, cheddar, salsa smash",
      precios: { simple: 8500, doble: 10000, triple: 11500 },
      imagenUrl: "/productos/cheese-burger.jpg",
    });
  });

  it("mapea una fila que solo tiene precio simple", () => {
    const row: ProductoRow = {
      id: "papas",
      categoria: "extra",
      nombre: "Papas",
      ingredientes: "Porción individual",
      precio_simple: 3500,
      precio_doble: null,
      precio_triple: null,
      imagen_url: "/placeholder.svg",
    };

    expect(mapRowAProducto(row)).toEqual({
      id: "papas",
      categoria: "extra",
      nombre: "Papas",
      ingredientes: "Porción individual",
      precios: { simple: 3500 },
      imagenUrl: "/placeholder.svg",
    });
  });
});

describe("mapRowACombo", () => {
  it("mapea una fila de combo", () => {
    const row: ComboRow = {
      id: "promo-cheese-doble",
      nombre: "Promo Cheese Doble",
      descripcion: "Cheese Burger Doble + Papas + Gaseosa 500ml",
      precio: 11000,
      imagen_url: "/productos/promo-cheese-doble.jpg",
      activo: true,
    };

    expect(mapRowACombo(row)).toEqual({
      id: "promo-cheese-doble",
      nombre: "Promo Cheese Doble",
      descripcion: "Cheese Burger Doble + Papas + Gaseosa 500ml",
      precio: 11000,
      imagenUrl: "/productos/promo-cheese-doble.jpg",
      activo: true,
    });
  });
});
