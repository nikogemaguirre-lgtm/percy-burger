# CRUD de productos y combos en el panel de administración — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar crear, editar y borrar productos y combos desde `/admin`, hoy solo lectura, incluyendo subida real de imágenes y una relación estructurada combo↔producto.

**Architecture:** Mutaciones client-side con `supabase-js` (mismo patrón que el login/logout ya en producción), protegidas por RLS de Supabase. `page.tsx` sigue siendo Server Component (protegido por `src/proxy.ts`) que pasa los datos iniciales a Client Components que manejan estado local y mutaciones.

**Tech Stack:** Next.js 16 (App Router), React 19, `@supabase/supabase-js` + `@supabase/ssr`, Tailwind CSS v4, Vitest.

## Global Constraints

- Vista **solo desktop** en este sub-proyecto — la vista mobile minimalista queda para el sub-proyecto de gestión de pedidos.
- Sin Server Actions ni API routes propias — todas las mutaciones van directo desde el cliente autenticado vía `supabase-js`, coherente con el resto del proyecto.
- Combo pasa a tener una lista real de productos + cantidad (`productos: ComboItem[]`), reemplazando el vínculo inexistente que había hasta ahora — el campo `descripcion` de texto libre se mantiene como campo aparte.
- Borrar un producto referenciado en algún combo debe **bloquearse** con un aviso que liste los combos afectados (implementado con `on delete restrict` en la base + chequeo en memoria antes de intentar el borrado).
- Imágenes: subida real de archivo a Supabase Storage (bucket `catalogo`), tipos aceptados jpg/png/webp, máximo 5MB.
- Confirmación de borrado con `window.confirm` (sin modal separado), salvo el caso bloqueado por combos, que usa un modal de aviso.
- Todo el código en español (nombres de función, variables, mensajes de UI), siguiendo la convención ya establecida en el proyecto.
- Commits directos a `main`, sin branch separado — convención ya establecida en este proyecto.

---

### Task 1: Preparar base de datos y Storage en Supabase

**Files:**
- Create: `scripts/verificar-admin-crud.ts` (temporal — se borra en el Step 6 de esta misma tarea)
- Modify: `package.json` (agrega y luego quita el script `verificar-admin-crud`)

**Interfaces:**
- Consumes: nada (primera tarea).
- Produces: tabla `combo_productos` y bucket `catalogo` existiendo en Supabase — precondición de la que dependen las Tasks 2, 5, 6 y 7.

- [ ] **Step 1: Pedirle a Nicolás que corra el SQL en el SQL Editor de Supabase**

Este SQL ya está documentado en `docs/superpowers/specs/2026-08-16-panel-admin-crud-catalogo-design.md`. En este proyecto las tablas se crean a mano en el SQL Editor de Supabase (no versionado en el repo, mismo criterio que se usó con `productos`/`combos` en el sub-proyecto anterior), así que este paso es una acción humana, no un comando a ejecutar acá. Pedirle a Nicolás que entre al SQL Editor de su proyecto en Supabase y corra:

```sql
create table if not exists combo_productos (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references combos(id) on delete cascade,
  producto_id uuid not null references productos(id) on delete restrict,
  cantidad int not null default 1 check (cantidad > 0)
);

alter table combo_productos enable row level security;

drop policy if exists "combo_productos lectura pública" on combo_productos;
create policy "combo_productos lectura pública" on combo_productos
  for select using (true);

drop policy if exists "combo_productos escritura autenticada" on combo_productos;
create policy "combo_productos escritura autenticada" on combo_productos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('catalogo', 'catalogo', true)
on conflict (id) do nothing;

drop policy if exists "catalogo lectura pública" on storage.objects;
create policy "catalogo lectura pública" on storage.objects
  for select using (bucket_id = 'catalogo');

drop policy if exists "catalogo escritura autenticada" on storage.objects;
create policy "catalogo escritura autenticada" on storage.objects
  for all using (bucket_id = 'catalogo' and auth.role() = 'authenticated')
  with check (bucket_id = 'catalogo' and auth.role() = 'authenticated');
```

No avanzar al Step 2 hasta que Nicolás confirme que lo corrió sin errores.

- [ ] **Step 2: Crear el script de verificación**

Create `scripts/verificar-admin-crud.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
}

const supabase = createClient(url, serviceRoleKey);

async function verificar() {
  const { data: producto, error: errorProducto } = await supabase
    .from("productos")
    .select("id")
    .limit(1)
    .single();
  if (errorProducto || !producto) throw new Error("No se encontró ningún producto para probar la relación.");

  const { data: combo, error: errorCombo } = await supabase
    .from("combos")
    .insert({
      id: "verificacion-temporal",
      nombre: "Verificación temporal",
      descripcion: "Combo de prueba, se borra automáticamente.",
      precio: 1,
      imagen_url: "/placeholder.svg",
      activo: false,
    })
    .select()
    .single();
  if (errorCombo || !combo) throw new Error(`No se pudo insertar en combos: ${errorCombo?.message}`);
  console.log("Tabla combos: OK");

  const { error: errorItem } = await supabase
    .from("combo_productos")
    .insert({ combo_id: combo.id, producto_id: producto.id, cantidad: 1 });
  if (errorItem) throw new Error(`No se pudo insertar en combo_productos: ${errorItem.message}`);
  console.log("Tabla combo_productos: OK");

  const contenidoPrueba = new Blob(["prueba"], { type: "text/plain" });
  const { error: errorSubida } = await supabase.storage
    .from("catalogo")
    .upload("verificacion/prueba.txt", contenidoPrueba);
  if (errorSubida) throw new Error(`No se pudo subir a Storage: ${errorSubida.message}`);
  console.log("Bucket catalogo: OK");

  await supabase.storage.from("catalogo").remove(["verificacion/prueba.txt"]);
  await supabase.from("combos").delete().eq("id", "verificacion-temporal");
  console.log("Verificación completa. Limpieza de datos de prueba hecha.");
}

verificar();
```

- [ ] **Step 3: Agregar el script a `package.json`**

Modify `package.json` — dentro de `"scripts"`, agregar (mismo patrón que `migrar-catalogo`):

```json
"verificar-admin-crud": "tsx --env-file=.env.local scripts/verificar-admin-crud.ts"
```

- [ ] **Step 4: Correr el script**

Run: `npm run verificar-admin-crud`

Expected:
```
Tabla combos: OK
Tabla combo_productos: OK
Bucket catalogo: OK
Verificación completa. Limpieza de datos de prueba hecha.
```

Si falla, no seguir a la Task 2 — revisar que el SQL del Step 1 se haya corrido completo y sin errores.

- [ ] **Step 5: Borrar el script temporal y su entrada en `package.json`**

```bash
rm scripts/verificar-admin-crud.ts
```

Modify `package.json` — quitar la línea `"verificar-admin-crud": "..."` agregada en el Step 3.

- [ ] **Step 6: Commit**

```bash
git add package.json
git commit -m "chore: verificar tabla combo_productos y bucket catalogo en Supabase"
```

---

### Task 2: Extender tipos y mapeo de combos con productos

