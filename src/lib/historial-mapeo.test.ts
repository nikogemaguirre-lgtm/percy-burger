import { describe, it, expect } from "vitest";
import { agruparHistorial } from "./historial-mapeo";
import type { PedidoConItems } from "./pedidos-mapeo";

const AHORA = new Date(2026, 7, 17, 15, 0, 0); // lunes 17 de agosto de 2026

function crearPedido(id: string, creadoEn: Date, total: number): PedidoConItems {
  return {
    id,
    estado: "entregado",
    clienteNombre: `Cliente ${id}`,
    clienteTelefono: "0000000000",
    modalidad: "retiro",
    direccion: null,
    zonaNombre: null,
    aCoordinar: false,
    costoEnvio: 0,
    subtotal: total,
    total,
    creadoEn: creadoEn.toISOString(),
    items: [],
  };
}

function haceDias(dias: number, hora: number = 12): Date {
  const fecha = new Date(AHORA);
  fecha.setDate(fecha.getDate() - dias);
  fecha.setHours(hora, 0, 0, 0);
  return fecha;
}

describe("agruparHistorial", () => {
  it("lista vacía devuelve []", () => {
    expect(agruparHistorial([], AHORA)).toEqual([]);
  });

  it("un pedido de hoy cae en un grupo de día con la etiqueta de hoy", () => {
    const pedido = crearPedido("hoy", haceDias(0), 5000);
    const grupos = agruparHistorial([pedido], AHORA);
    expect(grupos).toEqual([{ tipo: "dia", etiqueta: "17 de agosto", total: 5000, pedidos: [pedido] }]);
  });

  it("un pedido de exactamente 6 días atrás todavía es día suelto (último día de la ventana)", () => {
    const pedido = crearPedido("seis", haceDias(6), 3000);
    const grupos = agruparHistorial([pedido], AHORA);
    expect(grupos).toEqual([{ tipo: "dia", etiqueta: "11 de agosto", total: 3000, pedidos: [pedido] }]);
  });

  it("un pedido de exactamente 7 días atrás ya cae en un grupo de semana (primer día fuera de la ventana)", () => {
    const pedido = crearPedido("siete", haceDias(7), 4000);
    const grupos = agruparHistorial([pedido], AHORA);
    expect(grupos).toEqual([{ tipo: "semana", etiqueta: "10 al 16 de agosto", total: 4000, pedidos: [pedido] }]);
  });

  it("varios pedidos del mismo día quedan en un solo grupo con el total sumado", () => {
    const pedidoA = crearPedido("a", haceDias(0, 20), 5000);
    const pedidoB = crearPedido("b", haceDias(0, 10), 3000);
    const grupos = agruparHistorial([pedidoA, pedidoB], AHORA);
    expect(grupos).toEqual([{ tipo: "dia", etiqueta: "17 de agosto", total: 8000, pedidos: [pedidoA, pedidoB] }]);
  });

  it("una semana que cruza de mes etiqueta con los dos nombres de mes", () => {
    const pedido = crearPedido("cruce", haceDias(20), 2000);
    const grupos = agruparHistorial([pedido], AHORA);
    expect(grupos).toEqual([
      { tipo: "semana", etiqueta: "27 de julio al 2 de agosto", total: 2000, pedidos: [pedido] },
    ]);
  });

  it("ordena los grupos del más nuevo al más viejo, preservando el orden de los pedidos dentro de cada grupo", () => {
    const pedidoHoyNuevo = crearPedido("hoy-nuevo", haceDias(0, 20), 1000);
    const pedidoHoyViejo = crearPedido("hoy-viejo", haceDias(0, 10), 1000);
    const pedidoSemana = crearPedido("semana", haceDias(7), 1000);
    const grupos = agruparHistorial([pedidoHoyNuevo, pedidoHoyViejo, pedidoSemana], AHORA);
    expect(grupos.map((g) => g.etiqueta)).toEqual(["17 de agosto", "10 al 16 de agosto"]);
    expect(grupos[0].pedidos).toEqual([pedidoHoyNuevo, pedidoHoyViejo]);
  });
});
