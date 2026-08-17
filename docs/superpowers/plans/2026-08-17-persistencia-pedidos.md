# Persistencia de pedidos (sub-proyecto A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el checkout público guarde cada pedido en Supabase (tablas `pedidos`/`pedido_items`) sin cambiar el flujo visible del cliente, como base para los sub-proyectos B (vista desktop de gestión) y C (vista mobile).

**Architecture:** Función pura de mapeo (`construirFilaPedido`) separada de la mutación (`guardarPedido`), que usa `supabase-js` client-side igual que el resto del panel, pero con la garantía de que **nunca lanza** — el checkout jamás debe bloquearse por un fallo de guardado.

**Tech Stack:** Next.js 16 (App Router), React 19, `@supabase/supabase-js` + `@supabase/ssr`, Vitest.

## Global Constraints

- `guardarPedido` no debe lanzar bajo ninguna circunstancia — cualquier error se atrapa internamente.
- El pedido se guarda como **snapshot** (nombre, precio unitario, cantidad, nota tal como estaban en el carrito), sin `producto_id`/`combo_id` de referencia.
- RLS: inserción pública en `pedidos`/`pedido_items`, lectura/actualización solo para el usuario autenticado.
- Este sub-proyecto no incluye ninguna pantalla que lea pedidos — eso es el sub-proyecto B.
- Commits directos a `main`, sin branch separado — convención ya establecida en este proyecto.

---

### Task 1: Preparar tablas en Supabase

**Files:**
- Create: `scripts/verificar-pedidos.ts` (temporal — se borra en el Step 6 de esta misma tarea)
- Modify: `package.json` (agrega y luego quita el script `verificar-pedidos`)

**Interfaces:**
- Consumes: nada (primera tarea).
- Produces: tablas `pedidos` y `pedido_items` existiendo en Supabase — precondición de la que dependen las Tasks 3 y 4.

- [ ] **Step 1: Pedirle a Nicolás que corra el SQL en el SQL Editor de Supabase**

Este SQL ya está documentado en `docs/superpowers/specs/2026-08-17-persistencia-pedidos-design.md`. Pedirle a Nicolás que entre al SQL Editor de su proyecto en Supabase y corra:

```sql
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  estado text not null default 'nuevo' check (estado in ('nuevo','en_preparacion','listo','entregado')),
  cliente_nombre text not null,
  cliente_telefono text not null,
  modalidad text not null check (modalidad in ('delivery','retiro')),
  direccion text,
  zona_nombre text,
  a_coordinar boolean not null default false,
  costo_envio numeric not null default 0,
  subtotal numeric not null,
  total numeric not null,
  creado_en timestamptz not null default now()
);

alter table pedidos enable row level security;

drop policy if exists "pedidos inserción pública" on pedidos;
create policy "pedidos inserción pública" on pedidos
  for insert with check (true);

drop policy if exists "pedidos lectura autenticada" on pedidos;
create policy "pedidos lectura autenticada" on pedidos
  for select using (auth.role() = 'authenticated');

drop policy if exists "pedidos escritura autenticada" on pedidos;
create policy "pedidos escritura autenticada" on pedidos
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  nombre text not null,
  precio_unitario numeric not null,
  cantidad int not null check (cantidad > 0),
  nota text
);

alter table pedido_items enable row level security;

drop policy if exists "pedido_items inserción pública" on pedido_items;
create policy "pedido_items inserción pública" on pedido_items
  for insert with check (true);

drop policy if exists "pedido_items lectura autenticada" on pedido_items;
create policy "pedido_items lectura autenticada" on pedido_items
  for select using (auth.role() = 'authenticated');
```

No avanzar al Step 2 hasta que Nicolás confirme que lo corrió sin errores.

- [ ] **Step 2: Crear el script de verificación**

Create `scripts/verificar-pedidos.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
}

const supabase = createClient(url, serviceRoleKey);

async function verificar() {
  const { data: pedido, error: errorPedido } = await supabase
    .from("pedidos")
    .insert({
      cliente_nombre: "Verificación temporal",
      cliente_telefono: "0000000000",
      modalidad: "retiro",
      a_coordinar: false,
      costo_envio: 0,
      subtotal: 1000,
      total: 1000,
    })
    .select()
    .single();
  if (errorPedido || !pedido) throw new Error(`No se pudo insertar en pedidos: ${errorPedido?.message}`);
  console.log("Tabla pedidos: OK");

  const { error: errorItem } = await supabase
    .from("pedido_items")
    .insert({ pedido_id: pedido.id, nombre: "Ítem de prueba", precio_unitario: 1000, cantidad: 1 });
  if (errorItem) throw new Error(`No se pudo insertar en pedido_items: ${errorItem.message}`);
  console.log("Tabla pedido_items: OK");

  await supabase.from("pedidos").delete().eq("id", pedido.id);
  console.log("Verificación completa. Limpieza de datos de prueba hecha.");
}

verificar();
```

