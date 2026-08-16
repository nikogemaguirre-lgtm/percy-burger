# Aclaraciones por producto en el carrito — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que el cliente escriba una aclaración de texto libre por producto (ej. "sin cebolla") en `/carrito`, y que esa aclaración se incluya en el mensaje de WhatsApp del pedido.

**Architecture:** Campo opcional `nota` en `ItemCarrito`, actualizado mediante una función pura nueva en `src/lib/cart.ts` y expuesta por `CartContext`. Input de texto por ítem en `src/app/carrito/page.tsx`. `construirTextoPedido` en `src/lib/whatsapp.ts` agrega una línea extra por producto cuando hay `nota`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Vitest.

## Global Constraints

- La nota es por línea de carrito (por producto), no por unidad individual — mismo criterio que la cantidad.
- Sin nota, el comportamiento y el texto generado deben ser idénticos a los actuales (no romper pedidos sin aclaraciones).
- Sin validación ni límite de caracteres en el campo de texto.
- No se toca `/checkout` — la lista de productos sigue viviendo solo en `/carrito`.

---

### Task 1: `actualizarNota` en `src/lib/cart.ts`

**Files:**
- Modify: `src/lib/cart.ts`
- Test: `src/lib/cart.test.ts`

**Interfaces:**
- Produces: `ItemCarrito.nota?: string`; `actualizarNota(carrito: ItemCarrito[], id: string, nota: string): ItemCarrito[]`.

- [ ] **Step 1: Escribir el test que falla**

Agregar a `src/lib/cart.test.ts`, después del `describe("actualizarCantidad", ...)`:

```ts
describe("actualizarNota", () => {
  it("actualiza la nota de un item existente", () => {
    const resultado = actualizarNota([cheeseSimple], "cheese-burger-simple", "sin cebolla");
    expect(resultado[0].nota).toBe("sin cebolla");
  });

  it("no afecta a otros items del carrito", () => {
    const resultado = actualizarNota([cheeseSimple, papas], "cheese-burger-simple", "sin cebolla");
    expect(resultado[1]).toEqual(papas);
  });
});
```

Y actualizar el import de la primera línea del archivo para incluir `actualizarNota`:

```ts
import { agregarItem, quitarItem, actualizarCantidad, actualizarNota, calcularSubtotal, ItemCarrito } from "./cart";
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npx vitest run src/lib/cart.test.ts`
Expected: FAIL — `actualizarNota` no está exportado por `./cart`.

- [ ] **Step 3: Implementar `actualizarNota` en `src/lib/cart.ts`**

Agregar el campo `nota` a la interfaz:

```ts
export interface ItemCarrito {
  id: string;
  nombre: string;
  tamaño?: Tamaño;
  precioUnitario: number;
  cantidad: number;
  nota?: string;
}
```

Y la función nueva, debajo de `actualizarCantidad`:

