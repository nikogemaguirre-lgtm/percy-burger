export type Tamaño = "simple" | "doble" | "triple";

export interface Producto {
  id: string;
  categoria: "clasica" | "especial" | "extra" | "bebida";
  nombre: string;
  ingredientes: string;
  precios: Partial<Record<Tamaño, number>> & { simple: number };
  imagenUrl: string;
}

export interface Combo {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagenUrl: string;
  activo: boolean;
}

export interface Zona {
  id: string;
  nombre: string;
  costoEnvio: number;
}

export interface LogoPieza {
  id: string;
  archivo: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
