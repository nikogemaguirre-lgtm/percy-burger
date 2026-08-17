# Vista desktop de gestión de pedidos (sub-proyecto B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nueva pantalla `/admin/pedidos` donde Percy ve los pedidos guardados por el sub-proyecto A, los pedidos nuevos aparecen solos (Realtime) y puede avanzar su estado con un botón, con una vista de historial aparte para los ya entregados.

**Architecture:** Ruta separada, Server Component de carga inicial + Client Component con suscripción a Supabase Realtime. Lectura/mutación en `pedidos-admin.ts` con el mismo patrón client-side ya usado en `catalogo-admin.ts`.

**Tech Stack:** Next.js 16 (App Router), React 19, `@supabase/supabase-js`, Vitest.

> [!note] Actualización tras implementación (2026-08-17)
> Este plan fue escrito y ejecutado usando Supabase Realtime (Tasks 1 y 4). Durante la verificación (Task 7) Realtime resultó intermitente e impredecible en este proyecto de Supabase — funcionó solo una vez de ocho intentos, descartando publicación, RLS, HMR y conexiones fantasma como causa. Se pivotó a **polling cada 15 segundos** en `PedidosAdmin.tsx`, eliminando `suscribirsePedidos` por completo. Los pasos de Task 1 (`alter publication`) y la función `suscribirsePedidos` de Task 4 quedaron sin efecto en el código final — se dejan documentados igual porque reflejan lo que efectivamente se ejecutó en esta sesión. Ver la spec (`docs/superpowers/specs/2026-08-17-gestion-pedidos-desktop-design.md`) para el detalle de la arquitectura final.

## Global Constraints

- Solo vista desktop — la vista mobile minimalista es el sub-proyecto C, posterior.
- Orden fijo de estados: `nuevo → en_preparacion → listo → entregado`. Un solo botón "Siguiente", sin selector libre.
- Activos: `nuevo`/`en_preparacion`/`listo`, ordenados por `creado_en` ascendente (el más viejo primero). Historial: solo `entregado`, ordenado descendente.
- Si falla el `update` de estado, se muestra un error inline en la tarjeta y el estado visible no cambia — sin actualización optimista.
- Commits directos a `main`, sin branch separado — convención ya establecida en este proyecto.

---

### Task 1: Habilitar Realtime en la tabla `pedidos`

**Files:** ninguno (solo SQL manual).

**Interfaces:**
- Consumes: tabla `pedidos` ya creada en el sub-proyecto A.
- Produces: replicación Realtime habilitada — precondición de la que depende la Task 6 (`suscribirsePedidos`).

- [ ] **Step 1: Pedirle a Nicolás que corra el SQL en el SQL Editor de Supabase**

```sql
alter publication supabase_realtime add table pedidos;
```

No avanzar a la Task 2 hasta que confirme que corrió sin errores. (No hace falta script de verificación esta vez — la verificación real de que Realtime funciona es la Task 7, en el navegador, más confiable que un script headless para este caso.)

---

### Task 2: Funciones puras — estados y etiquetas

**Files:**
- Create: `src/lib/pedidos-admin.ts`
- Create: `src/lib/pedidos-admin.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `EstadoPedido`, `ORDEN_ESTADOS`, `ETIQUETAS_ESTADO`, `siguienteEstado(estado: EstadoPedido): EstadoPedido | null` — usado por Task 4 (`avanzarEstadoPedido`) y Task 5 (`PedidoCard`).

- [ ] **Step 1: Escribir el test**

Create `src/lib/pedidos-admin.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { siguienteEstado } from "./pedidos-admin";

