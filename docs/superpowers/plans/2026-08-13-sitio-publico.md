# Sitio Público Percy Burger — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public-facing Percy Burger ordering site — catalog, cart, and a checkout that hands off the finished order to Percy over WhatsApp.

**Architecture:** Next.js (App Router) + TypeScript app on Vercel. No backend/database in this module — menu, combos, and delivery zones live in typed local data files shaped like the future Supabase tables. Cart state lives in a React Context backed by `localStorage`. Checkout builds an order summary and redirects to a `wa.me` link — no payment integration.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS v4, Vitest (unit tests), Vercel (hosting).

## Global Constraints

- No Mercado Pago integration in this module — checkout only offers "pagar al recibir".
- No database — data lives in `src/data/*.ts`, typed to match future Supabase tables.
- No hero animation — landing header is static (option A/B still undecided with Percy).
- Percy's WhatsApp number for order handoff: `5492616968888` (wa.me format, no `+`).
- Brand palette (from `Identidad visual.md` in the vault): naranja `#EF8B34`, naranja quemado `#DE6520`, rojo `#F5090A`, amarillo `#FFD402`, negro/carbón `#161616`.
- All prices are final ("todo incluido"), no separate tax calculation, formatted in ARS.
- Spec: `docs/superpowers/specs/2026-08-13-sitio-publico-design.md`.

---

## Task 1: Scaffold Next.js project

**Files:**
- Create: entire Next.js scaffold at repo root (`package.json`, `next.config.ts`, `tsconfig.json`, `src/app/`, `public/`, `src/app/globals.css`, etc.)
- Create: `public/placeholder.svg`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a running Next.js + Tailwind app with brand color tokens (`bg-brand-orange`, `text-brand-black`, etc.) and `public/placeholder.svg` for later tasks to reference as `imagenUrl`.

- [ ] **Step 1: Scaffold into a temporary directory**

The repo root (`~/Percy Burger`) already has `.git/` and `docs/` from the spec commit, so `create-next-app` needs a clean directory first.

```bash
cd ~
npx create-next-app@latest percy-burger-tmp --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

Expected: output ends with `Success! Created percy-burger-tmp at ...` and `~/percy-burger-tmp/` exists.

- [ ] **Step 2: Merge the scaffold into the repo**

```bash
cd ~
rsync -a --exclude='.git' percy-burger-tmp/ "Percy Burger"/
rm -rf percy-burger-tmp
```

Expected: `ls ~/"Percy Burger"` shows `package.json`, `next.config.ts`, `tsconfig.json`, `src/`, `public/`, `docs/`, `.git`, `.gitignore`.

- [ ] **Step 3: Install dependencies and verify the dev server boots**

```bash
cd ~/"Percy Burger"
npm install
npm run dev
```

Expected: log shows `Ready in ...ms`; visiting `http://localhost:3000` shows the default Next.js starter page. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 4: Add brand color tokens**

