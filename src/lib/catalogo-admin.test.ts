import { describe, it, expect } from "vitest";
import { combosQueUsanProducto, validarProducto, validarCombo, validarImagen } from "./catalogo-admin";
import type { Combo } from "@/data/types";
import type { ProductoInput, ComboInput } from "./catalogo-admin";

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

describe("validarProducto", () => {
  const base: ProductoInput = {
    categoria: "clasica",
    nombre: "Cheese Burger",
    ingredientes: "Pan, carne, cheddar",
    precios: { simple: 8500 },
    imagenUrl: "/placeholder.svg",
  };

  it("acepta un producto válido", () => {
    expect(validarProducto(base)).toBeNull();
  });

  it("rechaza nombre vacío", () => {
    expect(validarProducto({ ...base, nombre: "  " })).toBe("El nombre es obligatorio.");
  });

  it("rechaza precio simple en 0", () => {
    expect(validarProducto({ ...base, precios: { simple: 0 } })).toBe("El precio simple debe ser mayor a 0.");
  });
});

describe("validarCombo", () => {
  const base: ComboInput = {
    nombre: "Promo Cheese",
    descripcion: "Cheese + Papas",
    precio: 9000,
    imagenUrl: "/placeholder.svg",
    activo: true,
    productos: [],
  };

  it("acepta un combo válido", () => {
    expect(validarCombo(base)).toBeNull();
  });

  it("rechaza nombre vacío", () => {
    expect(validarCombo({ ...base, nombre: "" })).toBe("El nombre es obligatorio.");
  });

  it("rechaza precio en 0", () => {
    expect(validarCombo({ ...base, precio: 0 })).toBe("El precio debe ser mayor a 0.");
  });
});

describe("validarImagen", () => {
  it("acepta jpg dentro del límite de tamaño", () => {
    const archivo = { type: "image/jpeg", size: 1000 } as File;
    expect(validarImagen(archivo)).toBeNull();
  });

  it("rechaza un tipo no soportado", () => {
    const archivo = { type: "image/gif", size: 1000 } as File;
    expect(validarImagen(archivo)).toBe("La imagen debe ser JPG, PNG o WEBP.");
  });

  it("rechaza un archivo demasiado pesado", () => {
    const archivo = { type: "image/jpeg", size: 6 * 1024 * 1024 } as File;
    expect(validarImagen(archivo)).toBe("La imagen no puede pesar más de 5MB.");
  });
});
