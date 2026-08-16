# Panel de administración — base de datos + login (sub-proyecto 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poner en pie la base de datos de Supabase, migrar el catálogo (productos/combos) desde archivos locales, hacer que el sitio público lea de la base, y dar a Percy un login seguro que protege `/admin` con una lista de solo lectura del catálogo.

**Architecture:** Next.js 16 (App Router, `src/app`) con Supabase Postgres + Supabase Auth. `@supabase/ssr` provee un cliente de navegador (para login/logout desde componentes cliente) y un cliente de servidor (para leer sesión y datos desde Server Components). `src/proxy.ts` (el reemplazo de `middleware.ts` en Next 16) refresca la sesión y redirige a `/admin/login` cuando no hay sesión válida en rutas `/admin/*`; cada página de admin repite la verificación server-side (defensa en profundidad, sin depender solo del proxy).

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Vitest, `@supabase/supabase-js`, `@supabase/ssr`, `tsx` (para correr el script de migración).

## Global Constraints

- Next.js 16 tiene cambios de convención respecto a versiones anteriores (`AGENTS.md` del repo) — el archivo de protección de rutas se llama `proxy.ts`, no `middleware.ts` (confirmado en `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
- IDs de `productos`/`combos` se conservan como texto, mismos slugs que hoy (ej. `"cheese-burger"`) — no se regeneran como UUID.
- RLS: lectura pública abierta, escritura solo para rol `authenticated`, exactamente como en el spec.
- No se usan Server Actions en este sub-proyecto — login/logout/reset de contraseña se hacen desde el cliente con `supabase-js`, coherente con que el resto del código de este proyecto (checkout, carrito) ya es 100% Client Components con `useState`.
- Commit directo a `main`, sin branch/worktree separado — convención ya establecida en este proyecto.
- Tests con Vitest, mismo patrón que `src/lib/whatsapp.test.ts` (`describe`/`it`/`expect`, alias `@/` → `./src`).
- `.env.local` nunca se commitea (ya está en `.gitignore`); las claves reales las carga Nicolás a mano durante la ejecución.

---

### Task 1: Esquema de Supabase, dependencias y clientes

**Files:**
- Create: `.env.local.example`
- Create: `.env.local` (NO se commitea — Nicolás carga los valores reales a mano)
- Modify: `package.json`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

**Interfaces:**
- Produces: `createSupabaseBrowserClient(): SupabaseClient` (desde `src/lib/supabase/client.ts`); `createSupabaseServerClient(): Promise<SupabaseClient>` (desde `src/lib/supabase/server.ts`) — ambos usados por todas las tareas siguientes.

- [ ] **Paso 1: Crear el esquema y las políticas RLS en Supabase (manual)**

Nicolás corre esto una vez en el SQL Editor del dashboard de Supabase del proyecto ya existente:

```sql
create table productos (
  id text primary key,
  categoria text not null check (categoria in ('clasica','especial','extra','bebida')),
  nombre text not null,
  ingredientes text not null,
  precio_simple integer not null,
  precio_doble integer,
  precio_triple integer,
  imagen_url text not null
);

create table combos (
  id text primary key,
  nombre text not null,
  descripcion text not null,
  precio integer not null,
  imagen_url text not null,
  activo boolean not null default true
);

alter table productos enable row level security;
alter table combos enable row level security;

create policy "productos: lectura publica" on productos for select using (true);
create policy "combos: lectura publica" on combos for select using (true);

create policy "productos: escritura autenticada" on productos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "combos: escritura autenticada" on combos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

Verificar en el Table Editor de Supabase que aparecen las tablas `productos` y `combos`, vacías, con esas columnas.

- [ ] **Paso 2: Instalar dependencias**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D tsx
```

- [ ] **Paso 3: Crear la plantilla de variables de entorno**

`.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Paso 4: Crear `.env.local` con los valores reales (manual)**

Nicolás copia `.env.local.example` a `.env.local` y completa los tres valores desde el dashboard de Supabase (Project Settings → API): `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`, `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`. Este archivo no se commitea.

- [ ] **Paso 5: Cliente de navegador**

`src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Paso 6: Cliente de servidor**

`src/lib/supabase/server.ts`:
```ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Se ignora si se llama desde un Server Component (cookies de solo lectura) —
            // el proxy.ts (Task 5) es el que efectivamente refresca la sesión en cada request.
          }
        },
      },
    },
  );
}
```

- [ ] **Paso 7: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Paso 8: Commit**

```bash
git add .env.local.example package.json package-lock.json src/lib/supabase/client.ts src/lib/supabase/server.ts
git commit -m "chore: agregar dependencias y clientes de Supabase"
```

---

### Task 2: Mapeo de filas de Supabase a tipos de dominio (TDD)

**Files:**
- Create: `src/lib/catalogo.ts`
- Create: `src/lib/catalogo.test.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient` de `src/lib/supabase/server.ts` (Task 1); tipos `Producto`, `Combo` de `src/data/types.ts`.
- Produces: `ProductoRow`, `ComboRow` (tipos de fila de la tabla); `mapRowAProducto(row: ProductoRow): Producto`; `mapRowACombo(row: ComboRow): Combo`; `obtenerProductos(): Promise<Producto[]>`; `obtenerCombos(): Promise<Combo[]>` — usados por Task 4 (sitio público) y Task 7 (panel admin).

- [ ] **Paso 1: Escribir los tests (van a fallar, `catalogo.ts` no existe todavía)**

`src/lib/catalogo.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mapRowAProducto, mapRowACombo, ProductoRow, ComboRow } from "./catalogo";