Open `src/app/globals.css`. It will contain an `@import "tailwindcss";` line near the top (create-next-app's Tailwind v4 default). Add this block right after that import:

```css
@theme {
  --color-brand-orange: #EF8B34;
  --color-brand-orange-burnt: #DE6520;
  --color-brand-red: #F5090A;
  --color-brand-yellow: #FFD402;
  --color-brand-black: #161616;
}
```

- [ ] **Step 5: Add the placeholder product image**

Create `public/placeholder.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#EF8B34"/>
  <text x="200" y="155" font-family="sans-serif" font-size="24" fill="#161616" text-anchor="middle">Percy Burger</text>
</svg>
```

- [ ] **Step 6: Verify the production build**

```bash
npm run build
```

Expected: `Compiled successfully`, no type errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with Tailwind and brand colors"
```

---

## Task 2: Data types and real menu data

**Files:**
- Create: `src/data/types.ts`
- Create: `src/data/menu.ts`
- Create: `src/data/combos.ts`
- Create: `src/data/zonas.ts`

**Interfaces:**
- Consumes: `public/placeholder.svg` (Task 1) as the `imagenUrl` for every product/combo.
- Produces: `Producto`, `Combo`, `Zona`, `Tamaño` types; `productos: Producto[]`, `combos: Combo[]`, `zonas: Zona[]` arrays consumed by every later UI task.

- [ ] **Step 1: Write `src/data/types.ts`**

```ts
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
```

- [ ] **Step 2: Write `src/data/menu.ts`**

Real menu from `Menú y precios.md` in the vault. All burgers include an individual portion of fries per the note in that file; that's informational for the order text later, not modeled as a separate line item.

```ts
import { Producto } from "./types";

export const productos: Producto[] = [
  {
    id: "cheese-burger",
    categoria: "clasica",
    nombre: "Cheese Burger",
    ingredientes: "Pan de papa, carne, cheddar, salsa smash",
    precios: { simple: 8500, doble: 10000, triple: 11500 },
    imagenUrl: "/placeholder.svg",
  },
  {
    id: "bacon-burger",
    categoria: "clasica",
    nombre: "Bacon",
    ingredientes: "Pan de papa, carne, cheddar, panceta ahumada, salsa smash",
    precios: { simple: 10000, doble: 12000, triple: 13000 },
    imagenUrl: "/placeholder.svg",
  },
  {
    id: "onion-burger",
    categoria: "clasica",
    nombre: "Onion",
    ingredientes: "Pan de papa, carne, cheddar, cebolla morada en cubos, salsa smash",
    precios: { simple: 9000, doble: 10500, triple: 12000 },
    imagenUrl: "/placeholder.svg",
  },
  {
    id: "pro-burger",
    categoria: "clasica",
    nombre: "Pro",
    ingredientes: "Pan de papa, carne, cheddar, pepinillos, panceta ahumada, salsa smash",
    precios: { simple: 10500, doble: 12000, triple: 13500 },
    imagenUrl: "/placeholder.svg",
  },
  {
    id: "pickles-burger",
    categoria: "clasica",
    nombre: "Pickles",
    ingredientes: "Pan de papa, carne, cheddar, pepinillos, salsa smash",
    precios: { simple: 9000, doble: 10500, triple: 12000 },
    imagenUrl: "/placeholder.svg",
  },
  {
    id: "crispy-burger",
    categoria: "especial",
    nombre: "Crispy",
    ingredientes: "Pan de papa, carne, cheddar, cebolla crispy arriba y abajo, barbacoa ahumada arriba y abajo",
    precios: { simple: 9500, doble: 11000, triple: 12500 },
    imagenUrl: "/placeholder.svg",
  },
  {
    id: "cuarto-burger",
    categoria: "especial",
    nombre: "Cuarto",
    ingredientes: "Pan de papa, carne, cheddar, ketchup, mostaza, cebolla morada picada en cubos",
    precios: { simple: 9000, doble: 10500, triple: 12000 },
    imagenUrl: "/placeholder.svg",
  },
  {
    id: "hot-provo-burger",
    categoria: "especial",
    nombre: "Hot Provo",
    ingredientes: "Pan de papa, carne, provolone ahumado, jalea de tomate picante/dulce, ketchup",
    precios: { simple: 9000, doble: 10500, triple: 12000 },
    imagenUrl: "/placeholder.svg",
  },
  {
    id: "papas",
    categoria: "extra",
    nombre: "Papas",
    ingredientes: "Porción individual",
    precios: { simple: 3500 },
    imagenUrl: "/placeholder.svg",
  },
  {
    id: "gaseosa-500",
    categoria: "bebida",
    nombre: "Gaseosa 500ml",
    ingredientes: "Botella de gaseosa 500ml",
    precios: { simple: 2000 },
    imagenUrl: "/placeholder.svg",
  },
  {
    id: "salsa-smash",
    categoria: "extra",
    nombre: "Dip Salsa Smash",
    ingredientes: "Salsa smash para dipear",
    precios: { simple: 1000 },
    imagenUrl: "/placeholder.svg",
  },
  {
    id: "salsa-tasty",
    categoria: "extra",
    nombre: "Dip Salsa Tasty",
    ingredientes: "Salsa tasty para dipear",
    precios: { simple: 1000 },
    imagenUrl: "/placeholder.svg",
  },
];
```

- [ ] **Step 3: Write `src/data/combos.ts`**

```ts
import { Combo } from "./types";

export const combos: Combo[] = [
  {
    id: "promo-cheese-doble",
    nombre: "Promo Cheese Doble",
    descripcion: "Cheese Burger Doble + Papas + Gaseosa 500ml",
    precio: 11000,
    imagenUrl: "/placeholder.svg",
    activo: true,
  },
  {
    id: "promo-cheese-triple",
    nombre: "Promo Cheese Triple",
    descripcion: "Cheese Burger Triple + Papas + Gaseosa 500ml",
    precio: 12500,
    imagenUrl: "/placeholder.svg",
    activo: true,
  },
  {
    id: "promo-crispy-x2",
    nombre: "Promo Crispy x2",
    descripcion: "2 Crispy Triples + 2 Papas",
    precio: 24000,
    imagenUrl: "/placeholder.svg",
    activo: true,
  },
  {
    id: "promo-cuarto-x2",
    nombre: "Promo Cuarto x2",
    descripcion: "2 Cuarto Triples + 2 Papas",
    precio: 23000,
    imagenUrl: "/placeholder.svg",
    activo: true,
  },
];
```

- [ ] **Step 4: Write `src/data/zonas.ts`**

Example zones — the real list is still pending from Percy (see `Pendientes.md` in the vault). Structured so replacing these is a one-line-per-zone edit.

```ts
import { Zona } from "./types";

export const zonas: Zona[] = [
  { id: "dorrego", nombre: "Dorrego", costoEnvio: 800 },
  { id: "guaymallen-centro", nombre: "Guaymallén Centro", costoEnvio: 1000 },
  { id: "las-heras", nombre: "Las Heras", costoEnvio: 1500 },
];
```

- [ ] **Step 5: Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/data
git commit -m "Add product, combo, and zone data types with real menu data"
```

---

## Task 3: Vitest setup and cart logic

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script and `vitest` dev dependency)
- Create: `src/lib/cart.ts`
- Test: `src/lib/cart.test.ts`

