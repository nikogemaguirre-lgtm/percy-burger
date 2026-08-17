# Vista mobile de pedidos + push (sub-proyecto C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que `/admin/pedidos` muestre una vista mobile minimalista (solo pedidos activos, tarjetas grandes y táctiles) cuando Percy entra desde el celular, y que reciba una notificación push apenas entra un pedido nuevo.

**Architecture:** Un hook `useEsMobil()` decide en runtime entre `PedidosAdminDesktop` (la vista ya existente) y `PedidosAdminMobile` (nueva) sobre la misma URL. El push se dispara por un Database Webhook de Supabase en el `insert` de `pedidos` — totalmente desacoplado del checkout público — que llama a una ruta API protegida por un secreto compartido y envía con `web-push` a las suscripciones guardadas con Supabase Service Role (bypassa RLS, porque quien llama no tiene sesión de usuario).

**Tech Stack:** Next.js 16 (App Router), React 19, `@supabase/supabase-js` + `@supabase/ssr`, `web-push`, Vitest, Web Push API + Service Worker nativos del navegador.

## Global Constraints

- Una sola URL para las dos vistas (`/admin/pedidos`); no hay ruta separada para mobile.
- La vista mobile muestra **solo pedidos activos**, sin toggle a Historial (eso se sigue consultando desde desktop).
- Breakpoint mobile/desktop: `max-width: 767px` (alineado al `md` de Tailwind, 768px).
- `/admin/*` deja de mostrar el `Header`/`CartDrawer` públicos del sitio (hoy los aplica `src/app/layout.tsx` raíz a todo).
- El envío de push nunca depende de `guardarPedido()` ni del checkout público — se dispara aparte, vía Database Webhook de Supabase.
- El endpoint que envía el push (`/api/push/enviar`) lo llama Supabase, no un navegador con sesión: se protege con un header secreto (`x-webhook-secret`), no con login, y usa el cliente de Supabase **Service Role** para leer/borrar `push_subscriptions` (esa tabla tiene RLS de solo-autenticado, que el Service Role bypassa a propósito).
- El service worker (`public/sw.js`) es solo para habilitar Push API — no cachea assets, el sitio no necesita funcionar offline.
- Sin tests automatizados de hooks/componentes React: este proyecto no tiene infraestructura de testing de UI (no hay jsdom ni testing-library, `vitest.config.ts` corre en `environment: "node"`) y ningún componente/hook existente tiene tests — se sigue esa convención. Los hooks nuevos (`useEsMobil`, `usePedidosActivos`) se verifican manualmente en el navegador; toda la lógica que sí es una función pura o depende de Supabase (formateo, mapeo de push, lectura/escritura de suscripciones) sí lleva tests, igual que el resto del proyecto.
- Commits directos a `main`, sin branch separado — convención ya establecida en este proyecto.

---

### Task 1: Extraer utilidades compartidas de `PedidoCard`

**Files:**
- Create: `src/lib/formato-pedido.ts`
- Create: `src/lib/formato-pedido.test.ts`
- Modify: `src/lib/pedidos-mapeo.ts`
- Modify: `src/components/admin/PedidoCard.tsx`

**Interfaces:**
- Consumes: nada (primera tarea).
- Produces: `formatearPrecio(valor: number): string`, `formatearHora(creadoEn: string): string` desde `src/lib/formato-pedido.ts`; `COLOR_ESTADO: Record<EstadoPedido, string>` exportado desde `src/lib/pedidos-mapeo.ts`. Usados por la Task 4 (`PedidoCardMobile.tsx`).

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/formato-pedido.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatearPrecio, formatearHora } from "./formato-pedido";

describe("formatearPrecio", () => {
  it("formatea un número como moneda argentina sin decimales", () => {
    expect(formatearPrecio(8500)).toBe("$ 8.500");
  });
});