describe("mapRowAProducto", () => {
  it("mapea una fila con los tres tamaños de precio", () => {
    const row: ProductoRow = {
      id: "cheese-burger",
      categoria: "clasica",
      nombre: "Cheese Burger",
      ingredientes: "Pan de papa, carne, cheddar, salsa smash",
      precio_simple: 8500,
      precio_doble: 10000,
      precio_triple: 11500,
      imagen_url: "/productos/cheese-burger.jpg",
    };

    expect(mapRowAProducto(row)).toEqual({
      id: "cheese-burger",
      categoria: "clasica",
      nombre: "Cheese Burger",
      ingredientes: "Pan de papa, carne, cheddar, salsa smash",
      precios: { simple: 8500, doble: 10000, triple: 11500 },
      imagenUrl: "/productos/cheese-burger.jpg",
    });
  });

  it("mapea una fila que solo tiene precio simple", () => {
    const row: ProductoRow = {
      id: "papas",
      categoria: "extra",
      nombre: "Papas",
      ingredientes: "Porción individual",
      precio_simple: 3500,
      precio_doble: null,
      precio_triple: null,
      imagen_url: "/placeholder.svg",
    };

    expect(mapRowAProducto(row)).toEqual({
      id: "papas",
      categoria: "extra",
      nombre: "Papas",
      ingredientes: "Porción individual",
      precios: { simple: 3500 },
      imagenUrl: "/placeholder.svg",
    });
  });
});

describe("mapRowACombo", () => {
  it("mapea una fila de combo", () => {
    const row: ComboRow = {
      id: "promo-cheese-doble",
      nombre: "Promo Cheese Doble",
      descripcion: "Cheese Burger Doble + Papas + Gaseosa 500ml",
      precio: 11000,
      imagen_url: "/productos/promo-cheese-doble.jpg",
      activo: true,
    };

    expect(mapRowACombo(row)).toEqual({
      id: "promo-cheese-doble",
      nombre: "Promo Cheese Doble",
      descripcion: "Cheese Burger Doble + Papas + Gaseosa 500ml",
      precio: 11000,
      imagenUrl: "/productos/promo-cheese-doble.jpg",
      activo: true,
    });
  });
});
```

- [ ] **Paso 2: Correr los tests y verificar que fallan**

Run: `npx vitest run src/lib/catalogo.test.ts`
Expected: FAIL — no se puede resolver el módulo `./catalogo`.

- [ ] **Paso 3: Implementar `catalogo.ts`**

`src/lib/catalogo.ts`:
```ts
import { Producto, Combo } from "@/data/types";
import { createSupabaseServerClient } from "./supabase/server";

