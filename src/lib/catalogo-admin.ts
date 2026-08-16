import type { Combo } from "@/data/types";

export function combosQueUsanProducto(combos: Combo[], productoId: string): Combo[] {
  return combos.filter((combo) => combo.productos.some((item) => item.productoId === productoId));
}