**Interfaces:**
- Consumes: `Tamaño` type (Task 2, `src/data/types.ts`).
- Produces: `ItemCarrito` interface and `agregarItem`, `quitarItem`, `actualizarCantidad`, `calcularSubtotal` functions, consumed by `CartContext` (Task 5), `checkout` (Task 11), and `lib/whatsapp.ts` (Task 4).

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add `vitest.config.ts`**

`src/lib/cart.ts` (written in Step 6 below) imports from the `@/*` alias, so Vitest needs the same alias Next.js uses — it doesn't read `tsconfig.json` paths on its own.

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add the `test` script to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run"
```

- [ ] **Step 4: Write the failing tests — `src/lib/cart.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { agregarItem, quitarItem, actualizarCantidad, calcularSubtotal, ItemCarrito } from "./cart";

const cheeseSimple: ItemCarrito = {
  id: "cheese-burger-simple",
  nombre: "Cheese Burger (Simple)",
  tamaño: "simple",
  precioUnitario: 8500,
  cantidad: 1,
};

const papas: ItemCarrito = {
  id: "papas",
  nombre: "Papas",
  precioUnitario: 3500,
  cantidad: 1,
};

describe("agregarItem", () => {
  it("agrega un item nuevo al carrito vacío", () => {
    const resultado = agregarItem([], cheeseSimple);
    expect(resultado).toEqual([cheeseSimple]);
  });

  it("suma la cantidad si el item ya existe", () => {
    const resultado = agregarItem([cheeseSimple], { ...cheeseSimple, cantidad: 2 });
    expect(resultado).toEqual([{ ...cheeseSimple, cantidad: 3 }]);
  });
});

describe("quitarItem", () => {
  it("elimina el item con el id indicado", () => {
    const resultado = quitarItem([cheeseSimple, papas], "papas");
    expect(resultado).toEqual([cheeseSimple]);
  });
});

describe("actualizarCantidad", () => {
  it("actualiza la cantidad de un item existente", () => {
    const resultado = actualizarCantidad([cheeseSimple], "cheese-burger-simple", 5);
    expect(resultado[0].cantidad).toBe(5);
  });

  it("elimina el item si la cantidad baja a 0 o menos", () => {
    const resultado = actualizarCantidad([cheeseSimple], "cheese-burger-simple", 0);
    expect(resultado).toEqual([]);
  });
});

