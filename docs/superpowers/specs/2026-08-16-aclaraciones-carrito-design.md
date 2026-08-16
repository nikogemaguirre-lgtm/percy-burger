# Percy Burger — Aclaraciones por producto (sin tal ingrediente)

Fecha: 2026-08-16
Estado: aprobado

## Contexto

Nicolás pidió que, a la hora de armar el pedido, el cliente pueda indicar que no quiere algún ingrediente o salsa en un producto (ej. "sin cebolla", "sin salsa"). Hoy no existe ningún campo de texto libre en el flujo de carrito/checkout — el pedido que llega a Percy por WhatsApp solo tiene nombre de producto, cantidad y precio.

La página `/checkout` (`src/app/checkout/page.tsx`) no renderiza la lista de productos — solo pide datos de entrega y pago. Los ítems ya se listan en `/carrito` (`src/app/carrito/page.tsx`), con nombre, precio, controles de cantidad y el botón "Quitar" (ver también el spec previo de esta misma sesión, `2026-08-16-agregar-extras-carrito-design.md`, que ya suma una sección ahí). Por eso el campo de aclaraciones se agrega en `/carrito`, junto a cada ítem, y no en `/checkout`.

## Alcance

**Incluye:**
- Campo `nota?: string` opcional en `ItemCarrito` (`src/lib/cart.ts`).
- Función pura `actualizarNota(carrito: ItemCarrito[], id: string, nota: string): ItemCarrito[]` en `src/lib/cart.ts`, que actualiza la nota del ítem con ese id (sin afectar cantidad ni el resto de los campos).
- Método `actualizarNota(id: string, nota: string): void` en `CartContext` (`src/context/CartContext.tsx`), siguiendo el mismo patrón que `actualizarCantidad`/`quitar`.
- Input de texto por ítem en `src/app/carrito/page.tsx`, debajo del nombre/precio de cada producto ya listado, con placeholder `"Aclaraciones (opcional) — ej. sin cebolla"`.
- En `construirTextoPedido` (`src/lib/whatsapp.ts`), agregar una línea extra debajo del producto cuando tiene `nota` no vacía.

**Explícitamente fuera de alcance:**
- Checkboxes o lista estructurada de ingredientes por producto — la nota es texto libre, no se parsea ni valida contra los ingredientes reales del producto.
- Aclaraciones por unidad individual dentro de una misma línea de carrito (ej. "de estas 2, una sin cebolla") — la nota es una sola por línea de carrito, igual que la cantidad.
- Cualquier cambio a `/checkout` — esa página sigue sin mostrar la lista de productos, solo los datos de entrega/pago que ya pide hoy.
- Límite de caracteres o validación del texto de la nota — campo de texto libre simple, sin restricciones.

## Modelo de datos

`src/lib/cart.ts`:

```ts
export interface ItemCarrito {
  id: string;
  nombre: string;
  tamaño?: Tamaño;
  precioUnitario: number;
  cantidad: number;
  nota?: string;
}

export function actualizarNota(carrito: ItemCarrito[], id: string, nota: string): ItemCarrito[] {
  return carrito.map((i) => (i.id === id ? { ...i, nota } : i));
}
```

`agregarItem` no cambia: si un producto ya está en el carrito y se vuelve a agregar desde el menú, se suma la cantidad y se conserva la nota que ya tenía esa línea (el nuevo `item` que llega desde `ProductoCard` nunca trae `nota`, así que el spread `{ ...i, cantidad: ... }` ya la preserva sin cambios adicionales).

## `CartContext`

Se agrega `actualizarNota` a `CartContextValue` y a su implementación, mismo patrón que las acciones existentes:

```ts
actualizarNota: (id: string, nota: string): void
```

```ts
actualizarNota: (id, nota) => setItems((actuales) => actualizarNota(actuales, id, nota)),
```

## UI en `/carrito`

Debajo del bloque `nombre` + `precioUnitario c/u` de cada `<li>`, se agrega:

```tsx
<input
  type="text"
  value={item.nota ?? ""}
  onChange={(e) => actualizarNota(item.id, e.target.value)}
  placeholder="Aclaraciones (opcional) — ej. sin cebolla"
  className="mt-2 w-full rounded-md border border-brand-black/20 px-3 py-1 text-sm"
/>
```

Es un input controlado directo contra el `CartContext` (mismo patrón reactivo que ya usan cantidad/quitar) — cada cambio de tecla actualiza el estado del carrito y dispara el guardado a `localStorage` que ya existe en `CartProvider`, sin debounce adicional (consistente con la simplicidad del resto del carrito).

## Mensaje de WhatsApp

En `construirTextoPedido`, la línea de cada ítem pasa de una sola línea a una o dos según tenga nota:

```ts
const lineasItems = items
  .map((item) => {
    const linea = `- ${item.cantidad}x ${item.nombre} — ${formatearPrecio(item.precioUnitario * item.cantidad)}`;
    return item.nota ? `${linea}\n  (${item.nota})` : linea;
  })
  .join("\n");
```

Sin nota, el texto generado es idéntico al actual — no rompe ningún pedido existente sin aclaraciones.

## Testing

- `src/lib/cart.test.ts`: tests nuevos para `actualizarNota` (actualiza la nota de un item existente; no afecta a otros items del carrito).
- `src/lib/whatsapp.test.ts`: test nuevo que confirma que un item con `nota` agrega la línea `(nota)` debajo del item en el texto generado, y que un item sin `nota` no agrega esa línea (evita regresión en los tests ya existentes, que no pasan `nota`).
- Verificación visual manual en el navegador: agregar un producto, escribir una aclaración en `/carrito`, ir a `/checkout`, completar el formulario y confirmar que el link de WhatsApp generado incluye la aclaración debajo del producto correspondiente.