export interface ProductoRow {
  id: string;
  categoria: Producto["categoria"];
  nombre: string;
  ingredientes: string;
  precio_simple: number;
  precio_doble: number | null;
  precio_triple: number | null;
  imagen_url: string;
}

export interface ComboRow {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen_url: string;
  activo: boolean;
}

export function mapRowAProducto(row: ProductoRow): Producto {
  const precios: Producto["precios"] = { simple: row.precio_simple };
  if (row.precio_doble != null) precios.doble = row.precio_doble;
  if (row.precio_triple != null) precios.triple = row.precio_triple;

  return {
    id: row.id,
    categoria: row.categoria,
    nombre: row.nombre,
    ingredientes: row.ingredientes,
    precios,
    imagenUrl: row.imagen_url,
  };
}

export function mapRowACombo(row: ComboRow): Combo {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precio: row.precio,
    imagenUrl: row.imagen_url,
    activo: row.activo,
  };
}

export async function obtenerProductos(): Promise<Producto[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("productos").select("*");
  if (error) throw new Error(`No se pudieron obtener los productos: ${error.message}`);
  return (data as ProductoRow[]).map(mapRowAProducto);
}

export async function obtenerCombos(): Promise<Combo[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("combos").select("*");
  if (error) throw new Error(`No se pudieron obtener los combos: ${error.message}`);
  return (data as ComboRow[]).map(mapRowACombo);
}
```

- [ ] **Paso 4: Correr los tests y verificar que pasan**

Run: `npx vitest run src/lib/catalogo.test.ts`
Expected: PASS (3 tests).

- [ ] **Paso 5: Commit**

```bash
git add src/lib/catalogo.ts src/lib/catalogo.test.ts
git commit -m "feat: agregar mapeo y lectura de productos/combos desde Supabase"
```

---

### Task 3: Migrar el catálogo de archivos locales a Supabase

**Files:**
- Create: `scripts/migrar-catalogo.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `productos` de `src/data/menu.ts`, `combos` de `src/data/combos.ts` (ambos archivos se borran en Task 4 — este script es la última vez que se leen).

- [ ] **Paso 1: Escribir el script de migración**

`scripts/migrar-catalogo.ts`:
```ts
import { createClient } from "@supabase/supabase-js";
import { productos } from "../src/data/menu";
import { combos } from "../src/data/combos";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
}

const supabase = createClient(url, serviceRoleKey);

async function migrar() {
  const filasProductos = productos.map((p) => ({
    id: p.id,
    categoria: p.categoria,
    nombre: p.nombre,
    ingredientes: p.ingredientes,
    precio_simple: p.precios.simple,
    precio_doble: p.precios.doble ?? null,
    precio_triple: p.precios.triple ?? null,
    imagen_url: p.imagenUrl,
  }));

  const { error: errorProductos } = await supabase.from("productos").insert(filasProductos);
  if (errorProductos) throw new Error(`Error insertando productos: ${errorProductos.message}`);
  console.log(`${filasProductos.length} productos migrados.`);

  const filasCombos = combos.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    precio: c.precio,
    imagen_url: c.imagenUrl,
    activo: c.activo,
  }));

  const { error: errorCombos } = await supabase.from("combos").insert(filasCombos);
  if (errorCombos) throw new Error(`Error insertando combos: ${errorCombos.message}`);
  console.log(`${filasCombos.length} combos migrados.`);
}

migrar();
```

- [ ] **Paso 2: Agregar el script a `package.json`**

En `"scripts"`, agregar:
```json
"migrar-catalogo": "tsx --env-file=.env.local scripts/migrar-catalogo.ts"
```

- [ ] **Paso 3: Correrlo (manual, una sola vez)**

Run: `npm run migrar-catalogo`
Expected: `12 productos migrados.` y `4 combos migrados.` (sin errores).

- [ ] **Paso 4: Verificar en el dashboard de Supabase**

Table Editor → `productos` tiene 12 filas, `combos` tiene 4 filas, con los datos esperados (ej. `cheese-burger` con `precio_simple=8500`).

- [ ] **Paso 5: Commit**

