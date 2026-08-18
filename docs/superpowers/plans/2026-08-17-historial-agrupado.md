# Historial agrupado por día/semana, con totales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agrupar el Historial de `/admin/pedidos` (escritorio y mobile) por día (últimos 7 días) y por semana calendario (lo más viejo), mostrando el total vendido al lado de cada grupo.

**Architecture:** Una función pura nueva (`agruparHistorial`) arma los grupos a partir de los pedidos entregados que la app ya trae hoy — no se toca la consulta a Supabase. Un componente chico y genérico (`HistorialAgrupado`) dibuja los grupos y delega la tarjeta de cada pedido a quien lo use, así lo reusan tanto la vista de escritorio (`PedidoCard`) como la de mobile (`PedidoCardMobile`), que hoy no tiene Historial y lo suma en este plan.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Vitest.

## Global Constraints

- El agrupado se hace en el navegador sobre los datos que ya trae `obtenerPedidosEntregadosCliente()` — no se modifica esa consulta ni se agrega paginado.
- Últimos 7 días corridos (hoy + los 6 anteriores, días 0 a 6): un grupo por día. 7 días atrás o más: grupo por semana calendario, lunes a domingo.
- Los cortes de día/semana usan el reloj y la zona horaria del navegador donde corre la vista — sin manejo de zona horaria aparte.
- Cada grupo trae su `total`: suma de `pedido.total` de sus pedidos.
- Sin acordeón: cada grupo se muestra siempre abierto, con su lista de pedidos visible.
- El total mostrado es la suma de lo vendido (`pedido.total`), no una ganancia real — el sistema no registra costos.
- Sin tests de componentes React (`HistorialAgrupado`, cambios en `PedidosAdminDesktop`/`PedidosAdminMobile`) — mismo criterio que el resto del proyecto, se verifican a mano en el navegador. La función pura `agruparHistorial` sí lleva tests.
- Commits directos a `main`, sin branch separado — convención de este proyecto.

---

### Task 1: `agruparHistorial` — función pura de agrupado

**Files:**
- Create: `src/lib/historial-mapeo.ts`
- Create: `src/lib/historial-mapeo.test.ts`

**Interfaces:**
- Consumes: `PedidoConItems` (`./pedidos-mapeo`, existente).
- Produces: `GrupoHistorial` (`{ tipo: "dia" | "semana"; etiqueta: string; total: number; pedidos: PedidoConItems[] }`) y `agruparHistorial(pedidos: PedidoConItems[], ahora?: Date): GrupoHistorial[]` desde `src/lib/historial-mapeo.ts`. Usados por la Task 2 (`HistorialAgrupado`) y las Tasks 4 y 5.

- [ ] **Step 1: Escribir los tests que fallan**

