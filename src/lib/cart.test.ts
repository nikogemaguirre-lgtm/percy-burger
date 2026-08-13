import { describe, it, expect } from "vitest";
import { agregarItem, quitarItem, actualizarCantidad, calcularSubtotal, ItemCarrito } from "./cart";

const cheeseSimple: ItemCarrito = {
  id: "cheese-burger-simple",
  nombre: "Cheese Burger (Simple)",
  tamaño: "simple",
  precioUnitario: 8500,
  cantidad: 1,
};

const papas: ItemCarrito = {
  id: "papas",
  nombre: "Papas",
  precioUnitario: 3500,
  cantidad: 1,
};

describe("agregarItem", () => {
  it("agrega un item nuevo al carrito vacío", () => {
    const resultado = agregarItem([], cheeseSimple);
    expect(resultado).toEqual([cheeseSimple]);
  });

  it("suma la cantidad si el item ya existe", () => {
    const resultado = agregarItem([cheeseSimple], { ...cheeseSimple, cantidad: 2 });
    expect(resultado).toEqual([{ ...cheeseSimple, cantidad: 3 }]);
  });
});

describe("quitarItem", () => {
  it("elimina el item con el id indicado", () => {
    const resultado = quitarItem([cheeseSimple, papas], "papas");
    expect(resultado).toEqual([cheeseSimple]);
  });
});

describe("actualizarCantidad", () => {
  it("actualiza la cantidad de un item existente", () => {
    const resultado = actualizarCantidad([cheeseSimple], "cheese-burger-simple", 5);
    expect(resultado[0].cantidad).toBe(5);
  });

  it("elimina el item si la cantidad baja a 0 o menos", () => {
    const resultado = actualizarCantidad([cheeseSimple], "cheese-burger-simple", 0);
    expect(resultado).toEqual([]);
  });
});

describe("calcularSubtotal", () => {
  it("suma precio unitario por cantidad de cada item", () => {
    const subtotal = calcularSubtotal([cheeseSimple, { ...papas, cantidad: 2 }]);
    expect(subtotal).toBe(8500 + 3500 * 2);
  });

  it("devuelve 0 para un carrito vacío", () => {
    expect(calcularSubtotal([])).toBe(0);
  });
});