```bash
git add scripts/migrar-catalogo.ts package.json
git commit -m "feat: agregar script de migración del catálogo a Supabase"
```

---

### Task 4: El sitio público lee el catálogo desde Supabase

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/carrito/page.tsx`
- Create: `src/app/carrito/CarritoContenido.tsx`
- Create: `src/app/error.tsx`
- Delete: `src/data/menu.ts`
- Delete: `src/data/combos.ts`

**Interfaces:**
- Consumes: `obtenerProductos`, `obtenerCombos` de `src/lib/catalogo.ts` (Task 2).

- [ ] **Paso 1: Actualizar la home para leer de Supabase**

`src/app/page.tsx` — reemplazar los dos imports de `@/data/menu` y `@/data/combos`, y hacer el componente `async`:
```tsx
import { obtenerProductos, obtenerCombos } from "@/lib/catalogo";
import { ProductoCard } from "@/components/ProductoCard";
import { ComboCard } from "@/components/ComboCard";
import { Hero } from "@/components/Hero";
import { Resenas } from "@/components/Resenas";
import { Ubicacion } from "@/components/Ubicacion";
import { Producto } from "@/data/types";

const CATEGORIAS: { key: Producto["categoria"]; titulo: string }[] = [
  { key: "clasica", titulo: "Burgers clásicas" },
  { key: "especial", titulo: "Especiales" },
  { key: "extra", titulo: "Extras" },
  { key: "bebida", titulo: "Bebidas" },
];

export default async function Home() {
  const [productos, combos] = await Promise.all([obtenerProductos(), obtenerCombos()]);
  const combosActivos = combos.filter((c) => c.activo);

  return (
    <>
      <Hero />
      <main className="mx-auto max-w-5xl px-4 py-8">
      {combosActivos.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold text-brand-black">Promos</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {combosActivos.map((combo) => (
              <ComboCard key={combo.id} combo={combo} />
            ))}
          </div>
        </section>
      )}
      {CATEGORIAS.map(({ key, titulo }) => {
        const productosCategoria = productos.filter((p) => p.categoria === key);
        if (productosCategoria.length === 0) return null;
        return (
          <section key={key} className="mb-10">
            <h2 className="mb-4 text-2xl font-bold text-brand-black">{titulo}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {productosCategoria.map((producto) => (
                <ProductoCard key={producto.id} producto={producto} />
              ))}
            </div>
          </section>
        );
      })}
      </main>
      <Resenas />
      <Ubicacion />
    </>
  );
}
```

- [ ] **Paso 2: Separar `/carrito` en Server Component + Client Component**

`/carrito` hoy es un Client Component (`"use client"`) que importa `productos` de `@/data/menu` de forma síncrona para filtrar los extras/bebidas — eso ya no es posible una vez que el catálogo vive en la base de datos. Se separa en un Server Component que hace el fetch y un Client Component que conserva toda la interactividad actual.

`src/app/carrito/CarritoContenido.tsx` (contenido idéntico al `CarritoPage` actual, pero recibe `productosExtra` como prop en vez de importarlo y filtrarlo):
```tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { ProductoCard } from "@/components/ProductoCard";
import { logoCompletoUrl } from "@/data/logoPiezas";
import { Producto } from "@/data/types";

const SIN_FOTO = "/placeholder.svg";

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function CarritoContenido({ productosExtra }: { productosExtra: Producto[] }) {
  const { items, subtotal, actualizarCantidad, actualizarNota, quitar } = useCart();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="mb-4 text-lg text-brand-black/70">Todavía no agregaste nada al carrito.</p>
        <Link href="/" className="rounded-md bg-brand-red px-4 py-2 font-semibold text-white">
          Ver el menú
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-brand-black">Tu carrito</h1>
      <ul className="mb-6 flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.id} className="border-b border-brand-black/10 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {item.imagenUrl && item.imagenUrl !== SIN_FOTO ? (
                  <img
                    src={item.imagenUrl}
                    alt=""
                    className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-brand-black">
                    <img src={logoCompletoUrl} alt="" aria-hidden="true" className="h-6 w-auto opacity-90" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-brand-black">{item.nombre}</p>
                  <p className="text-sm text-brand-black/60">{formatearPrecio(item.precioUnitario)} c/u</p>
                </div>
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
        ))}
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
        <span>Subtotal</span>
        <span>{formatearPrecio(subtotal)}</span>
      </div>
      <Link
        href="/checkout"
        className="block rounded-md bg-brand-red px-4 py-3 text-center font-semibold text-white"
      >
        Continuar
      </Link>
    </main>
  );
}
```

`src/app/carrito/page.tsx` (nuevo contenido completo, Server Component):
```tsx
import { obtenerProductos } from "@/lib/catalogo";
import { CarritoContenido } from "./CarritoContenido";