Create `src/lib/historial-mapeo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { agruparHistorial } from "./historial-mapeo";
import type { PedidoConItems } from "./pedidos-mapeo";

const AHORA = new Date(2026, 7, 17, 15, 0, 0); // lunes 17 de agosto de 2026

function crearPedido(id: string, creadoEn: Date, total: number): PedidoConItems {
  return {
    id,
    estado: "entregado",
    clienteNombre: `Cliente ${id}`,
    clienteTelefono: "0000000000",
    modalidad: "retiro",
    direccion: null,
    zonaNombre: null,
    aCoordinar: false,
    costoEnvio: 0,
    subtotal: total,
    total,
    creadoEn: creadoEn.toISOString(),
    items: [],
  };
}

function haceDias(dias: number, hora: number = 12): Date {
  const fecha = new Date(AHORA);
  fecha.setDate(fecha.getDate() - dias);
  fecha.setHours(hora, 0, 0, 0);
  return fecha;
}

describe("agruparHistorial", () => {
  it("lista vacía devuelve []", () => {
    expect(agruparHistorial([], AHORA)).toEqual([]);
  });

  it("un pedido de hoy cae en un grupo de día con la etiqueta de hoy", () => {
    const pedido = crearPedido("hoy", haceDias(0), 5000);
    const grupos = agruparHistorial([pedido], AHORA);
    expect(grupos).toEqual([{ tipo: "dia", etiqueta: "17 de agosto", total: 5000, pedidos: [pedido] }]);
  });

  it("un pedido de exactamente 6 días atrás todavía es día suelto (último día de la ventana)", () => {
    const pedido = crearPedido("seis", haceDias(6), 3000);
    const grupos = agruparHistorial([pedido], AHORA);
    expect(grupos).toEqual([{ tipo: "dia", etiqueta: "11 de agosto", total: 3000, pedidos: [pedido] }]);
  });

  it("un pedido de exactamente 7 días atrás ya cae en un grupo de semana (primer día fuera de la ventana)", () => {
    const pedido = crearPedido("siete", haceDias(7), 4000);
    const grupos = agruparHistorial([pedido], AHORA);
    expect(grupos).toEqual([{ tipo: "semana", etiqueta: "10 al 16 de agosto", total: 4000, pedidos: [pedido] }]);
  });

  it("varios pedidos del mismo día quedan en un solo grupo con el total sumado", () => {
    const pedidoA = crearPedido("a", haceDias(0, 20), 5000);
    const pedidoB = crearPedido("b", haceDias(0, 10), 3000);
    const grupos = agruparHistorial([pedidoA, pedidoB], AHORA);
    expect(grupos).toEqual([{ tipo: "dia", etiqueta: "17 de agosto", total: 8000, pedidos: [pedidoA, pedidoB] }]);
  });

  it("una semana que cruza de mes etiqueta con los dos nombres de mes", () => {
    const pedido = crearPedido("cruce", haceDias(20), 2000);
    const grupos = agruparHistorial([pedido], AHORA);
    expect(grupos).toEqual([
      { tipo: "semana", etiqueta: "27 de julio al 2 de agosto", total: 2000, pedidos: [pedido] },
    ]);
  });

  it("ordena los grupos del más nuevo al más viejo, preservando el orden de los pedidos dentro de cada grupo", () => {
    const pedidoHoyNuevo = crearPedido("hoy-nuevo", haceDias(0, 20), 1000);
    const pedidoHoyViejo = crearPedido("hoy-viejo", haceDias(0, 10), 1000);
    const pedidoSemana = crearPedido("semana", haceDias(7), 1000);
    const grupos = agruparHistorial([pedidoHoyNuevo, pedidoHoyViejo, pedidoSemana], AHORA);
    expect(grupos.map((g) => g.etiqueta)).toEqual(["17 de agosto", "10 al 16 de agosto"]);
    expect(grupos[0].pedidos).toEqual([pedidoHoyNuevo, pedidoHoyViejo]);
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npx vitest run src/lib/historial-mapeo.test.ts`
Expected: FAIL — no se encuentra el módulo `./historial-mapeo`.

- [ ] **Step 3: Crear `historial-mapeo.ts`**

Create `src/lib/historial-mapeo.ts`:

```ts
import type { PedidoConItems } from "./pedidos-mapeo";

export type GrupoHistorial = {
  tipo: "dia" | "semana";
  etiqueta: string;
  total: number;
  pedidos: PedidoConItems[];
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function diferenciaEnDias(a: Date, b: Date): number {
  const unDiaMs = 24 * 60 * 60 * 1000;
  return Math.round((inicioDelDia(a).getTime() - inicioDelDia(b).getTime()) / unDiaMs);
}

function etiquetaDia(fecha: Date): string {
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

function inicioDeSemana(fecha: Date): Date {
  const dia = inicioDelDia(fecha);
  const diaSemana = dia.getDay();
  const offset = diaSemana === 0 ? 6 : diaSemana - 1;
  dia.setDate(dia.getDate() - offset);
  return dia;
}

function etiquetaSemana(inicio: Date): string {
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);
  if (inicio.getMonth() === fin.getMonth()) {
    return `${inicio.getDate()} al ${fin.getDate()} de ${MESES[inicio.getMonth()]}`;
  }
  return `${inicio.getDate()} de ${MESES[inicio.getMonth()]} al ${fin.getDate()} de ${MESES[fin.getMonth()]}`;
}

type GrupoInterno = { tipo: "dia" | "semana"; etiqueta: string; orden: number; pedidos: PedidoConItems[] };

export function agruparHistorial(pedidos: PedidoConItems[], ahora: Date = new Date()): GrupoHistorial[] {
  const grupos = new Map<string, GrupoInterno>();

  for (const pedido of pedidos) {
    const fechaPedido = new Date(pedido.creadoEn);
    const diasAtras = diferenciaEnDias(ahora, fechaPedido);

    if (diasAtras <= 6) {
      const dia = inicioDelDia(fechaPedido);
      const clave = `dia-${dia.getTime()}`;
      if (!grupos.has(clave)) {
        grupos.set(clave, { tipo: "dia", etiqueta: etiquetaDia(dia), orden: dia.getTime(), pedidos: [] });
      }
      grupos.get(clave)!.pedidos.push(pedido);
    } else {
      const inicio = inicioDeSemana(fechaPedido);
      const clave = `semana-${inicio.getTime()}`;
      if (!grupos.has(clave)) {
        grupos.set(clave, { tipo: "semana", etiqueta: etiquetaSemana(inicio), orden: inicio.getTime(), pedidos: [] });
      }
      grupos.get(clave)!.pedidos.push(pedido);
    }
  }

  return Array.from(grupos.values())
    .sort((a, b) => b.orden - a.orden)
    .map(({ tipo, etiqueta, pedidos }) => ({
      tipo,
      etiqueta,
      total: pedidos.reduce((suma, pedido) => suma + pedido.total, 0),
      pedidos,
    }));
}
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

Run: `npx vitest run src/lib/historial-mapeo.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/historial-mapeo.ts src/lib/historial-mapeo.test.ts
git commit -m "feat: agregar agruparHistorial (día/semana con totales)"
```

---

### Task 2: `HistorialAgrupado` — componente compartido

**Files:**
- Create: `src/components/admin/HistorialAgrupado.tsx`

**Interfaces:**
- Consumes: `GrupoHistorial` (`@/lib/historial-mapeo`, Task 1), `PedidoConItems` (`@/lib/pedidos-mapeo`, existente), `formatearPrecio` (`@/lib/formato-pedido`, existente).
- Produces: `HistorialAgrupado` (Client Component) desde `src/components/admin/HistorialAgrupado.tsx`. Usado por las Tasks 4 y 5.

- [ ] **Step 1: Crear el componente**

Create `src/components/admin/HistorialAgrupado.tsx`:

```tsx
import type { ReactNode } from "react";
import type { PedidoConItems } from "@/lib/pedidos-mapeo";
import type { GrupoHistorial } from "@/lib/historial-mapeo";
import { formatearPrecio } from "@/lib/formato-pedido";