**Files:**
- Modify: `src/data/types.ts`
- Modify: `src/lib/catalogo.ts`
- Modify: `src/lib/catalogo.test.ts`

**Interfaces:**
- Consumes: nada nuevo (tipos base ya existentes).
- Produces: `ComboItem { productoId: string; cantidad: number }`, `Combo.productos: ComboItem[]`, `mapRowACombo(row: ComboRow, productos?: ComboItem[]): Combo` — usado por Task 3 (`combosQueUsanProducto`), Task 6 (`crearCombo`/`actualizarCombo`) y Task 12 (`CombosAdmin`).

- [ ] **Step 1: Escribir los tests (reemplazan los existentes de `mapRowACombo`)**

Modify `src/lib/catalogo.test.ts` (archivo completo):

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
  const row: ComboRow = {
    id: "promo-cheese-doble",
    nombre: "Promo Cheese Doble",
    descripcion: "Cheese Burger Doble + Papas + Gaseosa 500ml",
    precio: 11000,
    imagen_url: "/productos/promo-cheese-doble.jpg",
    activo: true,
  };

  it("mapea una fila de combo sin productos asociados", () => {
    expect(mapRowACombo(row)).toEqual({
      id: "promo-cheese-doble",
      nombre: "Promo Cheese Doble",
      descripcion: "Cheese Burger Doble + Papas + Gaseosa 500ml",
      precio: 11000,
      imagenUrl: "/productos/promo-cheese-doble.jpg",
      activo: true,
      productos: [],
    });
  });

  it("incluye los productos asociados cuando se pasan", () => {
    const productos = [
      { productoId: "cheese-burger", cantidad: 1 },
      { productoId: "papas", cantidad: 1 },
    ];

    expect(mapRowACombo(row, productos)).toEqual({
      id: "promo-cheese-doble",
      nombre: "Promo Cheese Doble",
      descripcion: "Cheese Burger Doble + Papas + Gaseosa 500ml",
      precio: 11000,
      imagenUrl: "/productos/promo-cheese-doble.jpg",
      activo: true,
      productos,
    });
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- catalogo.test.ts`
Expected: FAIL — `mapRowACombo` no acepta un segundo argumento / el resultado no incluye `productos`.

- [ ] **Step 3: Extender los tipos**

Modify `src/data/types.ts` — agregar `ComboItem` y el campo `productos` a `Combo`:

```ts
export interface ComboItem {
  productoId: string;
  cantidad: number;
}

export interface Combo {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagenUrl: string;
  activo: boolean;
  productos: ComboItem[];
}
```

- [ ] **Step 4: Extender `mapRowACombo` y `obtenerCombos`**

Modify `src/lib/catalogo.ts` (archivo completo):

```ts
import { Producto, Combo, ComboItem } from "@/data/types";
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

interface ComboProductoRow {
  producto_id: string;
  cantidad: number;
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

export function mapRowACombo(row: ComboRow, productos: ComboItem[] = []): Combo {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precio: row.precio,
    imagenUrl: row.imagen_url,
    activo: row.activo,
    productos,
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
  const { data, error } = await supabase.from("combos").select("*, combo_productos(producto_id, cantidad)");
  if (error) throw new Error(`No se pudieron obtener los combos: ${error.message}`);
  return (data as (ComboRow & { combo_productos: ComboProductoRow[] })[]).map((row) =>
    mapRowACombo(
      row,
      row.combo_productos.map((item) => ({ productoId: item.producto_id, cantidad: item.cantidad })),
    ),
  );
}
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `npm test -- catalogo.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/types.ts src/lib/catalogo.ts src/lib/catalogo.test.ts
git commit -m "feat: incluir los productos asociados a cada combo en el catálogo"
```

---

### Task 3: Función `combosQueUsanProducto`

**Files:**
- Create: `src/lib/catalogo-admin.ts`
- Create: `src/lib/catalogo-admin.test.ts`

**Interfaces:**
- Consumes: `Combo` de `@/data/types` (Task 2).
- Produces: `combosQueUsanProducto(combos: Combo[], productoId: string): Combo[]` — usado por Task 10 (`ProductosAdmin`) para el aviso de borrado bloqueado.

- [ ] **Step 1: Escribir el test**

Create `src/lib/catalogo-admin.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { combosQueUsanProducto } from "./catalogo-admin";
import type { Combo } from "@/data/types";

describe("combosQueUsanProducto", () => {
  const combos: Combo[] = [
    {
      id: "promo-1",
      nombre: "Promo 1",
      descripcion: "",
      precio: 1000,
      imagenUrl: "",
      activo: true,
      productos: [{ productoId: "cheese-burger", cantidad: 1 }],
    },
    {
      id: "promo-2",
      nombre: "Promo 2",
      descripcion: "",
      precio: 1000,
      imagenUrl: "",
      activo: true,
      productos: [{ productoId: "papas", cantidad: 1 }],
    },
  ];

  it("devuelve los combos que incluyen el producto", () => {
    expect(combosQueUsanProducto(combos, "cheese-burger")).toEqual([combos[0]]);
  });

  it("devuelve un arreglo vacío si ningún combo lo usa", () => {
    expect(combosQueUsanProducto(combos, "bebida-cola")).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- catalogo-admin.test.ts`
Expected: FAIL — `./catalogo-admin` no existe todavía.

- [ ] **Step 3: Crear `catalogo-admin.ts` con la función**

Create `src/lib/catalogo-admin.ts`:

```ts
import type { Combo } from "@/data/types";

export function combosQueUsanProducto(combos: Combo[], productoId: string): Combo[] {
  return combos.filter((combo) => combo.productos.some((item) => item.productoId === productoId));
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- catalogo-admin.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalogo-admin.ts src/lib/catalogo-admin.test.ts
git commit -m "feat: agregar combosQueUsanProducto para bloquear borrado de productos en uso"
```

---

### Task 4: Validaciones de formulario

**Files:**
- Modify: `src/lib/catalogo-admin.ts`
- Modify: `src/lib/catalogo-admin.test.ts`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `ProductoInput`, `ComboInput`, `validarProducto(input: ProductoInput): string | null`, `validarCombo(input: ComboInput): string | null`, `validarImagen(archivo: File): string | null` — usados por Task 5/6 (tipos de entrada de las mutaciones) y Task 9/11 (`ProductoForm`/`ComboForm`).

- [ ] **Step 1: Escribir los tests**

Modify `src/lib/catalogo-admin.test.ts` — agregar al final del archivo:

```ts

describe("validarProducto", () => {
  const base: ProductoInput = {
    categoria: "clasica",
    nombre: "Cheese Burger",
    ingredientes: "Pan, carne, cheddar",
    precios: { simple: 8500 },
    imagenUrl: "/placeholder.svg",
  };

  it("acepta un producto válido", () => {
    expect(validarProducto(base)).toBeNull();
  });

  it("rechaza nombre vacío", () => {
    expect(validarProducto({ ...base, nombre: "  " })).toBe("El nombre es obligatorio.");
  });

  it("rechaza precio simple en 0", () => {
    expect(validarProducto({ ...base, precios: { simple: 0 } })).toBe("El precio simple debe ser mayor a 0.");
  });
});

describe("validarCombo", () => {
  const base: ComboInput = {
    nombre: "Promo Cheese",
    descripcion: "Cheese + Papas",
    precio: 9000,
    imagenUrl: "/placeholder.svg",
    activo: true,
    productos: [],
  };

  it("acepta un combo válido", () => {
    expect(validarCombo(base)).toBeNull();
  });

  it("rechaza nombre vacío", () => {
    expect(validarCombo({ ...base, nombre: "" })).toBe("El nombre es obligatorio.");
  });

  it("rechaza precio en 0", () => {
    expect(validarCombo({ ...base, precio: 0 })).toBe("El precio debe ser mayor a 0.");
  });
});

describe("validarImagen", () => {
  it("acepta jpg dentro del límite de tamaño", () => {
    const archivo = { type: "image/jpeg", size: 1000 } as File;
    expect(validarImagen(archivo)).toBeNull();
  });

  it("rechaza un tipo no soportado", () => {
    const archivo = { type: "image/gif", size: 1000 } as File;
    expect(validarImagen(archivo)).toBe("La imagen debe ser JPG, PNG o WEBP.");
  });

  it("rechaza un archivo demasiado pesado", () => {
    const archivo = { type: "image/jpeg", size: 6 * 1024 * 1024 } as File;
    expect(validarImagen(archivo)).toBe("La imagen no puede pesar más de 5MB.");
  });
});
```

Also modify the top import line of `src/lib/catalogo-admin.test.ts` to bring in the new names:

```ts
import { describe, it, expect } from "vitest";
import { combosQueUsanProducto, validarProducto, validarCombo, validarImagen } from "./catalogo-admin";
import type { Combo } from "@/data/types";
import type { ProductoInput, ComboInput } from "./catalogo-admin";
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- catalogo-admin.test.ts`
Expected: FAIL — `validarProducto`/`validarCombo`/`validarImagen`/`ProductoInput`/`ComboInput` no existen todavía.

- [ ] **Step 3: Agregar los tipos y las validaciones**

Modify `src/lib/catalogo-admin.ts` — agregar al archivo (después del import, antes de `combosQueUsanProducto`):

```ts
import type { Producto, ComboItem } from "@/data/types";

export interface ProductoInput {
  categoria: Producto["categoria"];
  nombre: string;
  ingredientes: string;
  precios: Producto["precios"];
  imagenUrl: string;
}

export interface ComboInput {
  nombre: string;
  descripcion: string;
  precio: number;
  imagenUrl: string;
  activo: boolean;
  productos: ComboItem[];
}

export function validarProducto(input: ProductoInput): string | null {
  if (!input.nombre.trim()) return "El nombre es obligatorio.";
  if (!input.precios.simple || input.precios.simple <= 0) return "El precio simple debe ser mayor a 0.";
  return null;
}

export function validarCombo(input: ComboInput): string | null {
  if (!input.nombre.trim()) return "El nombre es obligatorio.";
  if (!input.precio || input.precio <= 0) return "El precio debe ser mayor a 0.";
  return null;
}

const TIPOS_IMAGEN_ACEPTADOS = ["image/jpeg", "image/png", "image/webp"];
const TAMAÑO_MAXIMO_IMAGEN = 5 * 1024 * 1024;

export function validarImagen(archivo: File): string | null {
  if (!TIPOS_IMAGEN_ACEPTADOS.includes(archivo.type)) return "La imagen debe ser JPG, PNG o WEBP.";
  if (archivo.size > TAMAÑO_MAXIMO_IMAGEN) return "La imagen no puede pesar más de 5MB.";
  return null;
}
```

(La línea `import type { Combo } from "@/data/types";` que ya estaba en el archivo se reemplaza por `import type { Producto, Combo, ComboItem } from "@/data/types";` para traer los tres tipos.)

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- catalogo-admin.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalogo-admin.ts src/lib/catalogo-admin.test.ts
git commit -m "feat: agregar validaciones de producto, combo e imagen"
```

---

### Task 5: Mutaciones de productos

**Files:**
- Modify: `src/lib/catalogo-admin.ts`
- Modify: `src/lib/catalogo-admin.test.ts`

**Interfaces:**
- Consumes: `ProductoInput` (Task 4), `mapRowAProducto`/`ProductoRow` (`./catalogo`), `createSupabaseBrowserClient` (`./supabase/client`).
- Produces: `crearProducto(input: ProductoInput): Promise<Producto>`, `actualizarProducto(id: string, input: ProductoInput): Promise<Producto>`, `borrarProducto(id: string): Promise<void>` — usados por Task 10 (`ProductosAdmin`).

- [ ] **Step 1: Escribir los tests**

Modify `src/lib/catalogo-admin.test.ts` — cambiar el bloque de imports del inicio del archivo a:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Combo } from "@/data/types";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("./supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ from: mockFrom }),
}));

import {
  combosQueUsanProducto,
  validarProducto,
  validarCombo,
  validarImagen,
  crearProducto,
  actualizarProducto,
  borrarProducto,
  type ProductoInput,
  type ComboInput,
} from "./catalogo-admin";

beforeEach(() => {
  mockFrom.mockReset();
});
```

Add at the end of the file:

```ts

describe("crearProducto", () => {
  it("inserta el producto y devuelve el resultado mapeado", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "papas-fritas",
        categoria: "extra",
        nombre: "Papas Fritas",
        ingredientes: "Porción grande",
        precio_simple: 4000,
        precio_doble: null,
        precio_triple: null,
        imagen_url: "/placeholder.svg",
      },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    mockFrom.mockReturnValue({ insert });

    const input: ProductoInput = {
      categoria: "extra",
      nombre: "Papas Fritas",
      ingredientes: "Porción grande",
      precios: { simple: 4000 },
      imagenUrl: "/placeholder.svg",
    };

    const resultado = await crearProducto(input);

    expect(mockFrom).toHaveBeenCalledWith("productos");
    expect(insert).toHaveBeenCalledWith({
      categoria: "extra",
      nombre: "Papas Fritas",
      ingredientes: "Porción grande",
      precio_simple: 4000,
      precio_doble: null,
      precio_triple: null,
      imagen_url: "/placeholder.svg",
    });
    expect(resultado).toEqual({
      id: "papas-fritas",
      categoria: "extra",
      nombre: "Papas Fritas",
      ingredientes: "Porción grande",
      precios: { simple: 4000 },
      imagenUrl: "/placeholder.svg",
    });
  });

  it("lanza un error si Supabase devuelve error", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "duplicate key" } });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    mockFrom.mockReturnValue({ insert });

    const input: ProductoInput = {
      categoria: "extra",
      nombre: "Papas Fritas",
      ingredientes: "Porción grande",
      precios: { simple: 4000 },
      imagenUrl: "/placeholder.svg",
    };

    await expect(crearProducto(input)).rejects.toThrow("duplicate key");
  });
});

describe("actualizarProducto", () => {
  it("actualiza el producto y devuelve el resultado mapeado", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "papas",
        categoria: "extra",
        nombre: "Papas Grandes",
        ingredientes: "Porción grande",
        precio_simple: 4500,
        precio_doble: null,
        precio_triple: null,
        imagen_url: "/placeholder.svg",
      },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ update });

    const input: ProductoInput = {
      categoria: "extra",
      nombre: "Papas Grandes",
      ingredientes: "Porción grande",
      precios: { simple: 4500 },
      imagenUrl: "/placeholder.svg",
    };

    const resultado = await actualizarProducto("papas", input);

    expect(mockFrom).toHaveBeenCalledWith("productos");
    expect(update).toHaveBeenCalledWith({
      categoria: "extra",
      nombre: "Papas Grandes",
      ingredientes: "Porción grande",
      precio_simple: 4500,
      precio_doble: null,
      precio_triple: null,
      imagen_url: "/placeholder.svg",
    });
    expect(eq).toHaveBeenCalledWith("id", "papas");
    expect(resultado.nombre).toBe("Papas Grandes");
  });
});

describe("borrarProducto", () => {
  it("borra el producto por id", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ delete: del });

    await borrarProducto("papas");

    expect(mockFrom).toHaveBeenCalledWith("productos");
    expect(eq).toHaveBeenCalledWith("id", "papas");
  });

  it("lanza un error si Supabase lo rechaza (ej. restricción de combo)", async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: "violates foreign key constraint" } });
    const del = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ delete: del });

    await expect(borrarProducto("papas")).rejects.toThrow("violates foreign key constraint");
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- catalogo-admin.test.ts`
Expected: FAIL — `crearProducto`/`actualizarProducto`/`borrarProducto` no existen todavía.

- [ ] **Step 3: Implementar las mutaciones**

Modify `src/lib/catalogo-admin.ts` — agregar al final del archivo (y agregar el import de `createSupabaseBrowserClient`, `mapRowAProducto` y `ProductoRow` al inicio):

```ts
import { createSupabaseBrowserClient } from "./supabase/client";
import { mapRowAProducto, type ProductoRow } from "./catalogo";
```

```ts

export async function crearProducto(input: ProductoInput): Promise<Producto> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("productos")
    .insert({
      categoria: input.categoria,
      nombre: input.nombre,
      ingredientes: input.ingredientes,
      precio_simple: input.precios.simple,
      precio_doble: input.precios.doble ?? null,
      precio_triple: input.precios.triple ?? null,
      imagen_url: input.imagenUrl,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRowAProducto(data as ProductoRow);
}

export async function actualizarProducto(id: string, input: ProductoInput): Promise<Producto> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("productos")
    .update({
      categoria: input.categoria,
      nombre: input.nombre,
      ingredientes: input.ingredientes,
      precio_simple: input.precios.simple,
      precio_doble: input.precios.doble ?? null,
      precio_triple: input.precios.triple ?? null,
      imagen_url: input.imagenUrl,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRowAProducto(data as ProductoRow);
}

export async function borrarProducto(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
```

Note: `import type { Producto, ... } from "@/data/types";` ya presente en el archivo debe pasar a ser un import normal (no `type`) porque `Producto` ahora se usa como tipo de retorno en valor de función — en TypeScript esto sigue siendo válido como `import type` ya que solo se usa en posición de tipo, así que no hace falta cambiarlo.

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- catalogo-admin.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalogo-admin.ts src/lib/catalogo-admin.test.ts
git commit -m "feat: agregar mutaciones de productos (crear, actualizar, borrar)"
```

---

### Task 6: Mutaciones de combos

**Files:**
- Modify: `src/lib/catalogo-admin.ts`
- Modify: `src/lib/catalogo-admin.test.ts`

**Interfaces:**
- Consumes: `ComboInput` (Task 4), `mapRowACombo`/`ComboRow` (`./catalogo`, Task 2), `createSupabaseBrowserClient` (Task 5).
- Produces: `crearCombo(input: ComboInput): Promise<Combo>`, `actualizarCombo(id: string, input: ComboInput): Promise<Combo>`, `borrarCombo(id: string): Promise<void>` — usados por Task 12 (`CombosAdmin`).

- [ ] **Step 1: Escribir los tests**

Modify `src/lib/catalogo-admin.test.ts` — agregar `crearCombo, actualizarCombo, borrarCombo` al import de `"./catalogo-admin"`, y agregar al final del archivo:

```ts

describe("crearCombo", () => {
  it("inserta el combo y sus productos, y devuelve el resultado mapeado", async () => {
    const singleCombo = vi.fn().mockResolvedValue({
      data: {
        id: "promo-nueva",
        nombre: "Promo Nueva",
        descripcion: "Cheese + Papas",
        precio: 9000,
        imagen_url: "/placeholder.svg",
        activo: true,
      },
      error: null,
    });
    const selectCombo = vi.fn(() => ({ single: singleCombo }));
    const insertCombo = vi.fn(() => ({ select: selectCombo }));
    const insertItems = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "combos") return { insert: insertCombo };
      if (tabla === "combo_productos") return { insert: insertItems };
      throw new Error(`tabla inesperada: ${tabla}`);
    });

    const input: ComboInput = {
      nombre: "Promo Nueva",
      descripcion: "Cheese + Papas",
      precio: 9000,
      imagenUrl: "/placeholder.svg",
      activo: true,
      productos: [{ productoId: "cheese-burger", cantidad: 1 }],
    };

    const resultado = await crearCombo(input);

    expect(insertCombo).toHaveBeenCalledWith({
      nombre: "Promo Nueva",
      descripcion: "Cheese + Papas",
      precio: 9000,
      imagen_url: "/placeholder.svg",
      activo: true,
    });
    expect(insertItems).toHaveBeenCalledWith([
      { combo_id: "promo-nueva", producto_id: "cheese-burger", cantidad: 1 },
    ]);
    expect(resultado).toEqual({
      id: "promo-nueva",
      nombre: "Promo Nueva",
      descripcion: "Cheese + Papas",
      precio: 9000,
      imagenUrl: "/placeholder.svg",
      activo: true,
      productos: [{ productoId: "cheese-burger", cantidad: 1 }],
    });
  });

  it("no inserta en combo_productos si el combo no tiene productos", async () => {
    const singleCombo = vi.fn().mockResolvedValue({
      data: {
        id: "promo-vacia",
        nombre: "Promo Vacía",
        descripcion: "",
        precio: 1000,
        imagen_url: "/placeholder.svg",
        activo: true,
      },
      error: null,
    });
    const selectCombo = vi.fn(() => ({ single: singleCombo }));
    const insertCombo = vi.fn(() => ({ select: selectCombo }));
    const insertItems = vi.fn();

    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "combos") return { insert: insertCombo };
      if (tabla === "combo_productos") return { insert: insertItems };
      throw new Error(`tabla inesperada: ${tabla}`);
    });

    await crearCombo({
      nombre: "Promo Vacía",
      descripcion: "",
      precio: 1000,
      imagenUrl: "/placeholder.svg",
      activo: true,
      productos: [],
    });

    expect(insertItems).not.toHaveBeenCalled();
  });
});