describe("calcularSubtotal", () => {
  it("suma precio unitario por cantidad de cada item", () => {
    const subtotal = calcularSubtotal([cheeseSimple, { ...papas, cantidad: 2 }]);
    expect(subtotal).toBe(8500 + 3500 * 2);
  });

  it("devuelve 0 para un carrito vacío", () => {
    expect(calcularSubtotal([])).toBe(0);
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

```bash
npx vitest run src/lib/cart.test.ts
```

Expected: FAIL — `Cannot find module './cart'`.

- [ ] **Step 6: Write `src/lib/cart.ts`**

```ts
import { Tamaño } from "@/data/types";

export interface ItemCarrito {
  id: string;
  nombre: string;
  tamaño?: Tamaño;
  precioUnitario: number;
  cantidad: number;
}

export function agregarItem(carrito: ItemCarrito[], item: ItemCarrito): ItemCarrito[] {
  const existente = carrito.find((i) => i.id === item.id);
  if (existente) {
    return carrito.map((i) => (i.id === item.id ? { ...i, cantidad: i.cantidad + item.cantidad } : i));
  }
  return [...carrito, item];
}

export function quitarItem(carrito: ItemCarrito[], id: string): ItemCarrito[] {
  return carrito.filter((i) => i.id !== id);
}

export function actualizarCantidad(carrito: ItemCarrito[], id: string, cantidad: number): ItemCarrito[] {
  if (cantidad <= 0) {
    return quitarItem(carrito, id);
  }
  return carrito.map((i) => (i.id === id ? { ...i, cantidad } : i));
}

export function calcularSubtotal(carrito: ItemCarrito[]): number {
  return carrito.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);
}
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
npx vitest run src/lib/cart.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/lib/cart.ts src/lib/cart.test.ts
git commit -m "Add cart calculation logic with tests"
```

---

## Task 4: WhatsApp order text and link

**Files:**
- Create: `src/lib/whatsapp.ts`
- Test: `src/lib/whatsapp.test.ts`

**Interfaces:**
- Consumes: `ItemCarrito` (Task 3, `src/lib/cart.ts`).
- Produces: `DatosCheckout` interface, `construirTextoPedido(items, subtotal, costoEnvio, datos)` and `construirUrlWhatsapp(texto)`, consumed by the checkout page (Task 11).

- [ ] **Step 1: Write the failing tests — `src/lib/whatsapp.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { construirTextoPedido, construirUrlWhatsapp } from "./whatsapp";
import { ItemCarrito } from "./cart";

const items: ItemCarrito[] = [
  {
    id: "cheese-burger-simple",
    nombre: "Cheese Burger (Simple)",
    tamaño: "simple",
    precioUnitario: 8500,
    cantidad: 2,
  },
];

describe("construirTextoPedido", () => {
  it("incluye los items, el total y los datos de contacto para delivery", () => {
    const texto = construirTextoPedido(items, 17000, 800, {
      nombre: "Juan",
      telefono: "2611234567",
      modalidad: "delivery",
      direccion: "Calle Falsa 123",
      zonaNombre: "Dorrego",
    });

    expect(texto).toContain("2x Cheese Burger (Simple)");
    expect(texto).toContain("Delivery a: Calle Falsa 123");
    expect(texto).toContain("Zona: Dorrego (envío $800)");
    expect(texto).toContain("Total: $17.800");
    expect(texto).toContain("Nombre: Juan");
    expect(texto).toContain("Teléfono: 2611234567");
  });

  it("marca el envío como a coordinar cuando la zona no matchea", () => {
    const texto = construirTextoPedido(items, 17000, 0, {
      nombre: "Juan",
      telefono: "2611234567",
      modalidad: "delivery",
      direccion: "Calle Falsa 123",
      aCoordinar: true,
    });

    expect(texto).toContain("Zona: a coordinar por WhatsApp");
    expect(texto).toContain("Envío: a coordinar");
  });

  it("usa el texto de retiro en el local cuando la modalidad es retiro", () => {
    const texto = construirTextoPedido(items, 17000, 0, {
      nombre: "Juan",
      telefono: "2611234567",
      modalidad: "retiro",
    });

    expect(texto).toContain("Retiro en el local (Falucho 440, Dorrego, Guaymallén)");
  });
});

describe("construirUrlWhatsapp", () => {
  it("arma la URL de wa.me con el texto codificado", () => {
    const url = construirUrlWhatsapp("Hola");
    expect(url).toBe("https://wa.me/5492616968888?text=Hola");
  });

  it("codifica saltos de línea y espacios", () => {
    const url = construirUrlWhatsapp("Línea 1\nLínea 2");
    expect(url).toContain("text=L%C3%ADnea%201%0AL%C3%ADnea%202");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/lib/whatsapp.test.ts
```

Expected: FAIL — `Cannot find module './whatsapp'`.

- [ ] **Step 3: Write `src/lib/whatsapp.ts`**

```ts
import { ItemCarrito } from "./cart";

const NUMERO_WHATSAPP_PERCY = "5492616968888";

export interface DatosCheckout {
  nombre: string;
  telefono: string;
  modalidad: "delivery" | "retiro";
  direccion?: string;
  zonaNombre?: string;
  aCoordinar?: boolean;
}

function formatearPrecio(valor: number): string {
  return `$${valor.toLocaleString("es-AR")}`;
}

export function construirTextoPedido(
  items: ItemCarrito[],
  subtotal: number,
  costoEnvio: number,
  datos: DatosCheckout
): string {
  const lineasItems = items
    .map((item) => `- ${item.cantidad}x ${item.nombre} — ${formatearPrecio(item.precioUnitario * item.cantidad)}`)
    .join("\n");

  const lineasEntrega =
    datos.modalidad === "retiro"
      ? "Retiro en el local (Falucho 440, Dorrego, Guaymallén)"
      : [
          `Delivery a: ${datos.direccion}`,
          datos.aCoordinar
            ? "Zona: a coordinar por WhatsApp"
            : `Zona: ${datos.zonaNombre} (envío ${formatearPrecio(costoEnvio)})`,
        ].join("\n");

  const total = subtotal + costoEnvio;

  return [
    "¡Hola Percy Burger! Quiero hacer este pedido:",
    "",
    lineasItems,
    "",
    lineasEntrega,
    "",
    `Subtotal: ${formatearPrecio(subtotal)}`,
    datos.aCoordinar ? "Envío: a coordinar" : `Envío: ${formatearPrecio(costoEnvio)}`,
    `Total: ${formatearPrecio(total)}`,
    "",
    "Forma de pago: pago al recibir",
    "",
    `Nombre: ${datos.nombre}`,
    `Teléfono: ${datos.telefono}`,
  ].join("\n");
}

export function construirUrlWhatsapp(texto: string): string {
  return `https://wa.me/${NUMERO_WHATSAPP_PERCY}?text=${encodeURIComponent(texto)}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/lib/whatsapp.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp.ts src/lib/whatsapp.test.ts
git commit -m "Add WhatsApp order text and link builder with tests"
```

---

## Task 5: Cart context

**Files:**
- Create: `src/context/CartContext.tsx`

**Interfaces:**
- Consumes: `ItemCarrito`, `agregarItem`, `quitarItem`, `actualizarCantidad`, `calcularSubtotal` (Task 3, `src/lib/cart.ts`).
- Produces: `CartProvider` component and `useCart()` hook returning `{ items: ItemCarrito[], subtotal: number, agregar(item), quitar(id), actualizarCantidad(id, cantidad), vaciar() }`, consumed by every UI task from here on (6–11).

- [ ] **Step 1: Write `src/context/CartContext.tsx`**

```tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  ItemCarrito,
  agregarItem,
  quitarItem,
  actualizarCantidad,
  calcularSubtotal,
} from "@/lib/cart";

const STORAGE_KEY = "percy-burger-carrito";

interface CartContextValue {
  items: ItemCarrito[];
  subtotal: number;
  agregar: (item: ItemCarrito) => void;
  quitar: (id: string) => void;
  actualizarCantidad: (id: string, cantidad: number) => void;
  vaciar: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(STORAGE_KEY);
      if (guardado) setItems(JSON.parse(guardado));
    } catch {
      // localStorage no disponible (ej. modo privado estricto): el carrito sigue en memoria
    }
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage no disponible: no se persiste, pero la sesión sigue funcionando
    }
  }, [items, hidratado]);

  const value: CartContextValue = {
    items,
    subtotal: calcularSubtotal(items),
    agregar: (item) => setItems((actuales) => agregarItem(actuales, item)),
    quitar: (id) => setItems((actuales) => quitarItem(actuales, id)),
    actualizarCantidad: (id, cantidad) => setItems((actuales) => actualizarCantidad(actuales, id, cantidad)),
    vaciar: () => setItems([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/context/CartContext.tsx
git commit -m "Add cart context with localStorage persistence"
```

---

## Task 6: Layout and header

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/Header.tsx`

**Interfaces:**
- Consumes: `CartProvider` (Task 5).
- Produces: root layout wrapping every page in `CartProvider`, plus a `Header` rendered on every page. `CartDrawer` (Task 9) will be added to this same layout later.

- [ ] **Step 1: Write `src/components/Header.tsx`**

```tsx
import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-brand-black/10 bg-brand-black">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-extrabold text-brand-yellow">
          Percy Burger
        </Link>
        <span className="hidden text-sm text-white/70 sm:block">Falucho 440, Dorrego, Guaymallén</span>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Percy Burger",
  description: "Pedí tu hamburguesa favorita de Percy Burger, Guaymallén, Mendoza.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-brand-black">
        <CartProvider>
          <Header />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify the dev server renders it**

```bash
npm run dev
```

Expected: `http://localhost:3000` shows the black header with "Percy Burger" in yellow. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/components/Header.tsx
git commit -m "Add root layout with cart provider and header"
```

---

## Task 7: Product card and catalog page

**Files:**
- Create: `src/components/ProductoCard.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `Producto`, `Tamaño` (Task 2), `productos` (Task 2, `src/data/menu.ts`), `useCart()` (Task 5).
- Produces: `ProductoCard` component and the category-grouped catalog on `/`. Task 8 adds the Promos section to this same `app/page.tsx`.

- [ ] **Step 1: Write `src/components/ProductoCard.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Producto, Tamaño } from "@/data/types";
import { useCart } from "@/context/CartContext";

const ETIQUETAS_TAMAÑO: Record<Tamaño, string> = {
  simple: "Simple",
  doble: "Doble",
  triple: "Triple",
};

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function ProductoCard({ producto }: { producto: Producto }) {
  const tamañosDisponibles = Object.keys(producto.precios) as Tamaño[];
  const [tamaño, setTamaño] = useState<Tamaño>(tamañosDisponibles[0]);
  const { agregar } = useCart();

  const precio = producto.precios[tamaño]!;

  return (
    <div className="flex flex-col rounded-lg border border-brand-black/10 bg-white p-4 shadow-sm">
      <img
        src={producto.imagenUrl}
        alt={producto.nombre}
        className="mb-3 h-40 w-full rounded-md object-cover"
      />
      <h3 className="text-lg font-semibold text-brand-black">{producto.nombre}</h3>
      <p className="mb-3 flex-1 text-sm text-brand-black/70">{producto.ingredientes}</p>
      {tamañosDisponibles.length > 1 && (
        <div className="mb-3 flex gap-2">
          {tamañosDisponibles.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTamaño(t)}
              className={`rounded-full border px-3 py-1 text-sm ${
                t === tamaño
                  ? "border-brand-orange bg-brand-orange text-white"
                  : "border-brand-black/20 text-brand-black"
              }`}
            >
              {ETIQUETAS_TAMAÑO[t]}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-brand-orange-burnt">{formatearPrecio(precio)}</span>
        <button
          type="button"
          onClick={() =>
            agregar({
              id: `${producto.id}-${tamaño}`,
              nombre: `${producto.nombre} (${ETIQUETAS_TAMAÑO[tamaño]})`,
              tamaño,
              precioUnitario: precio,
              cantidad: 1,
            })
          }
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red/90"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/app/page.tsx`**

```tsx
import { productos } from "@/data/menu";
import { ProductoCard } from "@/components/ProductoCard";
import { Producto } from "@/data/types";

const CATEGORIAS: { key: Producto["categoria"]; titulo: string }[] = [
  { key: "clasica", titulo: "Burgers clásicas" },
  { key: "especial", titulo: "Especiales" },
  { key: "extra", titulo: "Extras" },
  { key: "bebida", titulo: "Bebidas" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
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
  );
}
```

- [ ] **Step 3: Verify in the browser**

```bash
npm run dev
```

Expected: `/` shows the four category sections with real products; clicking a size button switches the shown price; clicking "Agregar" doesn't error (cart UI comes in Task 9, but the click should run without throwing — check the browser console). Stop the server once confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProductoCard.tsx src/app/page.tsx
git commit -m "Add product card and category-grouped catalog"
```

---

## Task 8: Combo card and promos section

**Files:**
- Create: `src/components/ComboCard.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `Combo` (Task 2), `combos` (Task 2, `src/data/combos.ts`), `useCart()` (Task 5).
- Produces: `ComboCard` component and a Promos section on `/`, above the category sections from Task 7.

- [ ] **Step 1: Write `src/components/ComboCard.tsx`**

```tsx
"use client";

import { Combo } from "@/data/types";
import { useCart } from "@/context/CartContext";

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function ComboCard({ combo }: { combo: Combo }) {
  const { agregar } = useCart();

  return (
    <div className="flex flex-col rounded-lg border border-brand-yellow bg-brand-yellow/10 p-4 shadow-sm">
      <img
        src={combo.imagenUrl}
        alt={combo.nombre}
        className="mb-3 h-40 w-full rounded-md object-cover"
      />
      <h3 className="text-lg font-semibold text-brand-black">{combo.nombre}</h3>
      <p className="mb-3 flex-1 text-sm text-brand-black/70">{combo.descripcion}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-brand-orange-burnt">{formatearPrecio(combo.precio)}</span>
        <button
          type="button"
          onClick={() =>
            agregar({
              id: `combo-${combo.id}`,
              nombre: combo.nombre,
              precioUnitario: combo.precio,
              cantidad: 1,
            })
          }
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red/90"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the Promos section to `src/app/page.tsx`**

Add the import and the new section before the `CATEGORIAS.map(...)` block:

```tsx
import { productos } from "@/data/menu";
import { combos } from "@/data/combos";
import { ProductoCard } from "@/components/ProductoCard";
import { ComboCard } from "@/components/ComboCard";
import { Producto } from "@/data/types";

const CATEGORIAS: { key: Producto["categoria"]; titulo: string }[] = [
  { key: "clasica", titulo: "Burgers clásicas" },
  { key: "especial", titulo: "Especiales" },
  { key: "extra", titulo: "Extras" },
  { key: "bebida", titulo: "Bebidas" },
];

export default function Home() {
  const combosActivos = combos.filter((c) => c.activo);

  return (
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
  );
}
```

- [ ] **Step 3: Verify in the browser**

```bash
npm run dev
```

Expected: `/` shows a "Promos" section with the 4 combos above the category sections. Stop the server once confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/components/ComboCard.tsx src/app/page.tsx
git commit -m "Add combo card and promos section to catalog"
```

---

## Task 9: Cart drawer

**Files:**
- Create: `src/components/CartDrawer.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `useCart()` (Task 5).
- Produces: a fixed cart summary link visible on every page once the cart is non-empty, linking to `/carrito` (built in Task 10).

- [ ] **Step 1: Write `src/components/CartDrawer.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function CartDrawer() {
  const { items, subtotal } = useCart();
  const cantidadTotal = items.reduce((acc, item) => acc + item.cantidad, 0);

  if (cantidadTotal === 0) return null;

  return (
    <Link
      href="/carrito"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-brand-black px-5 py-3 text-white shadow-lg"
    >
      <span className="font-semibold">
        {cantidadTotal} {cantidadTotal === 1 ? "ítem" : "ítems"}
      </span>
      <span className="font-bold text-brand-yellow">{formatearPrecio(subtotal)}</span>
    </Link>
  );
}
```

- [ ] **Step 2: Add it to `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";

export const metadata: Metadata = {
  title: "Percy Burger",
  description: "Pedí tu hamburguesa favorita de Percy Burger, Guaymallén, Mendoza.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-brand-black">
        <CartProvider>
          <Header />
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify in the browser**

```bash
npm run dev
```

Expected: adding a product on `/` makes a floating pill appear at the bottom with the item count and subtotal; it disappears again if the cart empties (cart emptying isn't wired yet — just confirm it appears after adding). Stop the server once confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/components/CartDrawer.tsx src/app/layout.tsx
git commit -m "Add floating cart drawer to layout"
```

---

## Task 10: Cart page

**Files:**
- Create: `src/app/carrito/page.tsx`

**Interfaces:**
- Consumes: `useCart()` (Task 5).
- Produces: `/carrito` route with an editable cart list and a "Continuar" link to `/checkout` (built in Task 11).

- [ ] **Step 1: Write `src/app/carrito/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default function CarritoPage() {
  const { items, subtotal, actualizarCantidad, quitar } = useCart();

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
        ))}
      </ul>
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

- [ ] **Step 2: Verify in the browser**

```bash
npm run dev
```

Expected: with items in the cart, `/carrito` lists them with working +/−/Quitar controls and an updating subtotal; with an empty cart, it shows the empty state with a link back to `/`. Stop the server once confirmed.

- [ ] **Step 3: Commit**

```bash
git add src/app/carrito/page.tsx
git commit -m "Add editable cart page"
```

---

## Task 11: Checkout page

**Files:**
- Create: `src/components/ZonaSelect.tsx`
- Create: `src/app/checkout/page.tsx`

**Interfaces:**
- Consumes: `zonas` (Task 2, `src/data/zonas.ts`), `useCart()` (Task 5), `construirTextoPedido`, `construirUrlWhatsapp` (Task 4, `src/lib/whatsapp.ts`).
- Produces: `/checkout` route — the last page in the flow. No later task depends on this one.

- [ ] **Step 1: Write `src/components/ZonaSelect.tsx`**

```tsx
"use client";

import { zonas } from "@/data/zonas";

export const ZONA_A_COORDINAR = "__a_coordinar__";

export function ZonaSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full rounded-md border border-brand-black/20 px-3 py-2 text-brand-black"
    >
      <option value="" disabled>
        Elegí tu zona
      </option>
      {zonas.map((zona) => (
        <option key={zona.id} value={zona.id}>
          {zona.nombre} — envío ${zona.costoEnvio.toLocaleString("es-AR")}
        </option>
      ))}
      <option value={ZONA_A_COORDINAR}>Mi zona no está en la lista (a coordinar por WhatsApp)</option>
    </select>
  );
}
```

- [ ] **Step 2: Write `src/app/checkout/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { ZonaSelect, ZONA_A_COORDINAR } from "@/components/ZonaSelect";
import { zonas } from "@/data/zonas";
import { construirTextoPedido, construirUrlWhatsapp } from "@/lib/whatsapp";

type Modalidad = "delivery" | "retiro";

export default function CheckoutPage() {
  const { items, subtotal, vaciar } = useCart();

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad>("delivery");
  const [direccion, setDireccion] = useState("");
  const [zonaId, setZonaId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const zonaSeleccionada = zonas.find((z) => z.id === zonaId);
  const aCoordinar = modalidad === "delivery" && zonaId === ZONA_A_COORDINAR;
  const costoEnvio = modalidad === "delivery" && zonaSeleccionada ? zonaSeleccionada.costoEnvio : 0;

  function manejarConfirmar() {
    if (!nombre.trim() || !telefono.trim()) {
      setError("Completá tu nombre y teléfono.");
      return;
    }
    if (modalidad === "delivery" && (!direccion.trim() || !zonaId)) {
      setError("Completá la dirección y elegí una zona.");
      return;
    }
    setError(null);

    const texto = construirTextoPedido(items, subtotal, costoEnvio, {
      nombre,
      telefono,
      modalidad,
      direccion: modalidad === "delivery" ? direccion : undefined,
      zonaNombre: aCoordinar ? undefined : zonaSeleccionada?.nombre,
      aCoordinar,
    });

    vaciar();
    window.location.href = construirUrlWhatsapp(texto);
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-lg text-brand-black/70">Tu carrito está vacío.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-brand-black">Finalizar pedido</h1>

      <div className="mb-4 flex flex-col gap-1">
        <label className="text-sm font-semibold text-brand-black" htmlFor="nombre">
          Nombre
        </label>
        <input
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-md border border-brand-black/20 px-3 py-2"
        />
      </div>

      <div className="mb-4 flex flex-col gap-1">
        <label className="text-sm font-semibold text-brand-black" htmlFor="telefono">
          Teléfono
        </label>
        <input
          id="telefono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="rounded-md border border-brand-black/20 px-3 py-2"
        />
      </div>

      <div className="mb-4 flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="modalidad"
            checked={modalidad === "delivery"}
            onChange={() => setModalidad("delivery")}
          />
          Delivery
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="modalidad"
            checked={modalidad === "retiro"}
            onChange={() => setModalidad("retiro")}
          />
          Retiro en el local
        </label>
      </div>

      {modalidad === "delivery" && (
        <>
          <div className="mb-4 flex flex-col gap-1">
            <label className="text-sm font-semibold text-brand-black" htmlFor="direccion">
              Dirección
            </label>
            <input
              id="direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="rounded-md border border-brand-black/20 px-3 py-2"
            />
          </div>
          <div className="mb-4 flex flex-col gap-1">
            <label className="text-sm font-semibold text-brand-black">Zona de envío</label>
            <ZonaSelect value={zonaId} onChange={setZonaId} />
          </div>
        </>
      )}

      <p className="mb-4 text-sm text-brand-black/70">
        Forma de pago: pagás al recibir (efectivo o transferencia coordinada por WhatsApp).
      </p>

      {error && <p className="mb-4 text-sm font-semibold text-brand-red">{error}</p>}

      <button
        type="button"
        onClick={manejarConfirmar}
        className="w-full rounded-md bg-brand-red px-4 py-3 text-center font-semibold text-white"
      >
        Enviar pedido por WhatsApp
      </button>
    </main>
  );
}
```

- [ ] **Step 3: Verify the full flow in the browser**

```bash
npm run dev
```

Manually walk through: add a product from `/` → open `/carrito` → "Continuar" → fill name/phone, pick Delivery, type an address, pick "Dorrego" as zone → click "Enviar pedido por WhatsApp". Expected: the browser attempts to navigate to `https://wa.me/5492616968888?text=...` with the order details URL-encoded in the query string, and the cart is empty if you navigate back to `/carrito`. Also verify: leaving name blank and clicking confirm shows the validation error instead of navigating; picking Retiro hides the address/zone fields and still confirms successfully. Stop the server once confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/components/ZonaSelect.tsx src/app/checkout/page.tsx
git commit -m "Add checkout page with WhatsApp order handoff"
```

---

## Task 12: Deploy to Vercel

**Files:**
- None (deployment configuration only; no new source files).

**Interfaces:**
- Consumes: the full app from Tasks 1–11.
- Produces: a live production URL.

- [ ] **Step 1: Verify the production build one more time**

```bash
cd ~/"Percy Burger"
npm run build
```

Expected: `Compiled successfully`, no errors.

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all `src/lib/cart.test.ts` and `src/lib/whatsapp.test.ts` tests pass (11 total).

- [ ] **Step 3: Push to a remote and connect Vercel**

This step needs Nicolás's own accounts (GitHub + Vercel), so it's manual:

1. Create a GitHub repo for the project (if it doesn't exist yet) and push:
   ```bash
   git remote add origin <URL del repo de GitHub>
   git push -u origin main
   ```
2. In the Vercel dashboard, "Add New Project" → import the GitHub repo → framework preset "Next.js" is auto-detected → Deploy (plan Hobby, already decided for this project).

Expected: Vercel assigns a `*.vercel.app` production URL that serves the same site confirmed in Task 11's manual walkthrough.

- [ ] **Step 4: Confirm the deployed site works**

Open the Vercel production URL and repeat the walkthrough from Task 11, Step 3, against the deployed site instead of `localhost`.

---

## Self-Review Notes

- **Spec coverage:** landing/catalog (Tasks 7–8), carrito (Task 10), checkout with delivery/retiro/zona/"a coordinar"/pago al recibir (Task 11), WhatsApp handoff (Tasks 4, 11), local typed data instead of DB (Task 2), brand colors/no hero animation (Tasks 1, 6), deploy (Task 12), unit tests for `lib/whatsapp.ts` and cart totals (Tasks 3–4) — all spec sections are covered.
- **Type consistency checked:** `ItemCarrito.id` is always `${productoId}-${tamaño}` for products (Task 7) or `combo-${comboId}` for combos (Task 8), matching how Task 10/11 look items up by `id`. `useCart()`'s returned shape (`items`, `subtotal`, `agregar`, `quitar`, `actualizarCantidad`, `vaciar`) from Task 5 is used identically in Tasks 7–11.
- **No placeholders:** every step has complete, runnable code.
