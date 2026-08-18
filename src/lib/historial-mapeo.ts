import type { PedidoConItems } from "./pedidos-mapeo";

export type GrupoHistorial = {
  tipo: "dia" | "semana";
  etiqueta: string;
  total: number;
  pedidos: PedidoConItems[];
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function diferenciaEnDias(a: Date, b: Date): number {
  const unDiaMs = 24 * 60 * 60 * 1000;
  return Math.round((inicioDelDia(a).getTime() - inicioDelDia(b).getTime()) / unDiaMs);
}

function etiquetaDia(fecha: Date): string {
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

function inicioDeSemana(fecha: Date): Date {
  const dia = inicioDelDia(fecha);
  const diaSemana = dia.getDay();
  const offset = diaSemana === 0 ? 6 : diaSemana - 1;
  dia.setDate(dia.getDate() - offset);
  return dia;
}

function etiquetaSemana(inicio: Date): string {
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);
  if (inicio.getMonth() === fin.getMonth()) {
    return `${inicio.getDate()} al ${fin.getDate()} de ${MESES[inicio.getMonth()]}`;
  }
  return `${inicio.getDate()} de ${MESES[inicio.getMonth()]} al ${fin.getDate()} de ${MESES[fin.getMonth()]}`;
}

type GrupoInterno = { tipo: "dia" | "semana"; etiqueta: string; orden: number; pedidos: PedidoConItems[] };

export function agruparHistorial(pedidos: PedidoConItems[], ahora: Date = new Date()): GrupoHistorial[] {
  const grupos = new Map<string, GrupoInterno>();

  for (const pedido of pedidos) {
    const fechaPedido = new Date(pedido.creadoEn);
    const diasAtras = diferenciaEnDias(ahora, fechaPedido);

    if (diasAtras <= 6) {
      const dia = inicioDelDia(fechaPedido);
      const clave = `dia-${dia.getTime()}`;
      if (!grupos.has(clave)) {
        grupos.set(clave, { tipo: "dia", etiqueta: etiquetaDia(dia), orden: dia.getTime(), pedidos: [] });
      }
      grupos.get(clave)!.pedidos.push(pedido);
    } else {
      const inicio = inicioDeSemana(fechaPedido);
      const clave = `semana-${inicio.getTime()}`;
      if (!grupos.has(clave)) {
        grupos.set(clave, { tipo: "semana", etiqueta: etiquetaSemana(inicio), orden: inicio.getTime(), pedidos: [] });
      }
      grupos.get(clave)!.pedidos.push(pedido);
    }
  }

  return Array.from(grupos.values())
    .sort((a, b) => b.orden - a.orden)
    .map(({ tipo, etiqueta, pedidos }) => ({
      tipo,
      etiqueta,
      total: pedidos.reduce((suma, pedido) => suma + pedido.total, 0),
      pedidos,
    }));
}