describe("siguienteEstado", () => {
  it("avanza nuevo a en_preparacion", () => {
    expect(siguienteEstado("nuevo")).toBe("en_preparacion");
  });

  it("avanza en_preparacion a listo", () => {
    expect(siguienteEstado("en_preparacion")).toBe("listo");
  });

  it("avanza listo a entregado", () => {
    expect(siguienteEstado("listo")).toBe("entregado");
  });

  it("devuelve null si ya está entregado", () => {
    expect(siguienteEstado("entregado")).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- pedidos-admin.test.ts`
Expected: FAIL — `./pedidos-admin` no existe todavía.

- [ ] **Step 3: Crear `pedidos-admin.ts` con los tipos y la función**

Create `src/lib/pedidos-admin.ts`:

```ts
export type EstadoPedido = "nuevo" | "en_preparacion" | "listo" | "entregado";

export const ORDEN_ESTADOS: EstadoPedido[] = ["nuevo", "en_preparacion", "listo", "entregado"];

export const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
  nuevo: "Nuevo",
  en_preparacion: "En preparación",
  listo: "Listo",
  entregado: "Entregado",
};

export function siguienteEstado(estado: EstadoPedido): EstadoPedido | null {
  const indice = ORDEN_ESTADOS.indexOf(estado);
  return indice === ORDEN_ESTADOS.length - 1 ? null : ORDEN_ESTADOS[indice + 1];
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- pedidos-admin.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pedidos-admin.ts src/lib/pedidos-admin.test.ts
git commit -m "feat: agregar siguienteEstado y etiquetas de estado de pedido"
```

---

### Task 3: Lectura de pedidos (`obtenerPedidosActivos`, `obtenerPedidosEntregados`)

**Files:**
- Modify: `src/lib/pedidos-admin.ts`
- Modify: `src/lib/pedidos-admin.test.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient` (`./supabase/server`) — estas son lecturas server-side, igual que `obtenerProductos`/`obtenerCombos` en `catalogo.ts`.
- Produces: `PedidoConItems`, `obtenerPedidosActivos(): Promise<PedidoConItems[]>`, `obtenerPedidosEntregados(): Promise<PedidoConItems[]>` — usadas por Task 6 (`page.tsx`, `PedidosAdmin`).

- [ ] **Step 1: Escribir los tests**

Modify `src/lib/pedidos-admin.test.ts` — cambiar el import de vitest y agregar el mock al inicio del archivo:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("./supabase/server", () => ({
  createSupabaseServerClient: async () => ({ from: mockFrom }),
}));

import { siguienteEstado, obtenerPedidosActivos, obtenerPedidosEntregados } from "./pedidos-admin";

beforeEach(() => {
  mockFrom.mockReset();
});
```

Add at the end of the file:

```ts

const filaPedido = {
  id: "pedido-1",
  estado: "nuevo",
  cliente_nombre: "Juan Pérez",
  cliente_telefono: "2611234567",
  modalidad: "retiro",
  direccion: null,
  zona_nombre: null,
  a_coordinar: false,
  costo_envio: 0,
  subtotal: 8500,
  total: 8500,
  creado_en: "2026-08-17T12:00:00.000Z",
  pedido_items: [{ nombre: "Cheese Burger (Simple)", precio_unitario: 8500, cantidad: 1, nota: null }],
};

describe("obtenerPedidosActivos", () => {
  it("trae los pedidos activos ordenados por fecha ascendente y los mapea", async () => {
    const order = vi.fn().mockResolvedValue({ data: [filaPedido], error: null });
    const in_ = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ in: in_ }));
    mockFrom.mockReturnValue({ select });

    const resultado = await obtenerPedidosActivos();

    expect(mockFrom).toHaveBeenCalledWith("pedidos");
    expect(select).toHaveBeenCalledWith("*, pedido_items(*)");
    expect(in_).toHaveBeenCalledWith("estado", ["nuevo", "en_preparacion", "listo"]);
    expect(order).toHaveBeenCalledWith("creado_en", { ascending: true });
    expect(resultado).toEqual([
      {
        id: "pedido-1",
        estado: "nuevo",
        clienteNombre: "Juan Pérez",
        clienteTelefono: "2611234567",
        modalidad: "retiro",
        direccion: null,
        zonaNombre: null,
        aCoordinar: false,
        costoEnvio: 0,
        subtotal: 8500,
        total: 8500,
        creadoEn: "2026-08-17T12:00:00.000Z",
        items: [{ nombre: "Cheese Burger (Simple)", precioUnitario: 8500, cantidad: 1, nota: null }],
      },
    ]);
  });
});

describe("obtenerPedidosEntregados", () => {
  it("trae los pedidos entregados ordenados por fecha descendente", async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ ...filaPedido, estado: "entregado" }], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const resultado = await obtenerPedidosEntregados();

    expect(eq).toHaveBeenCalledWith("estado", "entregado");
    expect(order).toHaveBeenCalledWith("creado_en", { ascending: false });
    expect(resultado[0].estado).toBe("entregado");
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- pedidos-admin.test.ts`
Expected: FAIL — `obtenerPedidosActivos`/`obtenerPedidosEntregados` no existen todavía.

- [ ] **Step 3: Implementar el mapeo y las funciones de lectura**

Modify `src/lib/pedidos-admin.ts` — agregar al inicio del archivo y al final:

```ts
import { createSupabaseServerClient } from "./supabase/server";
```

```ts

export interface PedidoConItems {
  id: string;
  estado: EstadoPedido;
  clienteNombre: string;
  clienteTelefono: string;
  modalidad: "delivery" | "retiro";
  direccion: string | null;
  zonaNombre: string | null;
  aCoordinar: boolean;
  costoEnvio: number;
  subtotal: number;
  total: number;
  creadoEn: string;
  items: { nombre: string; precioUnitario: number; cantidad: number; nota: string | null }[];
}

interface PedidoRow {
  id: string;
  estado: EstadoPedido;
  cliente_nombre: string;
  cliente_telefono: string;
  modalidad: "delivery" | "retiro";
  direccion: string | null;
  zona_nombre: string | null;
  a_coordinar: boolean;
  costo_envio: number;
  subtotal: number;
  total: number;
  creado_en: string;
  pedido_items: { nombre: string; precio_unitario: number; cantidad: number; nota: string | null }[];
}

function mapRowAPedido(row: PedidoRow): PedidoConItems {
  return {
    id: row.id,
    estado: row.estado,
    clienteNombre: row.cliente_nombre,
    clienteTelefono: row.cliente_telefono,
    modalidad: row.modalidad,
    direccion: row.direccion,
    zonaNombre: row.zona_nombre,
    aCoordinar: row.a_coordinar,
    costoEnvio: row.costo_envio,
    subtotal: row.subtotal,
    total: row.total,
    creadoEn: row.creado_en,
    items: row.pedido_items.map((item) => ({
      nombre: item.nombre,
      precioUnitario: item.precio_unitario,
      cantidad: item.cantidad,
      nota: item.nota,
    })),
  };
}

export async function obtenerPedidosActivos(): Promise<PedidoConItems[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, pedido_items(*)")
    .in("estado", ["nuevo", "en_preparacion", "listo"])
    .order("creado_en", { ascending: true });
  if (error) throw new Error(`No se pudieron obtener los pedidos activos: ${error.message}`);
  return (data as PedidoRow[]).map(mapRowAPedido);
}

export async function obtenerPedidosEntregados(): Promise<PedidoConItems[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, pedido_items(*)")
    .eq("estado", "entregado")
    .order("creado_en", { ascending: false });
  if (error) throw new Error(`No se pudieron obtener los pedidos entregados: ${error.message}`);
  return (data as PedidoRow[]).map(mapRowAPedido);
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- pedidos-admin.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pedidos-admin.ts src/lib/pedidos-admin.test.ts
git commit -m "feat: agregar lectura de pedidos activos y entregados"
```

---

### Task 4: Mutación `avanzarEstadoPedido` y suscripción Realtime

**Files:**
- Modify: `src/lib/pedidos-admin.ts`
- Modify: `src/lib/pedidos-admin.test.ts`

**Interfaces:**
- Consumes: `siguienteEstado` (Task 2), `createSupabaseBrowserClient` (`./supabase/client`).
- Produces: `avanzarEstadoPedido(id: string, estadoActual: EstadoPedido): Promise<EstadoPedido>` (lanza si falla), `suscribirsePedidos(alCambiar: () => void): () => void` — ambas usadas por Task 6 (`PedidosAdmin`).

- [ ] **Step 1: Escribir los tests de `avanzarEstadoPedido`**

Modify `src/lib/pedidos-admin.test.ts` — agregar `avanzarEstadoPedido` al import de `"./pedidos-admin"`, y agregar un segundo mock hoisted junto al ya existente:

```ts
const { mockFrom, mockFromCliente } = vi.hoisted(() => ({ mockFrom: vi.fn(), mockFromCliente: vi.fn() }));

vi.mock("./supabase/server", () => ({
  createSupabaseServerClient: async () => ({ from: mockFrom }),
}));

vi.mock("./supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ from: mockFromCliente }),
}));
```

(Reemplaza el bloque `vi.hoisted`/`vi.mock` existente al inicio del archivo — ahora hay dos mocks, uno por cada cliente de Supabase.)

Add at the end of the file:

```ts

describe("avanzarEstadoPedido", () => {
  beforeEach(() => {
    mockFromCliente.mockReset();
  });

  it("actualiza el estado al siguiente y lo devuelve", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    mockFromCliente.mockReturnValue({ update });

    const resultado = await avanzarEstadoPedido("pedido-1", "nuevo");

    expect(mockFromCliente).toHaveBeenCalledWith("pedidos");
    expect(update).toHaveBeenCalledWith({ estado: "en_preparacion" });
    expect(eq).toHaveBeenCalledWith("id", "pedido-1");
    expect(resultado).toBe("en_preparacion");
  });

  it("lanza un error si Supabase rechaza la actualización", async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: "fallo" } });
    const update = vi.fn(() => ({ eq }));
    mockFromCliente.mockReturnValue({ update });

    await expect(avanzarEstadoPedido("pedido-1", "nuevo")).rejects.toThrow("fallo");
  });

  it("lanza un error si el pedido ya está entregado", async () => {
    await expect(avanzarEstadoPedido("pedido-1", "entregado")).rejects.toThrow(
      "El pedido ya está en el último estado.",
    );
    expect(mockFromCliente).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- pedidos-admin.test.ts`
Expected: FAIL — `avanzarEstadoPedido` no existe todavía.

- [ ] **Step 3: Implementar `avanzarEstadoPedido` y `suscribirsePedidos`**

Modify `src/lib/pedidos-admin.ts` — agregar el import de `createSupabaseBrowserClient` y las dos funciones al final:

```ts
import { createSupabaseBrowserClient } from "./supabase/client";
```

```ts

export async function avanzarEstadoPedido(id: string, estadoActual: EstadoPedido): Promise<EstadoPedido> {
  const nuevo = siguienteEstado(estadoActual);
  if (!nuevo) throw new Error("El pedido ya está en el último estado.");

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("pedidos").update({ estado: nuevo }).eq("id", id);
  if (error) throw new Error(error.message);

  return nuevo;
}

export function suscribirsePedidos(alCambiar: () => void): () => void {
  const supabase = createSupabaseBrowserClient();
  const canal = supabase
    .channel("pedidos-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
      alCambiar();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- pedidos-admin.test.ts`
Expected: PASS

- [ ] **Step 5: Correr toda la suite de tests**

Run: `npm test`
Expected: PASS (todos los archivos)

- [ ] **Step 6: Commit**

```bash
git add src/lib/pedidos-admin.ts src/lib/pedidos-admin.test.ts
git commit -m "feat: agregar avanzarEstadoPedido y suscripción Realtime a pedidos"
```

---

### Task 5: Componente `PedidoCard`

**Files:**
- Create: `src/components/admin/PedidoCard.tsx`

**Interfaces:**
- Consumes: `PedidoConItems`, `EstadoPedido`, `ETIQUETAS_ESTADO`, `siguienteEstado` (Tasks 2/3).
- Produces: `PedidoCard({ pedido, onAvanzar })` — usado por Task 6 (`PedidosAdmin`).

No hay infraestructura de testing de componentes React en este proyecto — se verifica visualmente en la Task 7.

- [ ] **Step 1: Crear el componente**

Create `src/components/admin/PedidoCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { EstadoPedido, ETIQUETAS_ESTADO, PedidoConItems, siguienteEstado } from "@/lib/pedidos-admin";

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function formatearHora(creadoEn: string): string {
  return new Date(creadoEn).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const COLOR_ESTADO: Record<EstadoPedido, string> = {
  nuevo: "bg-brand-red text-white",
  en_preparacion: "bg-brand-orange text-white",
  listo: "bg-brand-yellow text-brand-black",
  entregado: "bg-brand-black/10 text-brand-black/70",
};

export function PedidoCard({
  pedido,
  onAvanzar,
}: {
  pedido: PedidoConItems;
  onAvanzar?: () => Promise<void>;
}) {
  const [avanzando, setAvanzando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proximoEstado = siguienteEstado(pedido.estado);

  async function manejarAvanzar() {
    if (!onAvanzar) return;
    setAvanzando(true);
    setError(null);
    try {
      await onAvanzar();
    } catch {
      setError("No pudimos actualizar el estado. Probá de nuevo.");
    } finally {
      setAvanzando(false);
    }
  }

  return (
    <div className="rounded-lg border border-brand-black/10 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-semibold text-brand-black">{pedido.clienteNombre}</p>
          <p className="text-sm text-brand-black/60">{pedido.clienteTelefono}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${COLOR_ESTADO[pedido.estado]}`}>
          {ETIQUETAS_ESTADO[pedido.estado]}
        </span>
      </div>

      <p className="mb-2 text-sm text-brand-black/70">
        {pedido.modalidad === "retiro"
          ? "Retiro en el local"
          : pedido.aCoordinar
            ? `Delivery a coordinar — ${pedido.direccion}`
            : `Delivery a ${pedido.direccion} (${pedido.zonaNombre})`}
      </p>

      <ul className="mb-2 flex flex-col gap-1 text-sm">
        {pedido.items.map((item, indice) => (
          <li key={indice}>
            {item.cantidad}x {item.nombre} — {formatearPrecio(item.precioUnitario * item.cantidad)}
            {item.nota && <span className="text-brand-black/60"> ({item.nota})</span>}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <span className="text-sm text-brand-black/60">{formatearHora(pedido.creadoEn)}</span>
        <span className="font-bold text-brand-orange-burnt">{formatearPrecio(pedido.total)}</span>
      </div>

      {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}

      {onAvanzar && proximoEstado && (
        <button
          type="button"
          onClick={manejarAvanzar}
          disabled={avanzando}
          className="mt-3 w-full rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Siguiente: {ETIQUETAS_ESTADO[proximoEstado]}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que el proyecto sigue compilando**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/PedidoCard.tsx
git commit -m "feat: agregar PedidoCard con botón de avance de estado"
```

---

### Task 6: `PedidosAdmin`, `page.tsx` y conexión final

**Files:**
- Create: `src/components/admin/PedidosAdmin.tsx`
- Create: `src/app/admin/pedidos/page.tsx`

**Interfaces:**
- Consumes: `PedidoCard` (Task 5), `obtenerPedidosActivos`, `obtenerPedidosEntregados`, `avanzarEstadoPedido`, `suscribirsePedidos`, `PedidoConItems` (Tasks 2/3/4).
- Produces: página `/admin/pedidos` funcional.

- [ ] **Step 1: Crear el componente `PedidosAdmin`**

Create `src/components/admin/PedidosAdmin.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  PedidoConItems,
  obtenerPedidosActivos,
  obtenerPedidosEntregados,
  avanzarEstadoPedido,
  suscribirsePedidos,
} from "@/lib/pedidos-admin";
import { PedidoCard } from "./PedidoCard";

type Vista = "activos" | "historial";

export function PedidosAdmin({ pedidosIniciales }: { pedidosIniciales: PedidoConItems[] }) {
  const [vista, setVista] = useState<Vista>("activos");
  const [pedidos, setPedidos] = useState<PedidoConItems[]>(pedidosIniciales);

  useEffect(() => {
    if (vista === "activos") {
      obtenerPedidosActivos().then(setPedidos);
    } else {
      obtenerPedidosEntregados().then(setPedidos);
    }
  }, [vista]);

  useEffect(() => {
    if (vista !== "activos") return;
    const cancelar = suscribirsePedidos(() => {
      obtenerPedidosActivos().then(setPedidos);
    });
    return cancelar;
  }, [vista]);

  async function manejarAvanzar(pedido: PedidoConItems) {
    await avanzarEstadoPedido(pedido.id, pedido.estado);
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setVista("activos")}
          className={`rounded-md px-3 py-1 text-sm font-semibold ${
            vista === "activos" ? "bg-brand-orange text-white" : "text-brand-black/70"
          }`}
        >
          Activos
        </button>
        <button
          type="button"
          onClick={() => setVista("historial")}
          className={`rounded-md px-3 py-1 text-sm font-semibold ${
            vista === "historial" ? "bg-brand-orange text-white" : "text-brand-black/70"
          }`}
        >
          Historial
        </button>
      </div>

      {pedidos.length === 0 ? (
        <p className="text-sm text-brand-black/60">
          {vista === "activos" ? "No hay pedidos activos." : "Todavía no hay pedidos entregados."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {pedidos.map((pedido) => (
            <PedidoCard
              key={pedido.id}
              pedido={pedido}
              onAvanzar={vista === "activos" ? () => manejarAvanzar(pedido) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

(La lista se refresca completa desde Supabase después de cada avance de estado y ante cualquier evento Realtime — no hay reconciliación manual del array local, coherente con la decisión de no hacer actualización optimista.)

- [ ] **Step 2: Crear la página**

Create `src/app/admin/pedidos/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerPedidosActivos } from "@/lib/pedidos-admin";
import { CerrarSesionButton } from "@/components/admin/CerrarSesionButton";
import { PedidosAdmin } from "@/components/admin/PedidosAdmin";

export default async function PedidosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const pedidos = await obtenerPedidosActivos();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-black">Pedidos</h1>
        <CerrarSesionButton />
      </div>
      <PedidosAdmin pedidosIniciales={pedidos} />
    </main>
  );
}
```

- [ ] **Step 3: Verificar que el proyecto sigue compilando**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/PedidosAdmin.tsx src/app/admin/pedidos/page.tsx
git commit -m "feat: agregar vista desktop de gestión de pedidos en /admin/pedidos"
```

---

### Task 7: Verificación manual end-to-end

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Correr lint y toda la suite de tests**

Run: `npm run lint && npm test`
Expected: ambos sin errores.

- [ ] **Step 2: Levantar el dev server**

Run: `npm run dev`

- [ ] **Step 3: Verificar en el navegador (dos pestañas: una en `/admin/pedidos`, otra en el sitio público)**

- Entrar a `/admin/pedidos` con sesión iniciada — debe mostrar "No hay pedidos activos." si no hay ninguno.
- En otra pestaña, completar un pedido real desde el checkout público.
- Volver a la pestaña de `/admin/pedidos` **sin recargarla** — el pedido nuevo debe aparecer solo (confirma que Realtime está andando).
- Tocar "Siguiente: En preparación", después "Siguiente: Listo", después "Siguiente: Entregado" — cada click debe reflejar el nuevo estado.
- Al llegar a "Entregado", el pedido debe desaparecer de Activos.
- Tocar el toggle "Historial" — el pedido recién entregado debe aparecer ahí.
- Si algo falla, volver a la task correspondiente y corregir antes de seguir.

- [ ] **Step 4: Confirmar que no quedan cambios sin commitear**

Run: `git status`
Expected: working tree clean.

- [ ] **Step 5: Push**

```bash
git push origin main
```

Confirmar con Nicolás antes de este paso si no se pidió explícitamente automatizar el push.
