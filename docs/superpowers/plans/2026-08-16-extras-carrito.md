# Agregar extras desde el carrito — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir agregar Papas, Salsas y Bebida directamente desde la página `/carrito`, sin volver al menú principal.

**Architecture:** Se filtra el array `productos` ya existente (`src/data/menu.ts`) por categoría `"extra"`/`"bebida"` y se renderiza con el componente `ProductoCard` ya existente, dentro de una sección nueva en `src/app/carrito/page.tsx`. Sin datos ni componentes nuevos, sin cambios a `CartContext`/`lib/cart.ts`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.

## Global Constraints

- No se modifica `src/lib/cart.ts`, `src/context/CartContext.tsx` ni `src/lib/whatsapp.ts` — la spec descarta cambios ahí explícitamente.
- Los productos mostrados son únicamente los de categoría `"extra"` y `"bebida"` de `src/data/menu.ts` (Papas, Dip Salsa Smash, Dip Salsa Tasty, Gaseosa 500ml).
- Grilla `grid-cols-1 sm:grid-cols-2` (no `lg:grid-cols-3` como en la página principal, porque `/carrito` es `max-w-2xl`).
- Sin tests automatizados nuevos — verificación manual en navegador, consistente con el criterio ya usado para `Resenas.tsx`/`Ubicacion.tsx`.

---

### Task 1: Sección "¿Querés agregar algo más?" en `/carrito`

**Files:**
- Modify: `src/app/carrito/page.tsx`

**Interfaces:**
- Consumes: `productos` (`Producto[]`) de `@/data/menu` (ya existente); `ProductoCard` de `@/components/ProductoCard` (ya existente, props `{ producto: Producto }`).

- [ ] **Step 1: Agregar el import de `productos` y `ProductoCard`**

En `src/app/carrito/page.tsx`, agregar arriba de `formatearPrecio`:

```tsx
import { productos } from "@/data/menu";
import { ProductoCard } from "@/components/ProductoCard";
```

- [ ] **Step 2: Filtrar los productos de extras/bebidas dentro del componente**

Dentro de `CarritoPage`, justo debajo de la línea `const { items, subtotal, actualizarCantidad, quitar } = useCart();`, agregar:

```tsx
  const productosExtra = productos.filter((p) => p.categoria === "extra" || p.categoria === "bebida");
```

- [ ] **Step 3: Insertar la sección entre la lista de ítems y el subtotal**

Reemplazar:

```tsx
      </ul>
      <div className="mb-6 flex items-center justify-between text-lg font-bold text-brand-black">
```

por:

```tsx
      </ul>
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-brand-black">¿Querés agregar algo más?</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {productosExtra.map((producto) => (
            <ProductoCard key={producto.id} producto={producto} />
          ))}
        </div>
      </section>
      <div className="mb-6 flex items-center justify-between text-lg font-bold text-brand-black">
```

- [ ] **Step 4: Verificar que el proyecto compila (typecheck)**

Run: `npx tsc --noEmit`
Expected: sin errores (exit code 0).

- [ ] **Step 5: Levantar el sitio en desarrollo y verificar en el navegador**

Run: `npm run dev`

En el navegador: agregar una hamburguesa desde `/`, ir a `/carrito`, confirmar que aparece "¿Querés agregar algo más?" con los 4 productos (Papas, Dip Salsa Smash, Dip Salsa Tasty, Gaseosa 500ml) en grilla de 2 columnas. Tocar "Agregar" en Papas y en Gaseosa, confirmar que ambos aparecen en la lista de arriba y que el subtotal se actualiza correctamente.

- [ ] **Step 6: Build final**

Run: `npx tsc --noEmit && npm run build`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/app/carrito/page.tsx
git commit -m "feat: permitir agregar extras y bebidas desde el carrito"
```

---

## Self-Review

**Spec coverage:** sección "¿Querés agregar algo más?" con productos de `extra`/`bebida` (Steps 1-3) ✓, reuso de `ProductoCard` sin cambios a carrito/lib (Steps 1-3) ✓, verificación manual de que se suman al carrito y al subtotal (Step 5) ✓, sin tests automatizados nuevos ✓. Nada fuera de este alcance (modificadores por producto, cambios a checkout/WhatsApp) quedó afuera del plan, como corresponde.

**Placeholder scan:** sin TBD/TODO, código completo en cada paso.

**Type consistency:** `ProductoCard` recibe `producto: Producto` igual que en `src/app/page.tsx` — mismo tipo, mismo uso.