describe("formatearHora", () => {
  it("formatea una fecha ISO como día/mes, hora:minuto", () => {
    expect(formatearHora("2026-08-17T15:30:00.000Z")).toMatch(/^\d{1,2}\/\d{1,2}, \d{2}:\d{2}/);
  });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npx vitest run src/lib/formato-pedido.test.ts`
Expected: FAIL — no se encuentra el módulo `./formato-pedido`.

- [ ] **Step 3: Crear `formato-pedido.ts`**

Create `src/lib/formato-pedido.ts` (contenido movido tal cual desde `PedidoCard.tsx`):

```ts
export function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function formatearHora(creadoEn: string): string {
  return new Date(creadoEn).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npx vitest run src/lib/formato-pedido.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Mover `COLOR_ESTADO` a `pedidos-mapeo.ts`**

Modify `src/lib/pedidos-mapeo.ts` — agregar al final del archivo:

```ts
export const COLOR_ESTADO: Record<EstadoPedido, string> = {
  nuevo: "bg-brand-red text-white",
  en_preparacion: "bg-brand-orange text-white",
  listo: "bg-brand-yellow text-brand-black",
  entregado: "bg-brand-black/10 text-brand-black/70",
};
```

- [ ] **Step 6: Actualizar `PedidoCard.tsx` para usar las utilidades movidas**

Modify `src/components/admin/PedidoCard.tsx` — reemplazar las líneas 1-24 (imports + `formatearPrecio`/`formatearHora`/`COLOR_ESTADO` locales) por:

```tsx
"use client";

import { useState } from "react";
import {
  COLOR_ESTADO,
  EstadoPedido,
  ETIQUETAS_ESTADO,
  PedidoConItems,
  siguienteEstado,
} from "@/lib/pedidos-mapeo";
import { formatearPrecio, formatearHora } from "@/lib/formato-pedido";
```

(El resto del archivo, desde `export function PedidoCard(...)` en adelante, queda igual — ya no hay definiciones locales de `formatearPrecio`, `formatearHora` ni `COLOR_ESTADO` porque ahora se importan. `EstadoPedido` queda como import solo-de-tipo usado en la firma, sin cambios de comportamiento.)

- [ ] **Step 7: Correr toda la suite y el lint**

Run: `npm test && npm run lint`
Expected: todos los tests pasan, sin errores de lint (en particular, sin imports sin usar).

- [ ] **Step 8: Commit**

```bash
git add src/lib/formato-pedido.ts src/lib/formato-pedido.test.ts src/lib/pedidos-mapeo.ts src/components/admin/PedidoCard.tsx
git commit -m "refactor: extraer formato-pedido.ts y COLOR_ESTADO para reusar en la tarjeta mobile"
```

---

### Task 2: Hook `usePedidosActivos`

**Files:**
- Create: `src/lib/usePedidosActivos.ts`

**Interfaces:**
- Consumes: `PedidoConItems` (`./pedidos-mapeo`), `obtenerPedidosActivosCliente`/`avanzarEstadoPedido` (`./pedidos-admin-cliente`).
- Produces: `usePedidosActivos(pedidosIniciales: PedidoConItems[], activo?: boolean): { pedidos: PedidoConItems[]; avanzar: (pedido: PedidoConItems) => Promise<void> }`. Usado por la Task 3 (`PedidosAdminDesktop.tsx`) y la Task 5 (`PedidosAdminMobile.tsx`).

- [ ] **Step 1: Crear el hook**

Create `src/lib/usePedidosActivos.ts` (lógica de polling extraída de la `PedidosAdmin.tsx` actual — sin cambio de comportamiento, solo movida a un hook reusable; el parámetro `activo` reemplaza el `if (vista === "activos")` que hoy frena el polling cuando se está viendo el Historial):

```ts
import { useEffect, useState } from "react";
import type { PedidoConItems } from "./pedidos-mapeo";
import { obtenerPedidosActivosCliente, avanzarEstadoPedido } from "./pedidos-admin-cliente";

const INTERVALO_REFRESCO_MS = 15000;

export function usePedidosActivos(pedidosIniciales: PedidoConItems[], activo: boolean = true) {
  const [pedidos, setPedidos] = useState<PedidoConItems[]>(pedidosIniciales);

  useEffect(() => {
    if (!activo) return;
    obtenerPedidosActivosCliente().then(setPedidos);
    const intervalo = setInterval(() => {
      obtenerPedidosActivosCliente().then(setPedidos);
    }, INTERVALO_REFRESCO_MS);
    return () => clearInterval(intervalo);
  }, [activo]);

  async function avanzar(pedido: PedidoConItems) {
    await avanzarEstadoPedido(pedido.id, pedido.estado);
    const actualizados = await obtenerPedidosActivosCliente();
    setPedidos(actualizados);
  }

  return { pedidos, avanzar };
}
```

No lleva test automatizado — es un hook de React (no una función pura) y el proyecto no tiene infraestructura de testing de hooks/componentes (ver Global Constraints). Se verifica manualmente en la Task 3, que es la primera en usarlo.

- [ ] **Step 2: Commit**

```bash
git add src/lib/usePedidosActivos.ts
git commit -m "refactor: extraer usePedidosActivos como hook reusable"
```

---

### Task 3: `PedidosAdminDesktop.tsx`

**Files:**
- Create: `src/components/admin/PedidosAdminDesktop.tsx`
- Modify: `src/components/admin/PedidosAdmin.tsx`

**Interfaces:**
- Consumes: `usePedidosActivos` (Task 2), `PedidoCard` (existente), `obtenerPedidosEntregadosCliente` (`@/lib/pedidos-admin-cliente`, existente).
- Produces: `PedidosAdminDesktop({ pedidosIniciales }: { pedidosIniciales: PedidoConItems[] })`. Usado por la Task 5, que reemplaza el passthrough de este Task.

- [ ] **Step 1: Crear `PedidosAdminDesktop.tsx`**

Create `src/components/admin/PedidosAdminDesktop.tsx` (mismo comportamiento y JSX que la `PedidosAdmin.tsx` actual, usando el hook de la Task 2 para la parte de Activos):

```tsx
"use client";

import { useEffect, useState } from "react";
import type { PedidoConItems } from "@/lib/pedidos-mapeo";
import { obtenerPedidosEntregadosCliente } from "@/lib/pedidos-admin-cliente";
import { usePedidosActivos } from "@/lib/usePedidosActivos";
import { PedidoCard } from "./PedidoCard";

type Vista = "activos" | "historial";

export function PedidosAdminDesktop({ pedidosIniciales }: { pedidosIniciales: PedidoConItems[] }) {
  const [vista, setVista] = useState<Vista>("activos");
  const { pedidos: activos, avanzar } = usePedidosActivos(pedidosIniciales, vista === "activos");
  const [historial, setHistorial] = useState<PedidoConItems[]>([]);

  useEffect(() => {
    if (vista === "historial") {
      obtenerPedidosEntregadosCliente().then(setHistorial);
    }
  }, [vista]);

  const pedidos = vista === "activos" ? activos : historial;

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
              onAvanzar={vista === "activos" ? () => avanzar(pedido) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Convertir `PedidosAdmin.tsx` en un passthrough temporal**

Modify `src/components/admin/PedidosAdmin.tsx` — reemplazar todo el archivo por:

```ts
export { PedidosAdminDesktop as PedidosAdmin } from "./PedidosAdminDesktop";
```

(Passthrough temporal: `src/app/admin/pedidos/page.tsx` sigue importando `{ PedidosAdmin }` de este archivo sin cambios. La Task 5 reemplaza este contenido por el selector real desktop/mobile.)

- [ ] **Step 3: Verificar en el navegador que no cambió nada**

Run: `npm run dev`, abrir `http://localhost:3000/admin/pedidos` logueado como Percy.

Confirmar: la vista se ve idéntica a antes (toggle Activos/Historial, tarjetas, botón "Siguiente"), avanzar un pedido de estado sigue funcionando, y cambiar a Historial y volver a Activos sigue funcionando.

- [ ] **Step 4: Correr lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/PedidosAdminDesktop.tsx src/components/admin/PedidosAdmin.tsx
git commit -m "refactor: mover la vista desktop de pedidos a PedidosAdminDesktop"
```

---

### Task 4: `PedidoCardMobile.tsx`

**Files:**
- Create: `src/components/admin/PedidoCardMobile.tsx`

**Interfaces:**
- Consumes: `COLOR_ESTADO`, `ETIQUETAS_ESTADO`, `PedidoConItems`, `siguienteEstado` (`@/lib/pedidos-mapeo`, Task 1), `formatearPrecio`/`formatearHora` (`@/lib/formato-pedido`, Task 1).
- Produces: `PedidoCardMobile({ pedido, onAvanzar }: { pedido: PedidoConItems; onAvanzar: () => Promise<void> })`. Usado por la Task 5 (`PedidosAdminMobile.tsx`).

- [ ] **Step 1: Crear el componente**

Create `src/components/admin/PedidoCardMobile.tsx` (mismo contenido que `PedidoCard.tsx`, pero con tipografía y botón más grandes para uso táctil — es una interfaz pensada aparte, no una versión responsive comprimida, ver la spec):

```tsx
"use client";

import { useState } from "react";
import { COLOR_ESTADO, ETIQUETAS_ESTADO, PedidoConItems, siguienteEstado } from "@/lib/pedidos-mapeo";
import { formatearPrecio, formatearHora } from "@/lib/formato-pedido";

export function PedidoCardMobile({
  pedido,
  onAvanzar,
}: {
  pedido: PedidoConItems;
  onAvanzar: () => Promise<void>;
}) {
  const [avanzando, setAvanzando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proximoEstado = siguienteEstado(pedido.estado);

  async function manejarAvanzar() {
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
    <div className="rounded-xl border border-brand-black/10 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold text-brand-black">{pedido.clienteNombre}</p>
          <p className="text-base text-brand-black/60">{pedido.clienteTelefono}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${COLOR_ESTADO[pedido.estado]}`}>
          {ETIQUETAS_ESTADO[pedido.estado]}
        </span>
      </div>

      <p className="mb-3 text-base text-brand-black/70">
        {pedido.modalidad === "retiro"
          ? "Retiro en el local"
          : pedido.aCoordinar
            ? `Delivery a coordinar — ${pedido.direccion}`
            : `Delivery a ${pedido.direccion} (${pedido.zonaNombre})`}
      </p>

      <ul className="mb-3 flex flex-col gap-1.5 text-base">
        {pedido.items.map((item, indice) => (
          <li key={indice}>
            {item.cantidad}x {item.nombre} — {formatearPrecio(item.precioUnitario * item.cantidad)}
            {item.nota && <span className="text-brand-black/60"> ({item.nota})</span>}
          </li>
        ))}
      </ul>

      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-brand-black/60">{formatearHora(pedido.creadoEn)}</span>
        <span className="text-lg font-bold text-brand-orange-burnt">{formatearPrecio(pedido.total)}</span>
      </div>

      {error && <p className="mb-2 text-sm text-brand-red">{error}</p>}

      {proximoEstado && (
        <button
          type="button"
          onClick={manejarAvanzar}
          disabled={avanzando}
          className="w-full rounded-lg bg-brand-red px-4 py-4 text-base font-semibold text-white disabled:opacity-50"
        >
          Siguiente: {ETIQUETAS_ESTADO[proximoEstado]}
        </button>
      )}
    </div>
  );
}
```

No lleva test automatizado (componente React, ver Global Constraints) — se verifica visualmente en la Task 5, que es la primera en renderizarlo.

- [ ] **Step 2: Correr lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/PedidoCardMobile.tsx
git commit -m "feat: agregar PedidoCardMobile con tipografía y botón táctiles"
```

---

### Task 5: Hook `useEsMobil` + `PedidosAdminMobile.tsx` + selector

**Files:**
- Create: `src/lib/useEsMobil.ts`
- Create: `src/components/admin/PedidosAdminMobile.tsx`
- Modify: `src/components/admin/PedidosAdmin.tsx`

**Interfaces:**
- Consumes: `usePedidosActivos` (Task 2), `PedidoCardMobile` (Task 4), `PedidosAdminDesktop` (Task 3).
- Produces: `useEsMobil(): boolean` desde `src/lib/useEsMobil.ts`; `PedidosAdmin({ pedidosIniciales })` como selector final (reemplaza el passthrough de la Task 3). Usado por la Task 14 (`BannerNotificaciones` se inserta dentro de `PedidosAdminMobile`).

- [ ] **Step 1: Crear el hook `useEsMobil`**

Create `src/lib/useEsMobil.ts`:

```ts
import { useEffect, useState } from "react";

const CONSULTA_MOBIL = "(max-width: 767px)";

export function useEsMobil(): boolean {
  const [esMobil, setEsMobil] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(CONSULTA_MOBIL).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(CONSULTA_MOBIL);
    const manejarCambio = (evento: MediaQueryListEvent) => setEsMobil(evento.matches);
    setEsMobil(mediaQuery.matches);
    mediaQuery.addEventListener("change", manejarCambio);
    return () => mediaQuery.removeEventListener("change", manejarCambio);
  }, []);

  return esMobil;
}
```

- [ ] **Step 2: Crear `PedidosAdminMobile.tsx`**

Create `src/components/admin/PedidosAdminMobile.tsx` (sin toggle, solo pedidos activos, sin el banner de notificaciones todavía — eso se agrega en la Task 14):

```tsx
"use client";

import type { PedidoConItems } from "@/lib/pedidos-mapeo";
import { usePedidosActivos } from "@/lib/usePedidosActivos";
import { PedidoCardMobile } from "./PedidoCardMobile";

export function PedidosAdminMobile({ pedidosIniciales }: { pedidosIniciales: PedidoConItems[] }) {
  const { pedidos, avanzar } = usePedidosActivos(pedidosIniciales);

  return (
    <div className="flex flex-col gap-3">
      {pedidos.length === 0 ? (
        <p className="text-sm text-brand-black/60">No hay pedidos activos.</p>
      ) : (
        pedidos.map((pedido) => (
          <PedidoCardMobile key={pedido.id} pedido={pedido} onAvanzar={() => avanzar(pedido)} />
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 3: Reemplazar el passthrough de `PedidosAdmin.tsx` por el selector real**

Modify `src/components/admin/PedidosAdmin.tsx` — reemplazar todo el archivo por:

```tsx
"use client";

import type { PedidoConItems } from "@/lib/pedidos-mapeo";
import { useEsMobil } from "@/lib/useEsMobil";
import { PedidosAdminDesktop } from "./PedidosAdminDesktop";
import { PedidosAdminMobile } from "./PedidosAdminMobile";

export function PedidosAdmin({ pedidosIniciales }: { pedidosIniciales: PedidoConItems[] }) {
  const esMobil = useEsMobil();
  return esMobil ? (
    <PedidosAdminMobile pedidosIniciales={pedidosIniciales} />
  ) : (
    <PedidosAdminDesktop pedidosIniciales={pedidosIniciales} />
  );
}
```

- [ ] **Step 4: Verificar en el navegador**

Run: `npm run dev` (si no está corriendo ya), abrir `http://localhost:3000/admin/pedidos` logueado.

Con la ventana ancha (escritorio): confirmar que se ve la vista desktop de siempre (toggle Activos/Historial).

Achicar la ventana a menos de 768px de ancho (o usar el selector de dispositivo mobile del navegador): confirmar que cambia a la vista mobile (sin toggle, tarjetas grandes), que un pedido activo real se ve con toda su info, y que tocar "Siguiente" avanza el estado correctamente. Agrandar la ventana de nuevo y confirmar que vuelve a la vista desktop sin recargar la página (el cambio de `matchMedia` debe dispararse solo).

- [ ] **Step 5: Correr lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/lib/useEsMobil.ts src/components/admin/PedidosAdminMobile.tsx src/components/admin/PedidosAdmin.tsx
git commit -m "feat: agregar vista mobile de pedidos con selector por ancho de pantalla"
```

---

### Task 6: Layout de `/admin` sin header público

**Files:**
- Create: `src/app/admin/layout.tsx`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: layout propio para todas las rutas `/admin/*`. Modificado de nuevo en la Task 13 para agregar el `<link rel="manifest">` y el registro del service worker.

- [ ] **Step 1: Crear el layout**

Create `src/app/admin/layout.tsx`:

```tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white text-brand-black">{children}</div>;
}
```

Next.js anida layouts: este layout se renderiza **dentro** del `<body>` del layout raíz (`src/app/layout.tsx`), que hoy siempre incluye `<Header />` y `<CartDrawer />` alrededor de `{children}`. Para que `/admin/*` deje de mostrarlos hace falta sacarlos del layout raíz y moverlos al layout del sitio público — ver Step 2.

- [ ] **Step 2: Mover `Header`/`CartProvider`/`CartDrawer` del layout raíz a un layout propio del sitio público**

Create `src/app/(publico)/layout.tsx`:

```tsx
import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";

export default function PublicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Header />
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
```

Modify `src/app/layout.tsx` — dejarlo solo con el `<html>`/`<body>` base:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Percy Burger",
  description: "Pedí tu hamburguesa favorita de Percy Burger, Guaymallén, Mendoza.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-brand-black">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Mover las rutas públicas dentro del grupo `(publico)`**

Next.js usa `(nombre)` como *route group* — no agrega segmento a la URL, solo organiza el árbol de layouts. Hoy, además de `src/app/admin/`, las únicas rutas públicas que cuelgan directo de `src/app/` son `page.tsx` (home), `carrito/` y `checkout/`. Moverlas a `src/app/(publico)/`:

```bash
mkdir -p "src/app/(publico)"
git mv src/app/page.tsx "src/app/(publico)/page.tsx"
git mv src/app/carrito "src/app/(publico)/carrito"
git mv src/app/checkout "src/app/(publico)/checkout"
```

**No mover** `src/app/admin/`, `src/app/error.tsx`, `src/app/favicon.ico`, `src/app/globals.css`, `src/app/layout.tsx`. Si al hacer esto aparece alguna otra carpeta de ruta pública no listada acá (verificar con `ls src/app` antes del primer `git mv`), moverla también con el mismo patrón `git mv src/app/<ruta> "src/app/(publico)/<ruta>"`.

- [ ] **Step 4: Verificar en el navegador**

Run: `npm run dev`.

Abrir `http://localhost:3000/` — confirmar que el sitio público se ve exactamente igual que antes (header, carrito, checkout funcionando).

Abrir `http://localhost:3000/admin/pedidos` logueado — confirmar que **ya no** aparece el header público (logo/carrito del sitio de clientes) arriba del panel, tanto en la vista desktop como achicando la ventana a la vista mobile.

- [ ] **Step 5: Correr toda la suite y el lint**

Run: `npm test && npm run lint`
Expected: todo pasa (mover archivos de página no debería afectar ningún test existente, que están en `src/lib`).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: sacar el header público de las rutas /admin"
```

---

### Task 7: Tabla `push_subscriptions` en Supabase

**Files:**
- Create: `scripts/verificar-push-subscriptions.ts` (temporal — se borra en el Step 5 de esta misma tarea)
- Modify: `package.json` (agrega y luego quita el script `verificar-push-subscriptions`, y la dependencia temporal `tsx`)

**Interfaces:**
- Consumes: nada (independiente de las Tasks 1-6).
- Produces: tabla `push_subscriptions` existiendo en Supabase — precondición de las Tasks 8 y 9.

- [ ] **Step 1: Pedirle a Nicolás que corra el SQL en el SQL Editor de Supabase**

Pedirle a Nicolás que entre al SQL Editor de su proyecto en Supabase y corra:

```sql
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions lectura autenticada" on push_subscriptions;
create policy "push_subscriptions lectura autenticada" on push_subscriptions
  for select using (auth.role() = 'authenticated');

drop policy if exists "push_subscriptions escritura autenticada" on push_subscriptions;
create policy "push_subscriptions escritura autenticada" on push_subscriptions
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "push_subscriptions update autenticada" on push_subscriptions;
create policy "push_subscriptions update autenticada" on push_subscriptions
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "push_subscriptions borrado autenticada" on push_subscriptions;
create policy "push_subscriptions borrado autenticada" on push_subscriptions
  for delete using (auth.role() = 'authenticated');
```

Estas policies solo importan para accesos con la clave anónima (usuario logueado); el endpoint `/api/push/enviar` (Task 11) usa la clave Service Role, que bypassa RLS por diseño — ver Global Constraints. No avanzar al Step 2 hasta que Nicolás confirme que lo corrió sin errores.

- [ ] **Step 2: Agregar `tsx` como dependencia temporal**

Run: `npm install --save-dev tsx`

- [ ] **Step 3: Crear el script de verificación**

Create `scripts/verificar-push-subscriptions.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
}

const supabase = createClient(url, serviceRoleKey);

async function verificar() {
  const { error: errorInsert } = await supabase
    .from("push_subscriptions")
    .insert({ endpoint: "https://verificacion.temporal/endpoint", p256dh: "clave-p256dh", auth: "clave-auth" });
  if (errorInsert) throw new Error(`No se pudo insertar en push_subscriptions: ${errorInsert.message}`);
  console.log("Tabla push_subscriptions: OK (insert)");

  const { error: errorDelete } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", "https://verificacion.temporal/endpoint");
  if (errorDelete) throw new Error(`No se pudo borrar la fila de prueba: ${errorDelete.message}`);
  console.log("Verificación completa. Limpieza de datos de prueba hecha.");
}

verificar();
```

Agregar temporalmente a `package.json`, dentro de `"scripts"`:

```json
"verificar-push-subscriptions": "tsx --env-file=.env.local scripts/verificar-push-subscriptions.ts"
```

- [ ] **Step 4: Correr el script**

Run: `npm run verificar-push-subscriptions`

Expected:
```
Tabla push_subscriptions: OK (insert)
Verificación completa. Limpieza de datos de prueba hecha.
```

Si falla, no seguir a la Task 8 — revisar que el SQL del Step 1 se haya corrido completo y sin errores.

- [ ] **Step 5: Borrar el script temporal, su entrada en `package.json` y la dependencia `tsx`**

```bash
rm scripts/verificar-push-subscriptions.ts
npm uninstall tsx
```

Modify `package.json` — quitar la línea `"verificar-push-subscriptions": "..."` agregada en el Step 3.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: verificar tabla push_subscriptions en Supabase"
```

---

### Task 8: Cliente Service Role + `push-envio-admin.ts`

**Files:**
- Create: `src/lib/supabase/service.ts`
- Create: `src/lib/push-envio-admin.ts`
- Create: `src/lib/push-envio-admin.test.ts`

**Interfaces:**
- Consumes: tabla `push_subscriptions` (Task 7).
- Produces: `createSupabaseServiceClient()` desde `src/lib/supabase/service.ts`; `SuscripcionPush`, `obtenerSuscripciones(): Promise<SuscripcionPush[]>`, `eliminarSuscripciones(endpoints: string[]): Promise<void>` desde `src/lib/push-envio-admin.ts`. Usados por la Task 11 (`/api/push/enviar`).

- [ ] **Step 1: Crear el cliente Service Role**

Create `src/lib/supabase/service.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

export function createSupabaseServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
```

- [ ] **Step 2: Escribir los tests que fallan**

Create `src/lib/push-envio-admin.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("./supabase/service", () => ({
  createSupabaseServiceClient: () => ({ from: mockFrom }),
}));

import { obtenerSuscripciones, eliminarSuscripciones } from "./push-envio-admin";

beforeEach(() => {
  mockFrom.mockReset();
});

describe("obtenerSuscripciones", () => {
  it("trae endpoint, p256dh y auth de todas las suscripciones", async () => {
    const select = vi.fn().mockResolvedValue({
      data: [{ endpoint: "e1", p256dh: "p1", auth: "a1" }],
      error: null,
    });
    mockFrom.mockReturnValue({ select });

    const resultado = await obtenerSuscripciones();

    expect(mockFrom).toHaveBeenCalledWith("push_subscriptions");
    expect(select).toHaveBeenCalledWith("endpoint, p256dh, auth");
    expect(resultado).toEqual([{ endpoint: "e1", p256dh: "p1", auth: "a1" }]);
  });
});

describe("eliminarSuscripciones", () => {
  it("borra las suscripciones por endpoint", async () => {
    const in_ = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn(() => ({ in: in_ }));
    mockFrom.mockReturnValue({ delete: del });

    await eliminarSuscripciones(["e1", "e2"]);

    expect(mockFrom).toHaveBeenCalledWith("push_subscriptions");
    expect(in_).toHaveBeenCalledWith("endpoint", ["e1", "e2"]);
  });

  it("no llama a Supabase si la lista está vacía", async () => {
    await eliminarSuscripciones([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Correr los tests y confirmar que fallan**

Run: `npx vitest run src/lib/push-envio-admin.test.ts`
Expected: FAIL — no se encuentra el módulo `./push-envio-admin`.

- [ ] **Step 4: Crear `push-envio-admin.ts`**

Create `src/lib/push-envio-admin.ts`:

```ts
import { createSupabaseServiceClient } from "./supabase/service";

export interface SuscripcionPush {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function obtenerSuscripciones(): Promise<SuscripcionPush[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (error) throw new Error(`No se pudieron obtener las suscripciones: ${error.message}`);
  return data as SuscripcionPush[];
}

export async function eliminarSuscripciones(endpoints: string[]): Promise<void> {
  if (endpoints.length === 0) return;
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("push_subscriptions").delete().in("endpoint", endpoints);
  if (error) throw new Error(`No se pudieron eliminar las suscripciones vencidas: ${error.message}`);
}
```

- [ ] **Step 5: Correr los tests y confirmar que pasan**

Run: `npx vitest run src/lib/push-envio-admin.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase/service.ts src/lib/push-envio-admin.ts src/lib/push-envio-admin.test.ts
git commit -m "feat: agregar cliente Service Role y lectura/borrado de push_subscriptions"
```

---

### Task 9: `push-admin.ts` (`guardarSuscripcion`)

**Files:**
- Create: `src/lib/push-admin.ts`
- Create: `src/lib/push-admin.test.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient` (`./supabase/server`, existente).
- Produces: `SuscripcionPush`, `guardarSuscripcion(sub: SuscripcionPush): Promise<void>` desde `src/lib/push-admin.ts`. Usado por la Task 11 (`/api/push/suscribir`).

- [ ] **Step 1: Escribir los tests que fallan**

Create `src/lib/push-admin.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("./supabase/server", () => ({
  createSupabaseServerClient: async () => ({ from: mockFrom }),
}));

import { guardarSuscripcion } from "./push-admin";

beforeEach(() => {
  mockFrom.mockReset();
});

describe("guardarSuscripcion", () => {
  it("hace upsert de la suscripción por endpoint", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert });

    await guardarSuscripcion({ endpoint: "https://ejemplo.com/push/1", p256dh: "clave-p256dh", auth: "clave-auth" });

    expect(mockFrom).toHaveBeenCalledWith("push_subscriptions");
    expect(upsert).toHaveBeenCalledWith(
      { endpoint: "https://ejemplo.com/push/1", p256dh: "clave-p256dh", auth: "clave-auth" },
      { onConflict: "endpoint" },
    );
  });

  it("lanza un error legible si Supabase falla", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: "boom" } });
    mockFrom.mockReturnValue({ upsert });

    await expect(guardarSuscripcion({ endpoint: "e", p256dh: "p", auth: "a" })).rejects.toThrow(
      "No se pudo guardar la suscripción: boom",
    );
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npx vitest run src/lib/push-admin.test.ts`
Expected: FAIL — no se encuentra el módulo `./push-admin`.

- [ ] **Step 3: Crear `push-admin.ts`**

Create `src/lib/push-admin.ts`:

```ts
import { createSupabaseServerClient } from "./supabase/server";
import type { SuscripcionPush } from "./push-envio-admin";

export type { SuscripcionPush };

export async function guardarSuscripcion(sub: SuscripcionPush): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, { onConflict: "endpoint" });
  if (error) throw new Error(`No se pudo guardar la suscripción: ${error.message}`);
}
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

Run: `npx vitest run src/lib/push-admin.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/push-admin.ts src/lib/push-admin.test.ts
git commit -m "feat: agregar guardarSuscripcion (usuario autenticado)"
```

---

### Task 10: `push-mapeo.ts` (payload y filtrado de suscripciones vencidas)

**Files:**
- Create: `src/lib/push-mapeo.ts`
- Create: `src/lib/push-mapeo.test.ts`

**Interfaces:**
- Consumes: `formatearPrecio` (`./formato-pedido`, Task 1).
- Produces: `PedidoPushInfo`, `PushPayload`, `armarPayloadPush(pedido: PedidoPushInfo): PushPayload`; `ResultadoEnvioPush`, `endpointsInvalidos(resultados: ResultadoEnvioPush[]): string[]` desde `src/lib/push-mapeo.ts`. Usados por la Task 11 (`/api/push/enviar`).

- [ ] **Step 1: Escribir los tests que fallan**

Create `src/lib/push-mapeo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { armarPayloadPush, endpointsInvalidos } from "./push-mapeo";

describe("armarPayloadPush", () => {
  it("arma título, cuerpo con nombre y total formateado, y la url del panel", () => {
    const payload = armarPayloadPush({ clienteNombre: "Juan Pérez", total: 8500 });
    expect(payload).toEqual({
      title: "Pedido nuevo",
      body: "Juan Pérez — $ 8.500",
      url: "/admin/pedidos",
    });
  });
});

describe("endpointsInvalidos", () => {
  it("devuelve solo los endpoints con status 404 o 410", () => {
    const resultados = [
      { endpoint: "a", statusCode: 201 },
      { endpoint: "b", statusCode: 410 },
      { endpoint: "c", statusCode: 404 },
      { endpoint: "d", statusCode: null },
    ];
    expect(endpointsInvalidos(resultados)).toEqual(["b", "c"]);
  });

  it("devuelve una lista vacía si ninguna está vencida", () => {
    expect(endpointsInvalidos([{ endpoint: "a", statusCode: 201 }])).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npx vitest run src/lib/push-mapeo.test.ts`
Expected: FAIL — no se encuentra el módulo `./push-mapeo`.

- [ ] **Step 3: Crear `push-mapeo.ts`**

Create `src/lib/push-mapeo.ts`:

```ts
import { formatearPrecio } from "./formato-pedido";

export interface PedidoPushInfo {
  clienteNombre: string;
  total: number;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export function armarPayloadPush(pedido: PedidoPushInfo): PushPayload {
  return {
    title: "Pedido nuevo",
    body: `${pedido.clienteNombre} — ${formatearPrecio(pedido.total)}`,
    url: "/admin/pedidos",
  };
}

export interface ResultadoEnvioPush {
  endpoint: string;
  statusCode: number | null;
}

export function endpointsInvalidos(resultados: ResultadoEnvioPush[]): string[] {
  return resultados
    .filter((resultado) => resultado.statusCode === 404 || resultado.statusCode === 410)
    .map((resultado) => resultado.endpoint);
}
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

Run: `npx vitest run src/lib/push-mapeo.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/push-mapeo.ts src/lib/push-mapeo.test.ts
git commit -m "feat: agregar armarPayloadPush y endpointsInvalidos"
```

---

### Task 11: Rutas API `/api/push/suscribir` y `/api/push/enviar`

**Files:**
- Modify: `package.json` (agrega `web-push` y `@types/web-push`)
- Create: `src/app/api/push/suscribir/route.ts`
- Create: `src/app/api/push/enviar/route.ts`

**Interfaces:**
- Consumes: `guardarSuscripcion` (`@/lib/push-admin`, Task 9), `obtenerSuscripciones`/`eliminarSuscripciones` (`@/lib/push-envio-admin`, Task 8), `armarPayloadPush`/`endpointsInvalidos` (`@/lib/push-mapeo`, Task 10).
- Produces: `POST /api/push/suscribir`, `POST /api/push/enviar` — el segundo es consumido por el Database Webhook de Supabase configurado en la Task 15.

- [ ] **Step 1: Instalar `web-push`**

Run: `npm install web-push && npm install --save-dev @types/web-push`

- [ ] **Step 2: Crear la ruta de suscripción**

Create `src/app/api/push/suscribir/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { guardarSuscripcion } from "@/lib/push-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  try {
    await guardarSuscripcion({ endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Crear la ruta de envío**

Create `src/app/api/push/enviar/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { obtenerSuscripciones, eliminarSuscripciones } from "@/lib/push-envio-admin";
import { armarPayloadPush, endpointsInvalidos, type ResultadoEnvioPush } from "@/lib/push-mapeo";

export const runtime = "nodejs";

webpush.setVapidDetails(
  "mailto:nikogem.aguirre@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(request: NextRequest) {
  const secreto = request.headers.get("x-webhook-secret");
  if (secreto !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const pedido = body?.record;
  const total = Number(pedido?.total);
  if (!pedido?.cliente_nombre || Number.isNaN(total)) {
    return NextResponse.json({ error: "Payload de pedido inválido" }, { status: 400 });
  }

  const payload = armarPayloadPush({ clienteNombre: pedido.cliente_nombre, total });
  const suscripciones = await obtenerSuscripciones();

  const resultados: ResultadoEnvioPush[] = await Promise.all(
    suscripciones.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        return { endpoint: sub.endpoint, statusCode: null };
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode ?? null;
        return { endpoint: sub.endpoint, statusCode };
      }
    }),
  );

  const vencidos = endpointsInvalidos(resultados);
  await eliminarSuscripciones(vencidos);

  return NextResponse.json({ enviados: suscripciones.length - vencidos.length, eliminados: vencidos.length });
}
```

No llevan test automatizado directo (son wrappers finos de Next.js sobre funciones ya testeadas en las Tasks 8, 9 y 10 — mismo criterio que el resto de las rutas del proyecto, que tampoco testean `route.ts`/`page.tsx` directamente). Se verifican con `curl` en el Step 4 y de punta a punta en la Task 15.

- [ ] **Step 4: Verificar `/api/push/suscribir` manualmente**

Run: `npm run dev` (si no está corriendo), y en otra terminal, con una sesión de Percy activa en el navegador — copiar el valor de la cookie de sesión de Supabase desde las DevTools (Application → Cookies) y correr:

```bash
curl -i -X POST http://localhost:3000/api/push/suscribir \
  -H "Content-Type: application/json" \
  -H "Cookie: <cookies-copiadas-del-navegador>" \
  -d '{"endpoint":"https://prueba.local/endpoint","keys":{"p256dh":"clave-p256dh","auth":"clave-auth"}}'
```

Expected: `HTTP/1.1 200` con `{"ok":true}`. Confirmar en el SQL Editor de Supabase que apareció la fila en `push_subscriptions`, y borrarla a mano después de verificar (`delete from push_subscriptions where endpoint = 'https://prueba.local/endpoint';`).

Sin la cookie (o con una sesión inválida), confirmar que devuelve `401`.

- [ ] **Step 5: Correr lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/app/api/push
git commit -m "feat: agregar rutas API de suscripción y envío de push"
```

---

### Task 12: `push-cliente.ts` (helpers del navegador)

**Files:**
- Create: `src/lib/push-cliente.ts`
- Create: `src/lib/push-cliente.test.ts`

**Interfaces:**
- Consumes: nada (funciones puras sobre `navigator`/`window`).
- Produces: `convertirClaveVapid(clave: string): Uint8Array`, `esIphoneSinInstalar(): boolean`, `soportaPush(): boolean` desde `src/lib/push-cliente.ts`. Usados por la Task 14 (`BannerNotificaciones.tsx`).

- [ ] **Step 1: Escribir los tests que fallan**

Create `src/lib/push-cliente.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { convertirClaveVapid, esIphoneSinInstalar, soportaPush } from "./push-cliente";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("convertirClaveVapid", () => {
  it("convierte una clave base64url a Uint8Array", () => {
    // "AAECAw" en base64url decodifica a los bytes [0, 1, 2, 3]
    expect(convertirClaveVapid("AAECAw")).toEqual(new Uint8Array([0, 1, 2, 3]));
  });
});

describe("esIphoneSinInstalar", () => {
  it("devuelve true en iPhone Safari sin instalar como PWA", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      standalone: false,
    });
    expect(esIphoneSinInstalar()).toBe(true);
  });

  it("devuelve false si ya está instalado como PWA", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      standalone: true,
    });
    expect(esIphoneSinInstalar()).toBe(false);
  });

  it("devuelve false en Android", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 14)", standalone: false });
    expect(esIphoneSinInstalar()).toBe(false);
  });
});

describe("soportaPush", () => {
  it("devuelve true si el navegador tiene serviceWorker y PushManager", () => {
    vi.stubGlobal("navigator", { serviceWorker: {} });
    vi.stubGlobal("window", { PushManager: class {} });
    expect(soportaPush()).toBe(true);
  });

  it("devuelve false si falta PushManager", () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("window", {});
    expect(soportaPush()).toBe(false);
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npx vitest run src/lib/push-cliente.test.ts`
Expected: FAIL — no se encuentra el módulo `./push-cliente`.

- [ ] **Step 3: Crear `push-cliente.ts`**

Create `src/lib/push-cliente.ts`:

```ts
export function convertirClaveVapid(clave: string): Uint8Array {
  const padding = "=".repeat((4 - (clave.length % 4)) % 4);
  const base64 = (clave + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((caracter) => caracter.charCodeAt(0)));
}

export function esIphoneSinInstalar(): boolean {
  if (typeof navigator === "undefined") return false;
  const esIphone = /iPhone|iPad/.test(navigator.userAgent);
  const esStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return esIphone && !esStandalone;
}

export function soportaPush(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

Run: `npx vitest run src/lib/push-cliente.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/push-cliente.ts src/lib/push-cliente.test.ts
git commit -m "feat: agregar helpers de push del lado del navegador"
```

---

### Task 13: Manifest, íconos y service worker

**Files:**
- Create: `scripts/generar-iconos-pwa.py`
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Modify: `src/app/admin/layout.tsx`

**Interfaces:**
- Consumes: `public/logo/logo-completo.png` (existente).
- Produces: `/manifest.json`, `/sw.js`, íconos `public/logo/icono-192.png`/`public/logo/icono-512.png`, service worker registrado. Consumido por la Task 14 (`BannerNotificaciones.tsx` llama a `navigator.serviceWorker.register`, pero solo si no está ya registrado — el registro real vive acá).

- [ ] **Step 1: Crear el script de íconos**

Create `scripts/generar-iconos-pwa.py`:

```python
"""Genera los íconos PWA (192x192 y 512x512) del panel de administración de
Percy Burger a partir del logo completo, con fondo negro de marca.

Se corre una sola vez, a mano, cuando el logo fuente cambia. No forma parte
del build de Next.js.

Uso: python3 scripts/generar-iconos-pwa.py
"""
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
FUENTE = REPO_ROOT / "public" / "logo" / "logo-completo.png"
DESTINO = REPO_ROOT / "public" / "logo"

FONDO = (22, 22, 22, 255)  # #161616, brand-black
TAMANOS = [192, 512]
MARGEN = 0.12  # 12% de margen alrededor del logo dentro del ícono


def generar(tamano: int) -> None:
    logo = Image.open(FUENTE).convert("RGBA")
    lienzo = Image.new("RGBA", (tamano, tamano), FONDO)

    espacio_util = int(tamano * (1 - 2 * MARGEN))
    escala = min(espacio_util / logo.width, espacio_util / logo.height)
    nuevo_tamano = (round(logo.width * escala), round(logo.height * escala))
    logo_redimensionado = logo.resize(nuevo_tamano, Image.LANCZOS)

    x = (tamano - nuevo_tamano[0]) // 2
    y = (tamano - nuevo_tamano[1]) // 2
    lienzo.paste(logo_redimensionado, (x, y), logo_redimensionado)

    destino = DESTINO / f"icono-{tamano}.png"
    lienzo.save(destino)
    print(f"Generado {destino}")


if __name__ == "__main__":
    for tamano in TAMANOS:
        generar(tamano)
```

- [ ] **Step 2: Correr el script**

Run: `python3 scripts/generar-iconos-pwa.py`
Expected:
```
Generado .../public/logo/icono-192.png
Generado .../public/logo/icono-512.png
```

- [ ] **Step 3: Crear el manifest**

Next.js tiene una convención de archivo `app/manifest.json`/`app/manifest.ts` que auto-inyecta el `<link rel="manifest">`, pero solo admite **uno por app, en la raíz** — no se puede scopear a `/admin` con ella. Como el manifest debe aplicar solo al panel (el sitio público no debe ofrecer instalarse como app), se usa en cambio un `manifest.json` estático en `public/` con un `<link>` manual agregado a mano solo en el layout de `/admin` (Step 5) — es el enfoque estándar del Web Manifest fuera de la convención especial de Next.

Create `public/manifest.json`:

```json
{
  "name": "Percy Burger · Panel",
  "short_name": "Percy Admin",
  "start_url": "/admin/pedidos",
  "display": "standalone",
  "background_color": "#161616",
  "theme_color": "#161616",
  "icons": [
    { "src": "/logo/icono-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/logo/icono-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 4: Crear el service worker**

Create `public/sw.js`:

```js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Percy Burger";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/logo/icono-192.png",
      data: { url: data.url || "/admin/pedidos" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin/pedidos";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
```

- [ ] **Step 5: Registrar el manifest y el service worker en el layout de `/admin`**

Modify `src/app/admin/layout.tsx` — reemplazar todo el archivo por:

```tsx
"use client";

import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si falla el registro (navegador sin soporte, contexto no seguro, etc.),
        // el panel sigue funcionando igual con el polling de 15s como fallback.
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-brand-black">
      <link rel="manifest" href="/manifest.json" />
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Verificar en el navegador**

Run: `npm run dev`, abrir `http://localhost:3000/admin/pedidos` logueado.

En DevTools → Application → Manifest: confirmar que carga `manifest.json` sin errores y muestra los dos íconos. En Application → Service Workers: confirmar que `sw.js` está registrado y "activated". Confirmar que Chrome ofrece instalar la página (ícono de instalación en la barra de direcciones, o "Instalar app" en el menú).

- [ ] **Step 7: Correr lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add scripts/generar-iconos-pwa.py public/manifest.json public/sw.js public/logo/icono-192.png public/logo/icono-512.png src/app/admin/layout.tsx
git commit -m "feat: agregar manifest, íconos y service worker para instalar el panel como PWA"
```

---

### Task 14: `BannerNotificaciones.tsx`

**Files:**
- Create: `src/components/admin/BannerNotificaciones.tsx`
- Modify: `src/components/admin/PedidosAdminMobile.tsx`

**Interfaces:**
- Consumes: `convertirClaveVapid`, `esIphoneSinInstalar`, `soportaPush` (`@/lib/push-cliente`, Task 12); `POST /api/push/suscribir` (Task 11).
- Produces: `BannerNotificaciones` insertado dentro de `PedidosAdminMobile`.

- [ ] **Step 1: Crear el banner**

Create `src/components/admin/BannerNotificaciones.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { convertirClaveVapid, esIphoneSinInstalar, soportaPush } from "@/lib/push-cliente";

type Estado = "oculto" | "ofrecer" | "instalar-primero" | "activado" | "error";

export function BannerNotificaciones() {
  const [estado, setEstado] = useState<Estado>("oculto");

  useEffect(() => {
    if (!soportaPush()) return;
    if (Notification.permission === "denied" || Notification.permission === "granted") return;
    setEstado(esIphoneSinInstalar() ? "instalar-primero" : "ofrecer");
  }, []);

  async function activar() {
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") {
      setEstado("error");
      return;
    }
    try {
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertirClaveVapid(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      await fetch("/api/push/suscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(suscripcion.toJSON()),
      });
      setEstado("activado");
    } catch {
      setEstado("error");
    }
  }

  if (estado === "oculto" || estado === "activado") return null;

  return (
    <div className="rounded-lg border border-brand-orange/30 bg-brand-orange/10 p-3 text-sm text-brand-black">
      {estado === "instalar-primero" && (
        <p>
          Para recibir avisos de pedidos nuevos, agregá esta página a tu pantalla de inicio primero
          (compartir → Agregar a inicio).
        </p>
      )}
      {estado === "ofrecer" && (
        <div className="flex items-center justify-between gap-3">
          <p>Activá los avisos para enterarte apenas entra un pedido nuevo.</p>
          <button
            type="button"
            onClick={activar}
            className="shrink-0 rounded-md bg-brand-orange px-3 py-2 font-semibold text-white"
          >
            Activar
          </button>
        </div>
      )}
      {estado === "error" && <p>No pudimos activar los avisos. Podés seguir usando la lista normalmente.</p>}
    </div>
  );
}
```

`navigator.serviceWorker.ready` espera al registro que ya hace `src/app/admin/layout.tsx` (Task 13) — no vuelve a registrar el service worker acá.

- [ ] **Step 2: Insertar el banner en la vista mobile**

Modify `src/components/admin/PedidosAdminMobile.tsx`:

```tsx
"use client";

import type { PedidoConItems } from "@/lib/pedidos-mapeo";
import { usePedidosActivos } from "@/lib/usePedidosActivos";
import { PedidoCardMobile } from "./PedidoCardMobile";
import { BannerNotificaciones } from "./BannerNotificaciones";

export function PedidosAdminMobile({ pedidosIniciales }: { pedidosIniciales: PedidoConItems[] }) {
  const { pedidos, avanzar } = usePedidosActivos(pedidosIniciales);

  return (
    <div className="flex flex-col gap-3">
      <BannerNotificaciones />
      {pedidos.length === 0 ? (
        <p className="text-sm text-brand-black/60">No hay pedidos activos.</p>
      ) : (
        pedidos.map((pedido) => (
          <PedidoCardMobile key={pedido.id} pedido={pedido} onAvanzar={() => avanzar(pedido)} />
        ))
      )}
    </div>
  );
}
```

No lleva test automatizado (componente React, ver Global Constraints) — se verifica de punta a punta en la Task 15, una vez configuradas las claves VAPID reales.

- [ ] **Step 3: Correr lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/BannerNotificaciones.tsx src/components/admin/PedidosAdminMobile.tsx
git commit -m "feat: agregar banner de activación de notificaciones a la vista mobile"
```

---

### Task 15: Claves VAPID, variables de entorno, Database Webhook y verificación end-to-end

**Files:**
- Modify: `.env.local` (no se commitea — ver `.gitignore`)
- Modify: `.env.local.example`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: sistema de push funcionando de punta a punta en producción. Última tarea del sub-proyecto.

- [ ] **Step 1: Generar las claves VAPID**

Run: `npx web-push generate-vapid-keys`

Expected: imprime un par `Public Key` / `Private Key`.

- [ ] **Step 2: Generar el secreto del webhook**

Run: `openssl rand -hex 32`

Expected: un string hexadecimal de 64 caracteres — este va a ser `PUSH_WEBHOOK_SECRET`.

- [ ] **Step 3: Cargar las variables en `.env.local`**

Modify `.env.local` — agregar (sin commitear, ya está en `.gitignore`):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<Public Key del Step 1>
VAPID_PRIVATE_KEY=<Private Key del Step 1>
PUSH_WEBHOOK_SECRET=<hex del Step 2>
```

- [ ] **Step 4: Actualizar `.env.local.example`**

Modify `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
PUSH_WEBHOOK_SECRET=
```

- [ ] **Step 5: Commit**

```bash
git add .env.local.example
git commit -m "docs: documentar variables de entorno de push en .env.local.example"
```

- [ ] **Step 6: Pedirle a Nicolás que cargue las mismas variables en Vercel y redeploye**

Pedirle que en Vercel vaya a Project Settings → Environments → **Production** (no "Environment Variables" a secas — mismo detalle que ya salió con las claves de Supabase) y cargue `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `PUSH_WEBHOOK_SECRET` con los mismos valores del Step 3, y que fuerce un redeploy.

No avanzar al Step 7 hasta confirmar que el deploy terminó y `https://percy-burger.vercel.app/admin/pedidos` carga bien.

- [ ] **Step 7: Pedirle a Nicolás que configure el Database Webhook en Supabase**

Pedirle que en el dashboard de Supabase vaya a **Database → Webhooks → Create a new hook**, y cargue:

- Name: `push-pedido-nuevo`
- Table: `pedidos`
- Events: `Insert` (solo ese, no Update ni Delete)
- Type: `HTTP Request`
- Method: `POST`
- URL: `https://percy-burger.vercel.app/api/push/enviar`
- HTTP Headers: agregar `x-webhook-secret` con el mismo valor de `PUSH_WEBHOOK_SECRET` cargado en Vercel

- [ ] **Step 8: Verificación end-to-end real**

En un celular real (Android si está disponible; si hay un iPhone a mano, probar también agregando la página a la pantalla de inicio primero, según el aviso del banner):

1. Abrir `https://percy-burger.vercel.app/admin/pedidos`, loguearse como Percy.
2. Confirmar que aparece el banner de notificaciones (o el aviso de instalar como PWA en iPhone sin instalar).
3. Tocar "Activar" y conceder el permiso del navegador.
4. Desde otro dispositivo/navegador, hacer un pedido de prueba real en `https://percy-burger.vercel.app/` (checkout público).
5. Confirmar que llega la notificación push al celular de Percy con el nombre del cliente y el total.
6. Tocar la notificación y confirmar que abre `/admin/pedidos` con el pedido nuevo visible en la lista.
7. Confirmar también que, sin haber activado notificaciones, la vista mobile se sigue viendo y actualizando bien por polling (por ejemplo, en un segundo navegador sin permiso concedido).

- [ ] **Step 9: Actualizar el vault**

Actualizar `Pendientes.md` y `Panel de administración.md` en `~/Obsidian/Percy Burger/`: sub-proyecto C cerrado (vista mobile + push), y anotar cuáles de los sub-proyectos restantes del panel (zonas de envío, Mercado Pago, imágenes por IA, reportes) siguen en espera de que Percy decida seguir invirtiendo en la web, según lo que ya está registrado ahí.