export default async function CarritoPage() {
  const productos = await obtenerProductos();
  const productosExtra = productos.filter((p) => p.categoria === "extra" || p.categoria === "bebida");
  return <CarritoContenido productosExtra={productosExtra} />;
}
```

- [ ] **Paso 3: Página de error para fallas de conexión a Supabase**

`src/app/error.tsx`:
```tsx
"use client";

export default function ErrorGlobal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-lg text-brand-black/70">No pudimos cargar el menú. Probá de nuevo.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-brand-red px-4 py-2 font-semibold text-white"
      >
        Reintentar
      </button>
    </main>
  );
}
```

- [ ] **Paso 4: Verificar en el navegador**

Run: `npm run dev`

Visitar `http://localhost:3000/` y confirmar que el catálogo se ve igual que antes (mismos productos, precios, combos activos). Agregar algo al carrito y visitar `/carrito`, confirmar que la sección "¿Querés agregar algo más?" muestra los extras/bebidas igual que antes.

- [ ] **Paso 5: Borrar los archivos de datos locales**

```bash
rm src/data/menu.ts src/data/combos.ts
```

- [ ] **Paso 6: Verificar que compila sin las referencias viejas**

Run: `npx tsc --noEmit && npx vitest run`
Expected: sin errores de tipos, todos los tests existentes siguen pasando.

- [ ] **Paso 7: Commit**

```bash
git add -A src/app/page.tsx src/app/carrito/page.tsx src/app/carrito/CarritoContenido.tsx src/app/error.tsx src/data/menu.ts src/data/combos.ts
git commit -m "feat: el sitio público lee el catálogo desde Supabase"
```

---

### Task 5: Proxy que protege las rutas `/admin`

**Files:**
- Create: `src/proxy.ts`

**Interfaces:**
- Produces: protección de sesión sobre `/admin/*` para todas las páginas creadas en Tasks 6-8. Excepciones sin sesión: `/admin/login`, `/admin/actualizar-contrasena`.

- [ ] **Paso 1: Implementar el proxy**

`src/proxy.ts` (Next.js 16 renombró `middleware.ts` a `proxy.ts` — ver Global Constraints):
```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const RUTAS_ADMIN_SIN_SESION = ["/admin/login", "/admin/actualizar-contrasena"];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const requiereSesion = pathname.startsWith("/admin") && !RUTAS_ADMIN_SIN_SESION.includes(pathname);

  if (requiereSesion && !user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return response;
}

export const config = {
  matcher: "/admin/:path*",
};
```