describe("actualizarCombo", () => {
  it("actualiza el combo, reemplaza sus productos y devuelve el resultado mapeado", async () => {
    const singleCombo = vi.fn().mockResolvedValue({
      data: {
        id: "promo-cheese-doble",
        nombre: "Promo Cheese Doble",
        descripcion: "Actualizada",
        precio: 12000,
        imagen_url: "/placeholder.svg",
        activo: true,
      },
      error: null,
    });
    const selectCombo = vi.fn(() => ({ single: singleCombo }));
    const eqUpdate = vi.fn(() => ({ select: selectCombo }));
    const updateCombo = vi.fn(() => ({ eq: eqUpdate }));

    const eqDelete = vi.fn().mockResolvedValue({ error: null });
    const deleteItems = vi.fn(() => ({ eq: eqDelete }));
    const insertItems = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "combos") return { update: updateCombo };
      if (tabla === "combo_productos") return { delete: deleteItems, insert: insertItems };
      throw new Error(`tabla inesperada: ${tabla}`);
    });

    const input: ComboInput = {
      nombre: "Promo Cheese Doble",
      descripcion: "Actualizada",
      precio: 12000,
      imagenUrl: "/placeholder.svg",
      activo: true,
      productos: [{ productoId: "cheese-burger", cantidad: 2 }],
    };

    const resultado = await actualizarCombo("promo-cheese-doble", input);

    expect(eqUpdate).toHaveBeenCalledWith("id", "promo-cheese-doble");
    expect(eqDelete).toHaveBeenCalledWith("combo_id", "promo-cheese-doble");
    expect(insertItems).toHaveBeenCalledWith([
      { combo_id: "promo-cheese-doble", producto_id: "cheese-burger", cantidad: 2 },
    ]);
    expect(resultado.productos).toEqual([{ productoId: "cheese-burger", cantidad: 2 }]);
  });
});