- [ ] **Step 3: Agregar el script a `package.json`**

Modify `package.json` — dentro de `"scripts"`, agregar (mismo patrón que `migrar-catalogo`/`verificar-admin-crud`):

```json
"verificar-pedidos": "tsx --env-file=.env.local scripts/verificar-pedidos.ts"
```

- [ ] **Step 4: Correr el script**

Run: `npm run verificar-pedidos`

Expected:
```
Tabla pedidos: OK
Tabla pedido_items: OK
Verificación completa. Limpieza de datos de prueba hecha.
```

Si falla, no seguir a la Task 2 — revisar que el SQL del Step 1 se haya corrido completo y sin errores.

- [ ] **Step 5: Borrar el script temporal y su entrada en `package.json`**

```bash
rm scripts/verificar-pedidos.ts
```

Modify `package.json` — quitar la línea `"verificar-pedidos": "..."` agregada en el Step 3.

- [ ] **Step 6: Commit**

```bash
git add package.json
git commit -m "chore: verificar tablas pedidos y pedido_items en Supabase"
```

---

### Task 2: Función pura `construirFilaPedido`

**Files:**
- Create: `src/lib/pedidos.ts`
- Create: `src/lib/pedidos.test.ts`

**Interfaces:**
- Consumes: `ItemCarrito` (`./cart`), `DatosCheckout` (`./whatsapp`).
- Produces: `PedidoInsert`, `PedidoItemInsert`, `construirFilaPedido(items: ItemCarrito[], subtotal: number, costoEnvio: number, datos: DatosCheckout): { pedido: PedidoInsert; items: PedidoItemInsert[] }` — usado por Task 3 (`guardarPedido`).

- [ ] **Step 1: Escribir los tests**

Create `src/lib/pedidos.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { construirFilaPedido } from "./pedidos";
import type { ItemCarrito } from "./cart";
import type { DatosCheckout } from "./whatsapp";

const items: ItemCarrito[] = [
  { id: "cheese-burger-simple", nombre: "Cheese Burger (Simple)", precioUnitario: 8500, cantidad: 2, nota: "sin cebolla" },
  { id: "papas", nombre: "Papas", precioUnitario: 3500, cantidad: 1 },
];

describe("construirFilaPedido", () => {
  it("arma la fila de pedido y los items para delivery con zona", () => {
    const datos: DatosCheckout = {
      nombre: "Juan Pérez",
      telefono: "2611234567",
      modalidad: "delivery",
      direccion: "Falucho 123",
      zonaNombre: "Dorrego",
      aCoordinar: false,
    };

    const resultado = construirFilaPedido(items, 20500, 1500, datos);

    expect(resultado.pedido).toEqual({
      cliente_nombre: "Juan Pérez",
      cliente_telefono: "2611234567",
      modalidad: "delivery",
      direccion: "Falucho 123",
      zona_nombre: "Dorrego",
      a_coordinar: false,
      costo_envio: 1500,
      subtotal: 20500,
      total: 22000,
    });
    expect(resultado.items).toEqual([
      { nombre: "Cheese Burger (Simple)", precio_unitario: 8500, cantidad: 2, nota: "sin cebolla" },
      { nombre: "Papas", precio_unitario: 3500, cantidad: 1, nota: null },
    ]);
  });

  it("arma la fila de pedido para delivery a coordinar (sin zona)", () => {
    const datos: DatosCheckout = {
      nombre: "Ana Gómez",
      telefono: "2617654321",
      modalidad: "delivery",
      direccion: "Ruta 40 km 12",
      aCoordinar: true,
    };

    const resultado = construirFilaPedido(items, 20500, 0, datos);

    expect(resultado.pedido).toEqual({
      cliente_nombre: "Ana Gómez",
      cliente_telefono: "2617654321",
      modalidad: "delivery",
      direccion: "Ruta 40 km 12",
      zona_nombre: null,
      a_coordinar: true,
      costo_envio: 0,
      subtotal: 20500,
      total: 20500,
    });
  });

  it("arma la fila de pedido para retiro en el local (sin dirección ni zona)", () => {
    const datos: DatosCheckout = {
      nombre: "Marcos Díaz",
      telefono: "2619988776",
      modalidad: "retiro",
    };

    const resultado = construirFilaPedido(items, 20500, 0, datos);

    expect(resultado.pedido).toEqual({
      cliente_nombre: "Marcos Díaz",
      cliente_telefono: "2619988776",
      modalidad: "retiro",
      direccion: null,
      zona_nombre: null,
      a_coordinar: false,
      costo_envio: 0,
      subtotal: 20500,
      total: 20500,
    });
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- pedidos.test.ts`
Expected: FAIL — `./pedidos` no existe todavía.