export function HistorialAgrupado({
  grupos,
  renderPedido,
}: {
  grupos: GrupoHistorial[];
  renderPedido: (pedido: PedidoConItems) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      {grupos.map((grupo) => (
        <div key={grupo.etiqueta} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between border-b border-brand-black/10 pb-1">
            <h3 className="text-sm font-semibold text-brand-black/70">{grupo.etiqueta}</h3>
            <span className="text-sm font-semibold text-brand-black/70">{formatearPrecio(grupo.total)}</span>
          </div>
          <div className="flex flex-col gap-3">{grupo.pedidos.map(renderPedido)}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Correr tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos (el componente no se usa todavía en ningún lado, pero tiene que compilar solo).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/HistorialAgrupado.tsx
git commit -m "feat: agregar componente HistorialAgrupado"
```

---

### Task 3: Hacer opcional `onAvanzar` en `PedidoCardMobile`

**Files:**
- Modify: `src/components/admin/PedidoCardMobile.tsx`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `PedidoCardMobile` con `onAvanzar?: () => Promise<void>` (antes era obligatorio) — necesario para la Task 5, donde se dibuja sin acción de avanzar dentro del Historial (los pedidos entregados no tienen siguiente estado).

- [ ] **Step 1: Modificar el tipo de la prop y el chequeo del botón**

Modify `src/components/admin/PedidoCardMobile.tsx` — cambiar la firma de props y el manejo de `onAvanzar`:

```tsx
export function PedidoCardMobile({
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
```

Y más abajo, en el JSX, cambiar la condición del botón de `{proximoEstado && (` a:

```tsx
      {onAvanzar && proximoEstado && (
```

- [ ] **Step 2: Correr tipos y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores (el único lugar que usa `PedidoCardMobile` hoy, `PedidosAdminMobile.tsx`, sigue pasando `onAvanzar`, así que no se rompe nada).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/PedidoCardMobile.tsx
git commit -m "fix: hacer opcional onAvanzar en PedidoCardMobile para reusarlo en el Historial"
```

---

### Task 4: Agrupar el Historial en la vista de escritorio

**Files:**
- Modify: `src/components/admin/PedidosAdminDesktop.tsx`

**Interfaces:**
- Consumes: `agruparHistorial` (`@/lib/historial-mapeo`, Task 1), `HistorialAgrupado` (`./HistorialAgrupado`, Task 2).
- Produces: nada nuevo — cambio de comportamiento visual en un componente ya existente.

- [ ] **Step 1: Reemplazar el render de la lista de pedidos**

Modify `src/components/admin/PedidosAdminDesktop.tsx` — agregar los imports:

```tsx
import { agruparHistorial } from "@/lib/historial-mapeo";
import { HistorialAgrupado } from "./HistorialAgrupado";
```

Y reemplazar todo el bloque desde `const pedidos = vista === "activos" ? activos : historial;` hasta el cierre del `return` por:

```tsx
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

      {vista === "activos" ? (
        activos.length === 0 ? (
          <p className="text-sm text-brand-black/60">No hay pedidos activos.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {activos.map((pedido) => (
              <PedidoCard key={pedido.id} pedido={pedido} onAvanzar={() => avanzar(pedido)} />
            ))}
          </div>
        )
      ) : historial.length === 0 ? (
        <p className="text-sm text-brand-black/60">Todavía no hay pedidos entregados.</p>
      ) : (
        <HistorialAgrupado
          grupos={agruparHistorial(historial)}
          renderPedido={(pedido) => <PedidoCard key={pedido.id} pedido={pedido} />}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Correr tipos y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/PedidosAdminDesktop.tsx
git commit -m "feat: agrupar el Historial de escritorio por día/semana con totales"
```

---

### Task 5: Sumar Historial (agrupado) a la vista mobile

**Files:**
- Modify: `src/components/admin/PedidosAdminMobile.tsx`

**Interfaces:**
- Consumes: `agruparHistorial` (`@/lib/historial-mapeo`, Task 1), `HistorialAgrupado` (`./HistorialAgrupado`, Task 2), `obtenerPedidosEntregadosCliente` (`@/lib/pedidos-admin-cliente`, existente, ya usada por la Task 4), `PedidoCardMobile` con `onAvanzar` opcional (Task 3).
- Produces: nada nuevo — `PedidosAdminMobile` pasa de mostrar solo activos a tener el mismo toggle Activos/Historial que escritorio.

- [ ] **Step 1: Reescribir el componente**

Modify `src/components/admin/PedidosAdminMobile.tsx` — reemplazar todo el archivo por:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { PedidoConItems } from "@/lib/pedidos-mapeo";
import { obtenerPedidosEntregadosCliente } from "@/lib/pedidos-admin-cliente";
import { usePedidosActivos } from "@/lib/usePedidosActivos";
import { agruparHistorial } from "@/lib/historial-mapeo";
import { PedidoCardMobile } from "./PedidoCardMobile";
import { BannerNotificaciones } from "./BannerNotificaciones";
import { HistorialAgrupado } from "./HistorialAgrupado";

type Vista = "activos" | "historial";

export function PedidosAdminMobile({ pedidosIniciales }: { pedidosIniciales: PedidoConItems[] }) {
  const [vista, setVista] = useState<Vista>("activos");
  const { pedidos: activos, avanzar } = usePedidosActivos(pedidosIniciales, vista === "activos");
  const [historial, setHistorial] = useState<PedidoConItems[]>([]);

  useEffect(() => {
    if (vista === "historial") {
      obtenerPedidosEntregadosCliente().then(setHistorial);
    }
  }, [vista]);

  return (
    <div className="flex flex-col gap-3">
      <BannerNotificaciones />

      <div className="flex gap-2">
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

      {vista === "activos" ? (
        activos.length === 0 ? (
          <p className="text-sm text-brand-black/60">No hay pedidos activos.</p>
        ) : (
          activos.map((pedido) => (
            <PedidoCardMobile key={pedido.id} pedido={pedido} onAvanzar={() => avanzar(pedido)} />
          ))
        )
      ) : historial.length === 0 ? (
        <p className="text-sm text-brand-black/60">Todavía no hay pedidos entregados.</p>
      ) : (
        <HistorialAgrupado
          grupos={agruparHistorial(historial)}
          renderPedido={(pedido) => <PedidoCardMobile key={pedido.id} pedido={pedido} />}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Correr tipos y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/PedidosAdminMobile.tsx
git commit -m "feat: sumar Historial agrupado (con toggle) a la vista mobile"
```

---

### Task 6: Verificación end-to-end en el navegador

**Files:**
- Ninguno (solo verificación manual).

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: confirmación de que el Historial agrupado funciona de punta a punta en escritorio y mobile, contra datos reales.

- [ ] **Step 1: Correr toda la suite y el build**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: todo en verde, build exitoso.

- [ ] **Step 2: Crear pedidos de prueba en distintas fechas**

Run (desde `~/Percy Burger`, con `.env.local` cargado):

```bash
set -a; source .env.local; set +a

HOY=$(date +"%Y-%m-%dT12:00:00%z")
SEIS_DIAS=$(date -v-6d +"%Y-%m-%dT12:00:00%z")
OCHO_DIAS=$(date -v-8d +"%Y-%m-%dT12:00:00%z")

for par in "Test Hoy:5000:$HOY" "Test Seis Dias:3000:$SEIS_DIAS" "Test Ocho Dias:4000:$OCHO_DIAS"; do
  nombre="${par%%:*}"; resto="${par#*:}"; monto="${resto%%:*}"; fecha="${resto#*:}"
  curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/pedidos" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" \
    -d "{\"cliente_nombre\":\"$nombre\",\"cliente_telefono\":\"0000000000\",\"modalidad\":\"retiro\",\"subtotal\":$monto,\"total\":$monto,\"estado\":\"entregado\",\"creado_en\":\"$fecha\"}"
  echo
done
```

Expected: tres respuestas `200`, cada una con el pedido creado (`cliente_nombre` empezando con `"Test "`, `estado: "entregado"`).

- [ ] **Step 3: Verificar en escritorio**

Con `npm run dev` corriendo, abrir `/admin/pedidos` logueado, tocar "Historial" y confirmar: aparecen los tres pedidos de prueba repartidos en (al menos) dos grupos — uno de día para "Test Hoy" y "Test Seis Dias" (mismo grupo o distintos, según en qué fecha calendario cayó cada uno) y uno de semana para "Test Ocho Dias" —, cada grupo con su total correcto, y las tarjetas sin botón "Siguiente" (son pedidos entregados).

- [ ] **Step 4: Verificar en mobile**

Con el navegador angosto (o un celular real), abrir `/admin/pedidos`, confirmar que ahora aparece el toggle "Activos / Historial", y que tocando "Historial" se ve el mismo agrupado con `PedidoCardMobile`.

- [ ] **Step 5: Limpiar los datos de prueba**

Run:

```bash
set -a; source .env.local; set +a
curl -s -X DELETE "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/pedidos?cliente_nombre=like.Test*" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected: los tres pedidos de prueba borrados (confirmar con un `GET` a la misma URL con el mismo filtro, debe devolver `[]`).

- [ ] **Step 6: Push**

```bash
git push origin main
```