```ts
export function actualizarNota(carrito: ItemCarrito[], id: string, nota: string): ItemCarrito[] {
  return carrito.map((i) => (i.id === id ? { ...i, nota } : i));
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npx vitest run src/lib/cart.test.ts`
Expected: PASS (todos los tests del archivo, incluidos los ya existentes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cart.ts src/lib/cart.test.ts
git commit -m "feat: agregar nota opcional por ítem del carrito"
```

---

### Task 2: Exponer `actualizarNota` en `CartContext` e input en `/carrito`

**Files:**
- Modify: `src/context/CartContext.tsx`
- Modify: `src/app/carrito/page.tsx`

**Interfaces:**
- Consumes: `actualizarNota` de `@/lib/cart` (Task 1).
- Produces: `CartContextValue.actualizarNota(id: string, nota: string): void`, consumido por `src/app/carrito/page.tsx`.

- [ ] **Step 1: Agregar `actualizarNota` a `CartContext`**

En `src/context/CartContext.tsx`, actualizar el import:

```ts
import {
  ItemCarrito,
  agregarItem,
  quitarItem,
  actualizarCantidad,
  actualizarNota,
  calcularSubtotal,
} from "@/lib/cart";
```

Agregar a la interfaz `CartContextValue`:

```ts
  actualizarNota: (id: string, nota: string) => void;
```

Y a la implementación de `value`, junto a `actualizarCantidad`:

```ts
    actualizarNota: (id, nota) => setItems((actuales) => actualizarNota(actuales, id, nota)),
```

- [ ] **Step 2: Reestructurar el `<li>` de cada ítem en `src/app/carrito/page.tsx` para sumar el input**

Traer `actualizarNota` del hook:

```tsx
  const { items, subtotal, actualizarCantidad, actualizarNota, quitar } = useCart();
```

Reemplazar el bloque completo de cada `<li>`:

```tsx
          <li
            key={item.id}
            className="flex items-center justify-between gap-4 border-b border-brand-black/10 pb-4"
          >
            <div>
              <p className="font-semibold text-brand-black">{item.nombre}</p>
              <p className="text-sm text-brand-black/60">{formatearPrecio(item.precioUnitario)} c/u</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                className="h-8 w-8 rounded-full border border-brand-black/20 text-brand-black"
                aria-label={`Quitar una unidad de ${item.nombre}`}
              >
                −
              </button>
              <span className="w-6 text-center">{item.cantidad}</span>
              <button
                type="button"
                onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                className="h-8 w-8 rounded-full border border-brand-black/20 text-brand-black"
                aria-label={`Agregar una unidad de ${item.nombre}`}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => quitar(item.id)}
                className="ml-2 text-sm text-brand-red underline"
              >
                Quitar
              </button>
            </div>
          </li>
```

por:

```tsx
          <li key={item.id} className="border-b border-brand-black/10 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-brand-black">{item.nombre}</p>
                <p className="text-sm text-brand-black/60">{formatearPrecio(item.precioUnitario)} c/u</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                  className="h-8 w-8 rounded-full border border-brand-black/20 text-brand-black"
                  aria-label={`Quitar una unidad de ${item.nombre}`}
                >
                  −
                </button>
                <span className="w-6 text-center">{item.cantidad}</span>
                <button
                  type="button"
                  onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                  className="h-8 w-8 rounded-full border border-brand-black/20 text-brand-black"
                  aria-label={`Agregar una unidad de ${item.nombre}`}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => quitar(item.id)}
                  className="ml-2 text-sm text-brand-red underline"
                >
                  Quitar
                </button>
              </div>
            </div>
            <input
              type="text"
              value={item.nota ?? ""}
              onChange={(e) => actualizarNota(item.id, e.target.value)}
              placeholder="Aclaraciones (opcional) — ej. sin cebolla"
              className="mt-2 w-full rounded-md border border-brand-black/20 px-3 py-1 text-sm"
            />
          </li>