- [ ] **Step 3: Crear `pedidos.ts` con los tipos y la función**

Create `src/lib/pedidos.ts`:

```ts
import type { ItemCarrito } from "./cart";
import type { DatosCheckout } from "./whatsapp";

export interface PedidoInsert {
  cliente_nombre: string;
  cliente_telefono: string;
  modalidad: "delivery" | "retiro";
  direccion: string | null;
  zona_nombre: string | null;
  a_coordinar: boolean;
  costo_envio: number;
  subtotal: number;
  total: number;
}

export interface PedidoItemInsert {
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  nota: string | null;
}

export function construirFilaPedido(
  items: ItemCarrito[],
  subtotal: number,
  costoEnvio: number,
  datos: DatosCheckout,
): { pedido: PedidoInsert; items: PedidoItemInsert[] } {
  const pedido: PedidoInsert = {
    cliente_nombre: datos.nombre,
    cliente_telefono: datos.telefono,
    modalidad: datos.modalidad,
    direccion: datos.direccion ?? null,
    zona_nombre: datos.zonaNombre ?? null,
    a_coordinar: datos.aCoordinar ?? false,
    costo_envio: costoEnvio,
    subtotal,
    total: subtotal + costoEnvio,
  };

  const itemsInsert: PedidoItemInsert[] = items.map((item) => ({
    nombre: item.nombre,
    precio_unitario: item.precioUnitario,
    cantidad: item.cantidad,
    nota: item.nota ?? null,
  }));

  return { pedido, items: itemsInsert };
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- pedidos.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pedidos.ts src/lib/pedidos.test.ts
git commit -m "feat: agregar construirFilaPedido para mapear el carrito a filas de pedido"
```

---

### Task 3: Función `guardarPedido`

**Files:**
- Modify: `src/lib/pedidos.ts`
- Modify: `src/lib/pedidos.test.ts`

**Interfaces:**
- Consumes: `construirFilaPedido` (Task 2), `createSupabaseBrowserClient` (`./supabase/client`).
- Produces: `guardarPedido(items: ItemCarrito[], subtotal: number, costoEnvio: number, datos: DatosCheckout): Promise<void>` — usado por Task 4 (`checkout/page.tsx`). **Nunca lanza.**

- [ ] **Step 1: Escribir los tests**

Modify `src/lib/pedidos.test.ts` — agregar al inicio del archivo (antes del describe existente), reemplazando el import de vitest:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("./supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ from: mockFrom }),
}));

import { construirFilaPedido, guardarPedido } from "./pedidos";
import type { ItemCarrito } from "./cart";
import type { DatosCheckout } from "./whatsapp";

beforeEach(() => {
  mockFrom.mockReset();
});
```

Add at the end of the file:

```ts

describe("guardarPedido", () => {
  const datos: DatosCheckout = {
    nombre: "Juan Pérez",
    telefono: "2611234567",
    modalidad: "retiro",
  };

  it("inserta el pedido y sus items en orden", async () => {
    const singlePedido = vi.fn().mockResolvedValue({ data: { id: "pedido-1" }, error: null });
    const selectPedido = vi.fn(() => ({ single: singlePedido }));
    const insertPedido = vi.fn(() => ({ select: selectPedido }));
    const insertItems = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "pedidos") return { insert: insertPedido };
      if (tabla === "pedido_items") return { insert: insertItems };
      throw new Error(`tabla inesperada: ${tabla}`);
    });

    await guardarPedido(items, 20500, 0, datos);

    expect(insertPedido).toHaveBeenCalledWith(
      expect.objectContaining({ cliente_nombre: "Juan Pérez", modalidad: "retiro" }),
    );
    expect(insertItems).toHaveBeenCalledWith([
      { pedido_id: "pedido-1", nombre: "Cheese Burger (Simple)", precio_unitario: 8500, cantidad: 2, nota: "sin cebolla" },
      { pedido_id: "pedido-1", nombre: "Papas", precio_unitario: 3500, cantidad: 1, nota: null },
    ]);
  });

  it("no lanza si falla el insert de pedidos", async () => {
    const singlePedido = vi.fn().mockResolvedValue({ data: null, error: { message: "fallo" } });
    const selectPedido = vi.fn(() => ({ single: singlePedido }));
    const insertPedido = vi.fn(() => ({ select: selectPedido }));
    mockFrom.mockReturnValue({ insert: insertPedido });

    await expect(guardarPedido(items, 20500, 0, datos)).resolves.toBeUndefined();
  });

  it("no lanza si falla el insert de pedido_items", async () => {
    const singlePedido = vi.fn().mockResolvedValue({ data: { id: "pedido-1" }, error: null });
    const selectPedido = vi.fn(() => ({ single: singlePedido }));
    const insertPedido = vi.fn(() => ({ select: selectPedido }));
    const insertItems = vi.fn().mockResolvedValue({ error: { message: "fallo" } });

    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "pedidos") return { insert: insertPedido };
      if (tabla === "pedido_items") return { insert: insertItems };
      throw new Error(`tabla inesperada: ${tabla}`);
    });

    await expect(guardarPedido(items, 20500, 0, datos)).resolves.toBeUndefined();
  });
});
```

Note: `items` used in these new tests is the same `const items: ItemCarrito[] = [...]` already declared near the top of the file in Task 2 — no need to redeclare it.

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- pedidos.test.ts`
Expected: FAIL — `guardarPedido` no existe todavía.

