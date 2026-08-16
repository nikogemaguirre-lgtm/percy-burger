import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Combo } from "@/data/types";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("./supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ from: mockFrom }),
}));

import {
  combosQueUsanProducto,
  validarProducto,
  validarCombo,
  validarImagen,
  crearProducto,
  actualizarProducto,
  borrarProducto,
  type ProductoInput,
  type ComboInput,
} from "./catalogo-admin";

beforeEach(() => {
  mockFrom.mockReset();
});

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

describe("crearProducto", () => {
  it("inserta el producto y devuelve el resultado mapeado", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "papas-fritas",
        categoria: "extra",
        nombre: "Papas Fritas",
        ingredientes: "Porción grande",
        precio_simple: 4000,
        precio_doble: null,
        precio_triple: null,
        imagen_url: "/placeholder.svg",
      },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    mockFrom.mockReturnValue({ insert });

    const input: ProductoInput = {
      categoria: "extra",
      nombre: "Papas Fritas",
      ingredientes: "Porción grande",
      precios: { simple: 4000 },
      imagenUrl: "/placeholder.svg",
    };

    const resultado = await crearProducto(input);

    expect(mockFrom).toHaveBeenCalledWith("productos");
    expect(insert).toHaveBeenCalledWith({
      categoria: "extra",
      nombre: "Papas Fritas",
      ingredientes: "Porción grande",
      precio_simple: 4000,
      precio_doble: null,
      precio_triple: null,
      imagen_url: "/placeholder.svg",
    });
    expect(resultado).toEqual({
      id: "papas-fritas",
      categoria: "extra",
      nombre: "Papas Fritas",
      ingredientes: "Porción grande",
      precios: { simple: 4000 },
      imagenUrl: "/placeholder.svg",
    });
  });

  it("lanza un error si Supabase devuelve error", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "duplicate key" } });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    mockFrom.mockReturnValue({ insert });

    const input: ProductoInput = {
      categoria: "extra",
      nombre: "Papas Fritas",
      ingredientes: "Porción grande",
      precios: { simple: 4000 },
      imagenUrl: "/placeholder.svg",
    };

    await expect(crearProducto(input)).rejects.toThrow("duplicate key");
  });
});

describe("actualizarProducto", () => {
  it("actualiza el producto y devuelve el resultado mapeado", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "papas",
        categoria: "extra",
        nombre: "Papas Grandes",
        ingredientes: "Porción grande",
        precio_simple: 4500,
        precio_doble: null,
        precio_triple: null,
        imagen_url: "/placeholder.svg",
      },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ update });

    const input: ProductoInput = {
      categoria: "extra",
      nombre: "Papas Grandes",
      ingredientes: "Porción grande",
      precios: { simple: 4500 },
      imagenUrl: "/placeholder.svg",
    };

    const resultado = await actualizarProducto("papas", input);

    expect(mockFrom).toHaveBeenCalledWith("productos");
    expect(update).toHaveBeenCalledWith({
      categoria: "extra",
      nombre: "Papas Grandes",
      ingredientes: "Porción grande",
      precio_simple: 4500,
      precio_doble: null,
      precio_triple: null,
      imagen_url: "/placeholder.svg",
    });
    expect(eq).toHaveBeenCalledWith("id", "papas");
    expect(resultado.nombre).toBe("Papas Grandes");
  });
});

describe("borrarProducto", () => {
  it("borra el producto por id", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ delete: del });

    await borrarProducto("papas");

    expect(mockFrom).toHaveBeenCalledWith("productos");
    expect(eq).toHaveBeenCalledWith("id", "papas");
  });

  it("lanza un error si Supabase lo rechaza (ej. restricción de combo)", async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: "violates foreign key constraint" } });
    const del = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ delete: del });

    await expect(borrarProducto("papas")).rejects.toThrow("violates foreign key constraint");
  });
});