```

- [ ] **Step 3: Verificar que el proyecto compila (typecheck)**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Levantar el sitio y verificar en el navegador**

Run: `npm run dev`

En el navegador: agregar un producto desde `/`, ir a `/carrito`, escribir "sin cebolla" en el input de aclaraciones de ese ítem, recargar la página y confirmar que el texto persiste (queda guardado en `localStorage` vía `CartContext`).

- [ ] **Step 5: Commit**

```bash
git add src/context/CartContext.tsx src/app/carrito/page.tsx
git commit -m "feat: agregar campo de aclaraciones por ítem en /carrito"
```

---

### Task 3: Incluir la nota en el mensaje de WhatsApp

**Files:**
- Modify: `src/lib/whatsapp.ts`
- Test: `src/lib/whatsapp.test.ts`

**Interfaces:**
- Consumes: `ItemCarrito.nota` (Task 1).

- [ ] **Step 1: Escribir el test que falla**

Agregar a `src/lib/whatsapp.test.ts`, dentro de `describe("construirTextoPedido", ...)`:

```ts
  it("agrega una línea de aclaración debajo del item cuando tiene nota", () => {
    const itemsConNota: ItemCarrito[] = [{ ...items[0], nota: "sin cebolla" }];
    const texto = construirTextoPedido(itemsConNota, 17000, 0, {
      nombre: "Juan",
      telefono: "2611234567",
      modalidad: "retiro",
    });

    expect(texto).toContain("2x Cheese Burger (Simple) — $17.000\n  (sin cebolla)");
  });

  it("no agrega línea de aclaración cuando el item no tiene nota", () => {
    const texto = construirTextoPedido(items, 17000, 0, {
      nombre: "Juan",
      telefono: "2611234567",
      modalidad: "retiro",
    });

    expect(texto).not.toContain("(sin cebolla)");
    expect(texto).toContain("2x Cheese Burger (Simple) — $17.000\n");
  });
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npx vitest run src/lib/whatsapp.test.ts`
Expected: FAIL — el primer test nuevo, porque `construirTextoPedido` todavía no agrega la línea de nota.

- [ ] **Step 3: Implementar el cambio en `construirTextoPedido`**

En `src/lib/whatsapp.ts`, reemplazar:

```ts
  const lineasItems = items
    .map((item) => `- ${item.cantidad}x ${item.nombre} — ${formatearPrecio(item.precioUnitario * item.cantidad)}`)
    .join("\n");
```

por:

```ts
  const lineasItems = items
    .map((item) => {
      const linea = `- ${item.cantidad}x ${item.nombre} — ${formatearPrecio(item.precioUnitario * item.cantidad)}`;
      return item.nota ? `${linea}\n  (${item.nota})` : linea;
    })
    .join("\n");
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npx vitest run src/lib/whatsapp.test.ts`
Expected: PASS (todos los tests del archivo, incluidos los ya existentes).

- [ ] **Step 5: Verificación manual end-to-end en el navegador**

Con `npm run dev` corriendo: agregar un producto, escribir una aclaración en `/carrito`, ir a `/checkout`, completar nombre/teléfono y elegir "Retiro en el local", tocar "Enviar pedido por WhatsApp" y confirmar (antes de enviarlo de verdad) que la URL de `wa.me` generada contiene el texto de la aclaración debajo del producto correspondiente — se puede inspeccionar con las devtools el `href` del botón antes de hacer click, o revisar la pestaña de WhatsApp Web que se abre.

- [ ] **Step 6: Typecheck y build final**

Run: `npx tsc --noEmit && npm run build`
Expected: sin errores.

- [ ] **Step 7: Correr toda la suite de tests**

Run: `npm test`
Expected: todos los tests pasan (los ya existentes + los nuevos de `cart.test.ts` y `whatsapp.test.ts`).

- [ ] **Step 8: Commit**

```bash
git add src/lib/whatsapp.ts src/lib/whatsapp.test.ts
git commit -m "feat: incluir aclaraciones por producto en el mensaje de WhatsApp"
```

---

## Self-Review

**Spec coverage:** campo `nota` + `actualizarNota` en `cart.ts` (Task 1) ✓, wiring en `CartContext` + input en `/carrito` (Task 2) ✓, línea de aclaración en `construirTextoPedido` (Task 3) ✓, comportamiento idéntico sin nota verificado con test explícito (Task 3, segundo test nuevo) ✓, verificación manual end-to-end del flujo completo carrito → checkout → WhatsApp (Task 3, Step 5) ✓. Nada de checkboxes de ingredientes, límites de caracteres ni cambios a `/checkout` — fuera de alcance como en la spec.

**Placeholder scan:** sin TBD/TODO, código completo en cada paso.

**Type consistency:** `ItemCarrito.nota?: string` (Task 1) usado igual en `CartContext.actualizarNota(id: string, nota: string): void` (Task 2) y en `item.nota` dentro de `construirTextoPedido` (Task 3) — consistente en los tres archivos.