- [ ] **Step 3: Implementar `guardarPedido`**

Modify `src/lib/pedidos.ts` — agregar el import de `createSupabaseBrowserClient` al inicio y la función al final:

```ts
import { createSupabaseBrowserClient } from "./supabase/client";
```

```ts

export async function guardarPedido(
  items: ItemCarrito[],
  subtotal: number,
  costoEnvio: number,
  datos: DatosCheckout,
): Promise<void> {
  try {
    const { pedido, items: itemsInsert } = construirFilaPedido(items, subtotal, costoEnvio, datos);
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase.from("pedidos").insert(pedido).select().single();
    if (error || !data) return;

    const { error: errorItems } = await supabase
      .from("pedido_items")
      .insert(itemsInsert.map((item) => ({ ...item, pedido_id: data.id })));
    if (errorItems) return;
  } catch {
    return;
  }
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- pedidos.test.ts`
Expected: PASS

- [ ] **Step 5: Correr toda la suite de tests**

Run: `npm test`
Expected: PASS (todos los archivos)

- [ ] **Step 6: Commit**

```bash
git add src/lib/pedidos.ts src/lib/pedidos.test.ts
git commit -m "feat: agregar guardarPedido, que persiste el pedido sin bloquear el checkout"
```

---

### Task 4: Conectar en el checkout y verificar en el navegador

**Files:**
- Modify: `src/app/checkout/page.tsx`

**Interfaces:**
- Consumes: `guardarPedido` (Task 3).
- Produces: ninguna nueva — cierra el sub-proyecto A.

- [ ] **Step 1: Modificar `manejarConfirmar` para guardar el pedido**

Modify `src/app/checkout/page.tsx`:

Add to the imports:

```ts
import { guardarPedido } from "@/lib/pedidos";
```

Replace `manejarConfirmar`:

```ts
async function manejarConfirmar() {
    if (!nombre.trim() || !telefono.trim()) {
      setError("Completá tu nombre y teléfono.");
      return;
    }
    if (modalidad === "delivery" && (!direccion.trim() || !zonaId)) {
      setError("Completá la dirección y elegí una zona.");
      return;
    }
    setError(null);

    const datos = {
      nombre,
      telefono,
      modalidad,
      direccion: modalidad === "delivery" ? direccion : undefined,
      zonaNombre: aCoordinar ? undefined : zonaSeleccionada?.nombre,
      aCoordinar,
    };

    await guardarPedido(items, subtotal, costoEnvio, datos);

    const texto = construirTextoPedido(items, subtotal, costoEnvio, datos);

    vaciar();
    window.location.href = construirUrlWhatsapp(texto);
  }
```

(El objeto `datos` se arma una sola vez y se reusa para `guardarPedido` y `construirTextoPedido` — antes solo se armaba para el segundo. `onClick={manejarConfirmar}` en el JSX no necesita cambios: React acepta un handler `async` en `onClick` sin problema.)

- [ ] **Step 2: Correr lint y toda la suite de tests**

Run: `npm run lint && npm test`
Expected: ambos sin errores.

- [ ] **Step 3: Verificar en el navegador (Chrome, dev server local)**

- Levantar `npm run dev`.
- Agregar 1-2 productos al carrito y completar el checkout (probar el caso delivery con zona, o retiro — cualquiera alcanza para esta verificación).
- Al confirmar, debe seguir abriendo WhatsApp exactamente igual que antes (nada visible cambia para el cliente).
- Confirmar que el pedido quedó guardado corriendo una consulta puntual contra Supabase con el script `scripts/migrar-catalogo.ts` como referencia de patrón — o, más simple, revisando directamente la tabla `pedidos` desde el Table Editor del dashboard de Supabase (no hace falta un script nuevo para esto, es una sola consulta visual).

- [ ] **Step 4: Confirmar que no quedan cambios sin commitear**

Run: `git status`
Expected: working tree clean.

- [ ] **Step 5: Commit (si hiciera falta alguno pendiente) y push**

```bash
git add src/app/checkout/page.tsx
git commit -m "feat: guardar el pedido en Supabase al confirmar el checkout"
git push origin main
```

Confirmar con Nicolás antes del push si no se pidió explícitamente automatizarlo.