- [ ] **Paso 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: agregar proxy que protege las rutas /admin"
```

(La verificación funcional de esta protección se hace en Task 6, una vez que exista `/admin/login` para redirigir.)

---

### Task 6: Alta de Percy y página de login

**Files:**
- Create: `src/app/admin/login/page.tsx`

**Interfaces:**
- Consumes: `createSupabaseBrowserClient` de `src/lib/supabase/client.ts` (Task 1).

- [ ] **Paso 1: Dar de alta el usuario de Percy (manual)**

Nicolás va al dashboard de Supabase → Authentication → Users → "Add user", carga el email y una contraseña provisoria de Percy, y tilda "Auto Confirm User" (para no depender del mail de confirmación en este paso). Guarda esas credenciales en un lugar seguro para entregárselas a Percy más adelante.

- [ ] **Paso 2: Crear la página de login**

`src/app/admin/login/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviandoReset, setEnviandoReset] = useState(false);
  const [resetEnviado, setResetEnviado] = useState(false);

  async function manejarLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: errorLogin } = await supabase.auth.signInWithPassword({ email, password });
    if (errorLogin) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  async function manejarOlvideContrasena() {
    if (!email.trim()) {
      setError("Ingresá tu email arriba para poder enviarte el link.");
      return;
    }
    setEnviandoReset(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: errorReset } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/actualizar-contrasena`,
    });
    setEnviandoReset(false);
    if (errorReset) {
      setError("No pudimos enviar el mail de recuperación. Probá de nuevo.");
      return;
    }
    setResetEnviado(true);
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-bold text-brand-black">Ingresar</h1>
      <form onSubmit={manejarLogin} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="rounded-md border border-brand-black/20 px-3 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          required
          className="rounded-md border border-brand-black/20 px-3 py-2"
        />
        {error && <p className="text-sm text-brand-red">{error}</p>}
        <button type="submit" className="rounded-md bg-brand-red px-4 py-2 font-semibold text-white">
          Ingresar
        </button>
      </form>
      {resetEnviado ? (
        <p className="text-sm text-brand-black/70">Te enviamos un mail para restablecer tu contraseña.</p>
      ) : (
        <button
          type="button"
          onClick={manejarOlvideContrasena}
          disabled={enviandoReset}
          className="text-sm text-brand-orange-burnt underline disabled:opacity-50"
        >
          Olvidé mi contraseña
        </button>
      )}
    </main>
  );
}
```

(El botón "Olvidé mi contraseña" ya queda funcional en este paso; la página `/admin/actualizar-contrasena` a la que redirige el mail se crea en Task 8 — hasta entonces, el link del mail lleva a una ruta que todavía no existe.)

- [ ] **Paso 3: Verificar en el navegador**

Run: `npm run dev`

Visitar `http://localhost:3000/admin` sin sesión → debe redirigir a `/admin/login` (proxy de Task 5 en acción). En `/admin/login`, probar con credenciales inválidas → mensaje "Usuario o contraseña incorrectos.". Probar con las credenciales reales de Percy (Paso 1) → redirige a `/admin` (por ahora esa página no existe todavía, va a dar 404 — se crea en Task 7; confirmar igualmente que la redirección ocurre y que no hay error de login).

- [ ] **Paso 4: Commit**

```bash
git add src/app/admin/login/page.tsx
git commit -m "feat: agregar página de login para Percy"
```

---

### Task 7: Panel `/admin` protegido con lista de solo lectura y cerrar sesión

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/CerrarSesionButton.tsx`

**Interfaces:**
- Consumes: `createSupabaseServerClient` (Task 1), `obtenerProductos`/`obtenerCombos` (Task 2), `createSupabaseBrowserClient` (Task 1).

- [ ] **Paso 1: Botón de cerrar sesión**

`src/components/admin/CerrarSesionButton.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function CerrarSesionButton() {
  const router = useRouter();

  async function manejarCerrarSesion() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={manejarCerrarSesion} className="text-sm text-brand-red underline">
      Cerrar sesión
    </button>
  );
}
```

- [ ] **Paso 2: Página del panel**

`src/app/admin/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerProductos, obtenerCombos } from "@/lib/catalogo";
import { CerrarSesionButton } from "@/components/admin/CerrarSesionButton";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const [productos, combos] = await Promise.all([obtenerProductos(), obtenerCombos()]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-black">Panel de Percy Burger</h1>
        <CerrarSesionButton />
      </div>
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-brand-black">Productos ({productos.length})</h2>
        <ul className="flex flex-col gap-2">
          {productos.map((producto) => (
            <li key={producto.id} className="rounded-md border border-brand-black/10 px-3 py-2">
              <span className="font-medium">{producto.nombre}</span>
              <span className="ml-2 text-sm text-brand-black/60">{producto.categoria}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-black">Combos ({combos.length})</h2>
        <ul className="flex flex-col gap-2">
          {combos.map((combo) => (
            <li key={combo.id} className="rounded-md border border-brand-black/10 px-3 py-2">
              <span className="font-medium">{combo.nombre}</span>
              <span className="ml-2 text-sm text-brand-black/60">{combo.activo ? "activo" : "inactivo"}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Paso 3: Verificar end-to-end en el navegador**

Run: `npm run dev`

1. Visitar `/admin` sin sesión → redirige a `/admin/login`.
2. Loguearse con las credenciales de Percy → redirige a `/admin`, se ven 12 productos y 4 combos.
3. Click en "Cerrar sesión" → redirige a `/admin/login`.
4. Visitar `/admin` de nuevo (sesión ya cerrada) → redirige otra vez a `/admin/login`, no se ven datos.

- [ ] **Paso 4: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin/CerrarSesionButton.tsx
git commit -m "feat: agregar panel /admin con lista de solo lectura y cerrar sesión"
```

---

### Task 8: Recuperación de contraseña

**Files:**
- Create: `src/app/admin/actualizar-contrasena/page.tsx`

**Interfaces:**
- Consumes: `createSupabaseBrowserClient` (Task 1). Cierra el flujo iniciado por el botón "Olvidé mi contraseña" de Task 6.

- [ ] **Paso 1: Página para fijar la nueva contraseña**

`src/app/admin/actualizar-contrasena/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ActualizarContrasenaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function manejarGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setGuardando(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: errorUpdate } = await supabase.auth.updateUser({ password });
    setGuardando(false);
    if (errorUpdate) {
      setError("No pudimos actualizar la contraseña. Pedí un nuevo link de recuperación.");
      return;
    }
    router.push("/admin");
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-bold text-brand-black">Nueva contraseña</h1>
      <form onSubmit={manejarGuardar} className="flex flex-col gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
          required
          className="rounded-md border border-brand-black/20 px-3 py-2"
        />
        {error && <p className="text-sm text-brand-red">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="rounded-md bg-brand-red px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          Guardar
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Paso 2: Verificar en el navegador**

Run: `npm run dev`

Desde `/admin/login`, ingresar el email de Percy y click en "Olvidé mi contraseña" → aparece "Te enviamos un mail para restablecer tu contraseña.". Revisar la bandeja de entrada del email de Percy, abrir el link del mail → debe llevar a `/admin/actualizar-contrasena` con una sesión de recuperación activa (el proxy de Task 5 no debe redirigir esta ruta a login). Cargar una contraseña nueva de al menos 6 caracteres → redirige a `/admin` ya logueado. Cerrar sesión y volver a loguearse con la contraseña nueva para confirmar que quedó guardada.

- [ ] **Paso 3: Commit**

```bash
git add src/app/admin/actualizar-contrasena/page.tsx
git commit -m "feat: agregar flujo de recuperación de contraseña"
```

---

### Task 9: Verificación final end-to-end

Sin archivos nuevos — checklist de cierre antes de dar por terminado el sub-proyecto.

- [ ] **Paso 1: Suite completa de tests**

Run: `npx vitest run`
Expected: todos los tests pasan (los existentes de `cart`/`whatsapp` + los nuevos de `catalogo`).

- [ ] **Paso 2: Build de producción**

Run: `npm run build`
Expected: build exitoso, sin errores de tipos ni de lint.

- [ ] **Paso 3: Checklist manual en el navegador (dev)**

- [ ] Catálogo público (`/`) muestra los mismos productos/combos que antes de migrar, leídos desde Supabase.
- [ ] `/carrito` sigue permitiendo agregar extras/bebidas desde la propia página.
- [ ] Desconectar la red (o apagar temporalmente las variables de entorno) y confirmar que `/` muestra la pantalla de error controlada, no un crash en blanco — luego restaurar.
- [ ] `/admin` sin sesión redirige a `/admin/login`.
- [ ] Login con credenciales inválidas muestra el mensaje de error genérico.
- [ ] Login con las credenciales reales de Percy entra a `/admin` y lista productos/combos.
- [ ] "Cerrar sesión" vuelve a bloquear `/admin`.
- [ ] Flujo de "Olvidé mi contraseña" completo (mail → nueva contraseña → login con la nueva).

No requiere commit (no hay cambios de código en esta tarea) — si algún paso falla, se corrige en la tarea correspondiente y se vuelve a correr este checklist.