describe("borrarCombo", () => {
  it("borra el combo por id", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ delete: del });

    await borrarCombo("promo-vieja");

    expect(mockFrom).toHaveBeenCalledWith("combos");
    expect(eq).toHaveBeenCalledWith("id", "promo-vieja");
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- catalogo-admin.test.ts`
Expected: FAIL — `crearCombo`/`actualizarCombo`/`borrarCombo` no existen todavía.

- [ ] **Step 3: Implementar las mutaciones**

Modify `src/lib/catalogo-admin.ts` — agregar `mapRowACombo, type ComboRow` al import de `"./catalogo"` (queda `import { mapRowAProducto, mapRowACombo, type ProductoRow, type ComboRow } from "./catalogo";`), y agregar al final del archivo:

```ts

export async function crearCombo(input: ComboInput): Promise<Combo> {
  const supabase = createSupabaseBrowserClient();
  const { data: comboData, error: comboError } = await supabase
    .from("combos")
    .insert({
      nombre: input.nombre,
      descripcion: input.descripcion,
      precio: input.precio,
      imagen_url: input.imagenUrl,
      activo: input.activo,
    })
    .select()
    .single();

  if (comboError) throw new Error(comboError.message);
  const combo = comboData as ComboRow;

  if (input.productos.length > 0) {
    const { error: itemsError } = await supabase.from("combo_productos").insert(
      input.productos.map((item) => ({
        combo_id: combo.id,
        producto_id: item.productoId,
        cantidad: item.cantidad,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);
  }

  return mapRowACombo(combo, input.productos);
}

export async function actualizarCombo(id: string, input: ComboInput): Promise<Combo> {
  const supabase = createSupabaseBrowserClient();
  const { data: comboData, error: comboError } = await supabase
    .from("combos")
    .update({
      nombre: input.nombre,
      descripcion: input.descripcion,
      precio: input.precio,
      imagen_url: input.imagenUrl,
      activo: input.activo,
    })
    .eq("id", id)
    .select()
    .single();

  if (comboError) throw new Error(comboError.message);

  const { error: borrarError } = await supabase.from("combo_productos").delete().eq("combo_id", id);
  if (borrarError) throw new Error(borrarError.message);

  if (input.productos.length > 0) {
    const { error: itemsError } = await supabase.from("combo_productos").insert(
      input.productos.map((item) => ({
        combo_id: id,
        producto_id: item.productoId,
        cantidad: item.cantidad,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);
  }

  return mapRowACombo(comboData as ComboRow, input.productos);
}

export async function borrarCombo(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("combos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
```

Also add `import type { Combo } from "@/data/types";` if not already present as a value-capable import (it already is, from Task 3/5 — `Combo` is imported as part of `type Producto, Combo, ComboItem`).

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- catalogo-admin.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalogo-admin.ts src/lib/catalogo-admin.test.ts
git commit -m "feat: agregar mutaciones de combos (crear, actualizar, borrar)"
```

---

### Task 7: Subida de imagen a Storage

**Files:**
- Modify: `src/lib/catalogo-admin.ts`
- Modify: `src/lib/catalogo-admin.test.ts`

**Interfaces:**
- Consumes: `createSupabaseBrowserClient` (Task 5).
- Produces: `subirImagenCatalogo(tipo: "productos" | "combos", id: string, archivo: File): Promise<string>` — usado por Task 9 (`ProductoForm`) y Task 11 (`ComboForm`).

- [ ] **Step 1: Escribir el test**

Modify `src/lib/catalogo-admin.test.ts` — agregar `subirImagenCatalogo` al import de `"./catalogo-admin"`, y agregar al final del archivo:

```ts

describe("subirImagenCatalogo", () => {
  it("sube el archivo y devuelve la URL pública", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://ejemplo.supabase.co/storage/v1/object/public/catalogo/productos/papas-123.jpg" },
    });
    mockStorageFrom.mockReturnValue({ upload, getPublicUrl });

    const archivo = { name: "foto.jpg", type: "image/jpeg", size: 1000 } as File;
    vi.spyOn(Date, "now").mockReturnValue(123);

    const url = await subirImagenCatalogo("productos", "papas", archivo);

    expect(mockStorageFrom).toHaveBeenCalledWith("catalogo");
    expect(upload).toHaveBeenCalledWith("productos/papas-123.jpg", archivo);
    expect(url).toBe("https://ejemplo.supabase.co/storage/v1/object/public/catalogo/productos/papas-123.jpg");

    vi.restoreAllMocks();
  });

  it("lanza un error si la subida falla", async () => {
    const upload = vi.fn().mockResolvedValue({ error: { message: "storage error" } });
    mockStorageFrom.mockReturnValue({ upload, getPublicUrl: vi.fn() });

    const archivo = { name: "foto.jpg", type: "image/jpeg", size: 1000 } as File;

    await expect(subirImagenCatalogo("productos", "papas", archivo)).rejects.toThrow("storage error");
  });
});
```

Also update the top of the file: add `mockStorageFrom` to the `vi.hoisted` block and to the mocked module, and reset it in `beforeEach`:

```ts
const { mockFrom, mockStorageFrom } = vi.hoisted(() => ({ mockFrom: vi.fn(), mockStorageFrom: vi.fn() }));

vi.mock("./supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ from: mockFrom, storage: { from: mockStorageFrom } }),
}));
```

```ts
beforeEach(() => {
  mockFrom.mockReset();
  mockStorageFrom.mockReset();
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- catalogo-admin.test.ts`
Expected: FAIL — `subirImagenCatalogo` no existe todavía.

- [ ] **Step 3: Implementar la función**

Modify `src/lib/catalogo-admin.ts` — agregar al final del archivo:

```ts

export async function subirImagenCatalogo(
  tipo: "productos" | "combos",
  id: string,
  archivo: File,
): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const extension = archivo.name.split(".").pop();
  const path = `${tipo}/${id}-${Date.now()}.${extension}`;

  const { error: errorSubida } = await supabase.storage.from("catalogo").upload(path, archivo);
  if (errorSubida) throw new Error(errorSubida.message);

  const { data } = supabase.storage.from("catalogo").getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- catalogo-admin.test.ts`
Expected: PASS

- [ ] **Step 5: Correr toda la suite de tests**

Run: `npm test`
Expected: PASS (todos los archivos, incluye `cart.test.ts`, `whatsapp.test.ts`, `catalogo.test.ts`, `catalogo-admin.test.ts`)

- [ ] **Step 6: Commit**

```bash
git add src/lib/catalogo-admin.ts src/lib/catalogo-admin.test.ts
git commit -m "feat: agregar subida de imágenes de productos y combos a Supabase Storage"
```

---

### Task 8: Componente `AdminModal`

**Files:**
- Create: `src/components/admin/AdminModal.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `AdminModal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode })` — usado por Task 10 (`ProductosAdmin`) y Task 12 (`CombosAdmin`).

No hay infraestructura de testing de componentes React en este proyecto (Vitest se usa solo para lógica pura) — este componente se verifica visualmente en el Task 13.

- [ ] **Step 1: Crear el componente**

Create `src/components/admin/AdminModal.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

export function AdminModal({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-black">{titulo}</h2>
          <button type="button" onClick={onClose} className="text-brand-black/60" aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que el proyecto sigue compilando**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminModal.tsx
git commit -m "feat: agregar AdminModal reusable para el panel"
```

---

### Task 9: Componente `ProductoForm`

**Files:**
- Create: `src/components/admin/ProductoForm.tsx`

**Interfaces:**
- Consumes: `Producto`, `Tamaño` (`@/data/types`), `ProductoInput`, `validarProducto`, `validarImagen`, `subirImagenCatalogo` (`@/lib/catalogo-admin`, Tasks 4/7).
- Produces: `ProductoForm({ productoInicial, onGuardar, onCancelar })` — usado por Task 10 (`ProductosAdmin`).

- [ ] **Step 1: Crear el componente**

Create `src/components/admin/ProductoForm.tsx`:

```tsx
"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Producto } from "@/data/types";
import { ProductoInput, validarProducto, validarImagen, subirImagenCatalogo } from "@/lib/catalogo-admin";

const CATEGORIAS: Producto["categoria"][] = ["clasica", "especial", "extra", "bebida"];

export function ProductoForm({
  productoInicial,
  onGuardar,
  onCancelar,
}: {
  productoInicial?: Producto;
  onGuardar: (input: ProductoInput) => Promise<void>;
  onCancelar: () => void;
}) {
  const [categoria, setCategoria] = useState<Producto["categoria"]>(productoInicial?.categoria ?? "clasica");
  const [nombre, setNombre] = useState(productoInicial?.nombre ?? "");
  const [ingredientes, setIngredientes] = useState(productoInicial?.ingredientes ?? "");
  const [precioSimple, setPrecioSimple] = useState(String(productoInicial?.precios.simple ?? ""));
  const [precioDoble, setPrecioDoble] = useState(String(productoInicial?.precios.doble ?? ""));
  const [precioTriple, setPrecioTriple] = useState(String(productoInicial?.precios.triple ?? ""));
  const [imagenUrl, setImagenUrl] = useState(productoInicial?.imagenUrl ?? "/placeholder.svg");
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function manejarSeleccionImagen(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const errorImagen = validarImagen(archivo);
    if (errorImagen) {
      setError(errorImagen);
      return;
    }
    setSubiendoImagen(true);
    setError(null);
    try {
      const id = productoInicial?.id ?? `nuevo-${Date.now()}`;
      const url = await subirImagenCatalogo("productos", id, archivo);
      setImagenUrl(url);
    } catch {
      setError("No pudimos subir la imagen. Probá de nuevo.");
    } finally {
      setSubiendoImagen(false);
    }
  }

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    const input: ProductoInput = {
      categoria,
      nombre,
      ingredientes,
      precios: {
        simple: Number(precioSimple),
        ...(precioDoble ? { doble: Number(precioDoble) } : {}),
        ...(precioTriple ? { triple: Number(precioTriple) } : {}),
      },
      imagenUrl,
    };
    const errorValidacion = validarProducto(input);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onGuardar(input);
    } catch {
      setError("No pudimos guardar el producto. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarSubmit} className="flex flex-col gap-3">
      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value as Producto["categoria"])}
        className="rounded-md border border-brand-black/20 px-3 py-2"
      >
        {CATEGORIAS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre"
        required
        className="rounded-md border border-brand-black/20 px-3 py-2"
      />
      <textarea
        value={ingredientes}
        onChange={(e) => setIngredientes(e.target.value)}
        placeholder="Ingredientes"
        className="rounded-md border border-brand-black/20 px-3 py-2"
      />
      <div className="flex gap-2">
        <input
          type="number"
          value={precioSimple}
          onChange={(e) => setPrecioSimple(e.target.value)}
          placeholder="Precio simple"
          required
          className="w-full rounded-md border border-brand-black/20 px-3 py-2"
        />
        <input
          type="number"
          value={precioDoble}
          onChange={(e) => setPrecioDoble(e.target.value)}
          placeholder="Precio doble (opcional)"
          className="w-full rounded-md border border-brand-black/20 px-3 py-2"
        />
        <input
          type="number"
          value={precioTriple}
          onChange={(e) => setPrecioTriple(e.target.value)}
          placeholder="Precio triple (opcional)"
          className="w-full rounded-md border border-brand-black/20 px-3 py-2"
        />
      </div>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={manejarSeleccionImagen} />
      {subiendoImagen && <p className="text-sm text-brand-black/60">Subiendo imagen...</p>}
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="rounded-md px-4 py-2 text-sm text-brand-black/70">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando || subiendoImagen}
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verificar que el proyecto sigue compilando**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ProductoForm.tsx
git commit -m "feat: agregar ProductoForm para crear y editar productos"
```

---

### Task 10: Componente `ProductosAdmin` y wiring en `page.tsx`

**Files:**
- Create: `src/components/admin/ProductosAdmin.tsx`
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `AdminModal` (Task 8), `ProductoForm` (Task 9), `ProductoInput`, `crearProducto`, `actualizarProducto`, `borrarProducto`, `combosQueUsanProducto` (`@/lib/catalogo-admin`, Tasks 3/5).
- Produces: `ProductosAdmin({ productosIniciales, combos })` renderizado en `/admin`.

- [ ] **Step 1: Crear el componente**

Create `src/components/admin/ProductosAdmin.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Producto, Combo } from "@/data/types";
import { AdminModal } from "./AdminModal";
import { ProductoForm } from "./ProductoForm";
import {
  ProductoInput,
  crearProducto,
  actualizarProducto,
  borrarProducto,
  combosQueUsanProducto,
} from "@/lib/catalogo-admin";

export function ProductosAdmin({
  productosIniciales,
  combos,
}: {
  productosIniciales: Producto[];
  combos: Combo[];
}) {
  const [productos, setProductos] = useState(productosIniciales);
  const [editando, setEditando] = useState<Producto | "nuevo" | null>(null);
  const [avisoBorrado, setAvisoBorrado] = useState<{ producto: Producto; combos: Combo[] } | null>(null);

  async function manejarGuardar(input: ProductoInput) {
    if (editando === "nuevo") {
      const creado = await crearProducto(input);
      setProductos((prev) => [...prev, creado]);
    } else if (editando) {
      const actualizado = await actualizarProducto(editando.id, input);
      setProductos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
    }
    setEditando(null);
  }

  function manejarBorrar(producto: Producto) {
    const combosAfectados = combosQueUsanProducto(combos, producto.id);
    if (combosAfectados.length > 0) {
      setAvisoBorrado({ producto, combos: combosAfectados });
      return;
    }
    if (!window.confirm(`¿Borrar "${producto.nombre}"?`)) return;
    borrarProducto(producto.id).then(() => {
      setProductos((prev) => prev.filter((p) => p.id !== producto.id));
    });
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">Productos ({productos.length})</h2>
        <button
          type="button"
          onClick={() => setEditando("nuevo")}
          className="rounded-md bg-brand-orange px-3 py-1 text-sm font-semibold text-white"
        >
          Nuevo
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {productos.map((producto) => (
          <li
            key={producto.id}
            className="flex items-center justify-between rounded-md border border-brand-black/10 px-3 py-2"
          >
            <div>
              <span className="font-medium">{producto.nombre}</span>
              <span className="ml-2 text-sm text-brand-black/60">{producto.categoria}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(producto)}
                className="text-sm text-brand-orange-burnt underline"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => manejarBorrar(producto)}
                className="text-sm text-brand-red underline"
              >
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {editando && (
        <AdminModal
          titulo={editando === "nuevo" ? "Nuevo producto" : "Editar producto"}
          onClose={() => setEditando(null)}
        >
          <ProductoForm
            productoInicial={editando === "nuevo" ? undefined : editando}
            onGuardar={manejarGuardar}
            onCancelar={() => setEditando(null)}
          />
        </AdminModal>
      )}
      {avisoBorrado && (
        <AdminModal titulo="No se puede borrar" onClose={() => setAvisoBorrado(null)}>
          <p className="text-sm text-brand-black/80">
            &quot;{avisoBorrado.producto.nombre}&quot; está incluido en:{" "}
            {avisoBorrado.combos.map((c) => c.nombre).join(", ")}. Sacalo de esos combos antes de borrarlo.
          </p>
        </AdminModal>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Conectar en `page.tsx`**

Modify `src/app/admin/page.tsx` (archivo completo):

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerProductos, obtenerCombos } from "@/lib/catalogo";
import { CerrarSesionButton } from "@/components/admin/CerrarSesionButton";
import { ProductosAdmin } from "@/components/admin/ProductosAdmin";

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
      <ProductosAdmin productosIniciales={productos} combos={combos} />
    </main>
  );
}
```

(La sección de combos se agrega en la Task 12 — por ahora `page.tsx` solo renderiza productos, y esta tarea ya deja `/admin` funcional para el CRUD de productos de punta a punta.)

- [ ] **Step 3: Verificar que el proyecto sigue compilando**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ProductosAdmin.tsx src/app/admin/page.tsx
git commit -m "feat: conectar CRUD de productos en /admin"
```

---

### Task 11: Componente `ComboForm`

**Files:**
- Create: `src/components/admin/ComboForm.tsx`

**Interfaces:**
- Consumes: `Producto`, `Combo`, `ComboItem` (`@/data/types`), `ComboInput`, `validarCombo`, `validarImagen`, `subirImagenCatalogo` (`@/lib/catalogo-admin`, Tasks 4/7).
- Produces: `ComboForm({ comboInicial, productosDisponibles, onGuardar, onCancelar })` — usado por Task 12 (`CombosAdmin`).

- [ ] **Step 1: Crear el componente**

Create `src/components/admin/ComboForm.tsx`:

```tsx
"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Producto, Combo, ComboItem } from "@/data/types";
import { ComboInput, validarCombo, validarImagen, subirImagenCatalogo } from "@/lib/catalogo-admin";

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function ComboForm({
  comboInicial,
  productosDisponibles,
  onGuardar,
  onCancelar,
}: {
  comboInicial?: Combo;
  productosDisponibles: Producto[];
  onGuardar: (input: ComboInput) => Promise<void>;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(comboInicial?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(comboInicial?.descripcion ?? "");
  const [precio, setPrecio] = useState(String(comboInicial?.precio ?? ""));
  const [activo, setActivo] = useState(comboInicial?.activo ?? true);
  const [imagenUrl, setImagenUrl] = useState(comboInicial?.imagenUrl ?? "/placeholder.svg");
  const [items, setItems] = useState<ComboItem[]>(comboInicial?.productos ?? []);
  const [productoAAgregar, setProductoAAgregar] = useState(productosDisponibles[0]?.id ?? "");
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function agregarItem() {
    if (!productoAAgregar) return;
    if (items.some((item) => item.productoId === productoAAgregar)) return;
    setItems((prev) => [...prev, { productoId: productoAAgregar, cantidad: 1 }]);
  }

  function quitarItem(productoId: string) {
    setItems((prev) => prev.filter((item) => item.productoId !== productoId));
  }

  function cambiarCantidad(productoId: string, cantidad: number) {
    setItems((prev) => prev.map((item) => (item.productoId === productoId ? { ...item, cantidad } : item)));
  }

  async function manejarSeleccionImagen(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const errorImagen = validarImagen(archivo);
    if (errorImagen) {
      setError(errorImagen);
      return;
    }
    setSubiendoImagen(true);
    setError(null);
    try {
      const id = comboInicial?.id ?? `nuevo-${Date.now()}`;
      const url = await subirImagenCatalogo("combos", id, archivo);
      setImagenUrl(url);
    } catch {
      setError("No pudimos subir la imagen. Probá de nuevo.");
    } finally {
      setSubiendoImagen(false);
    }
  }

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    const input: ComboInput = {
      nombre,
      descripcion,
      precio: Number(precio),
      imagenUrl,
      activo,
      productos: items,
    };
    const errorValidacion = validarCombo(input);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onGuardar(input);
    } catch {
      setError("No pudimos guardar el combo. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarSubmit} className="flex flex-col gap-3">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre"
        required
        className="rounded-md border border-brand-black/20 px-3 py-2"
      />
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción"
        className="rounded-md border border-brand-black/20 px-3 py-2"
      />
      <input
        type="number"
        value={precio}
        onChange={(e) => setPrecio(e.target.value)}
        placeholder="Precio"
        required
        className="rounded-md border border-brand-black/20 px-3 py-2"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
        Activo
      </label>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={manejarSeleccionImagen} />
      {subiendoImagen && <p className="text-sm text-brand-black/60">Subiendo imagen...</p>}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-brand-black">Productos del combo</h3>
        <ul className="mb-2 flex flex-col gap-1">
          {items.map((item) => {
            const producto = productosDisponibles.find((p) => p.id === item.productoId);
            return (
              <li key={item.productoId} className="flex items-center justify-between text-sm">
                <span>{producto?.nombre ?? item.productoId}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={(e) => cambiarCantidad(item.productoId, Number(e.target.value))}
                    className="w-16 rounded-md border border-brand-black/20 px-2 py-1"
                  />
                  <button type="button" onClick={() => quitarItem(item.productoId)} className="text-brand-red">
                    Quitar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2">
          <select
            value={productoAAgregar}
            onChange={(e) => setProductoAAgregar(e.target.value)}
            className="flex-1 rounded-md border border-brand-black/20 px-3 py-2"
          >
            {productosDisponibles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({formatearPrecio(p.precios.simple)})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={agregarItem}
            className="rounded-md bg-brand-orange px-3 py-2 text-sm text-white"
          >
            Agregar
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-brand-red">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="rounded-md px-4 py-2 text-sm text-brand-black/70">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando || subiendoImagen}
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verificar que el proyecto sigue compilando**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ComboForm.tsx
git commit -m "feat: agregar ComboForm con selector de productos y cantidades"
```

---

### Task 12: Componente `CombosAdmin` y wiring final en `page.tsx`

**Files:**
- Create: `src/components/admin/CombosAdmin.tsx`
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `AdminModal` (Task 8), `ComboForm` (Task 11), `ComboInput`, `crearCombo`, `actualizarCombo`, `borrarCombo` (`@/lib/catalogo-admin`, Task 6).
- Produces: `CombosAdmin({ combosIniciales, productosDisponibles })` renderizado en `/admin`.

- [ ] **Step 1: Crear el componente**

Create `src/components/admin/CombosAdmin.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Producto, Combo } from "@/data/types";
import { AdminModal } from "./AdminModal";
import { ComboForm } from "./ComboForm";
import { ComboInput, crearCombo, actualizarCombo, borrarCombo } from "@/lib/catalogo-admin";

export function CombosAdmin({
  combosIniciales,
  productosDisponibles,
}: {
  combosIniciales: Combo[];
  productosDisponibles: Producto[];
}) {
  const [combos, setCombos] = useState(combosIniciales);
  const [editando, setEditando] = useState<Combo | "nuevo" | null>(null);

  async function manejarGuardar(input: ComboInput) {
    if (editando === "nuevo") {
      const creado = await crearCombo(input);
      setCombos((prev) => [...prev, creado]);
    } else if (editando) {
      const actualizado = await actualizarCombo(editando.id, input);
      setCombos((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
    }
    setEditando(null);
  }

  function manejarBorrar(combo: Combo) {
    if (!window.confirm(`¿Borrar "${combo.nombre}"?`)) return;
    borrarCombo(combo.id).then(() => {
      setCombos((prev) => prev.filter((c) => c.id !== combo.id));
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-black">Combos ({combos.length})</h2>
        <button
          type="button"
          onClick={() => setEditando("nuevo")}
          className="rounded-md bg-brand-orange px-3 py-1 text-sm font-semibold text-white"
        >
          Nuevo
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {combos.map((combo) => (
          <li
            key={combo.id}
            className="flex items-center justify-between rounded-md border border-brand-black/10 px-3 py-2"
          >
            <div>
              <span className="font-medium">{combo.nombre}</span>
              <span className="ml-2 text-sm text-brand-black/60">{combo.activo ? "activo" : "inactivo"}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(combo)}
                className="text-sm text-brand-orange-burnt underline"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => manejarBorrar(combo)}
                className="text-sm text-brand-red underline"
              >
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {editando && (
        <AdminModal titulo={editando === "nuevo" ? "Nuevo combo" : "Editar combo"} onClose={() => setEditando(null)}>
          <ComboForm
            comboInicial={editando === "nuevo" ? undefined : editando}
            productosDisponibles={productosDisponibles}
            onGuardar={manejarGuardar}
            onCancelar={() => setEditando(null)}
          />
        </AdminModal>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Conectar en `page.tsx`**

Modify `src/app/admin/page.tsx` (archivo completo):

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerProductos, obtenerCombos } from "@/lib/catalogo";
import { CerrarSesionButton } from "@/components/admin/CerrarSesionButton";
import { ProductosAdmin } from "@/components/admin/ProductosAdmin";
import { CombosAdmin } from "@/components/admin/CombosAdmin";

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
      <ProductosAdmin productosIniciales={productos} combos={combos} />
      <CombosAdmin combosIniciales={combos} productosDisponibles={productos} />
    </main>
  );
}
```

- [ ] **Step 3: Verificar que el proyecto sigue compilando**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/CombosAdmin.tsx src/app/admin/page.tsx
git commit -m "feat: conectar CRUD de combos en /admin"
```

---

### Task 13: Verificación manual end-to-end y cierre

**Files:** ninguno (solo verificación).

**Interfaces:** ninguna nueva — verifica el comportamiento conjunto de todas las tareas anteriores.

- [ ] **Step 1: Correr lint y toda la suite de tests**

Run: `npm run lint && npm test`
Expected: ambos sin errores.

- [ ] **Step 2: Levantar el dev server**

Run: `npm run dev`

- [ ] **Step 3: Verificar en el navegador (Chrome, dev server local) el flujo completo**

Checklist a confirmar manualmente en `/admin` (con sesión iniciada):
- Crear un producto nuevo con imagen subida (no placeholder) — aparece en la lista con la foto real.
- Editar ese producto (cambiar nombre y precio) — la lista se actualiza sin recargar la página.
- Crear un combo nuevo, agregarle 2 productos con cantidades distintas, subirle imagen y guardarlo — aparece en la lista de combos.
- Editar ese combo: sacar un producto, agregar otro distinto, guardar — se refleja el cambio.
- Intentar borrar un producto que está en el combo recién creado — debe aparecer el aviso bloqueante listando el combo, y el producto **no** debe borrarse.
- Borrar el combo — debe desaparecer de la lista.
- Ahora borrar el producto que antes estaba bloqueado — debe borrarse sin problema (ya no está en ningún combo).
- Cerrar sesión y volver a entrar — los cambios deben persistir (confirma que las mutaciones llegaron a Supabase, no solo al estado local).

Si algo falla, volver a la task correspondiente y corregir antes de seguir.

- [ ] **Step 4: Confirmar que no quedan cambios sin commitear**

Run: `git status`
Expected: working tree clean (todo ya commiteado tarea por tarea).

- [ ] **Step 5: Push**

```bash
git push origin main
```

Confirmar con Nicolás antes de este paso si no se pidió explícitamente automatizar el push.
