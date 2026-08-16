# Sección de reseñas de clientes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una sección de reseñas de clientes reales (curadas de Google Maps) a la landing pública de Percy Burger, entre el catálogo y la sección de ubicación.

**Architecture:** Datos estáticos tipados (`src/data/resenas.ts`, mismo patrón que `combos.ts`) consumidos por un Server Component de presentación (`src/components/Resenas.tsx`, sin `"use client"`, sin estado), insertado en `src/app/page.tsx`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.

## Global Constraints

- Nombres de autor como nombre de pila + inicial del apellido (ej. "Karen S."), nunca apellido completo — decisión de privacidad de la spec.
- Fuente de datos 100% estática, sin llamadas a API externa (Google Places u otra) — decisión de la spec, evita costo/complejidad de backend.
- Estilo visual de tarjeta debe reutilizar las clases ya usadas por `ProductoCard`/`ComboCard`: `rounded-lg border border-brand-black/10 bg-white p-4 shadow-sm`.
- Grilla responsive: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`, igual que el resto de `page.tsx`.
- Sin tests automatizados nuevos (consistente con `Hero.tsx`/`Ubicacion.tsx`, componentes puramente visuales sin lógica de negocio) — verificación manual en navegador.
- Link al badge de rating: `https://www.google.com/maps/search/Percy+Burger+Falucho+440+Guaymallén+Mendoza`, con `target="_blank"` y `rel="noopener noreferrer"`.

---

### Task 1: Tipo y datos de reseñas

**Files:**
- Modify: `src/data/types.ts`
- Create: `src/data/resenas.ts`

**Interfaces:**
- Produces: `interface Reseña { id: string; autor: string; texto: string; antiguedad: string }` en `src/data/types.ts`; `export const resenas: Reseña[]` en `src/data/resenas.ts` con 7 entradas.

- [ ] **Step 1: Agregar el tipo `Reseña` a `src/data/types.ts`**

Agregar al final del archivo:

```ts
export interface Reseña {
  id: string;
  autor: string;
  texto: string;
  antiguedad: string;
}
```

- [ ] **Step 2: Crear `src/data/resenas.ts` con las 7 reseñas curadas**

```ts
import { Reseña } from "./types";

export const resenas: Reseña[] = [
  {
    id: "karen-s",
    autor: "Karen S.",
    texto:
      "Riquísimas las hamburguesas! Las papas excelentes todo 10/10. Somos de cba capital encontramos esta hamburgueseria por este mismo medio y quedamos encantados. Si volvemos pediremos acá siempre 💛",
    antiguedad: "hace 3 semanas",
  },
  {
    id: "ayelen-y",
    autor: "Ayelen Y.",
    texto:
      "Muy ricas, las papas son iguales a las de mc, las salsas riquísimas, y la burga es un poco 'chica' de tamaño pero son riquísimas.",
    antiguedad: "hace 3 meses",
  },
  {
    id: "matias-f",
    autor: "Matías F.",
    texto:
      "Fui el tercer día después de la apertura y la verdad me sorprende la calidad que se puede manejar cuando una empresa quiere ser profesional, los precios excelentes, buena cantidad de papas, las hamburguesas son grandes y el personal súper atento.",
    antiguedad: "hace 10 meses",
  },
  {
    id: "camila-b",
    autor: "Camila B.",
    texto:
      "Persi Burguer se convirtió en uno de mis lugares favoritos. Las hamburguesas nunca fallan: sabor increíble, bien cargadas, el servicio es excelente, súper atentos y rápidos.",
    antiguedad: "hace 5 meses",
  },
  {
    id: "christian-r",
    autor: "Christian R.",
    texto:
      "Las hamburguesas son riquísimas, el servicio es rápido y la atención de los pibes es 10 ptos.",
    antiguedad: "hace 6 meses",
  },
  {
    id: "milagros-p",
    autor: "Milagros P.",
    texto:
      "Las mejores burgers que he probado, LEJOS! Todo es de excelente calidad (incluso el precio) y las instalaciones están siempre impecables.",
    antiguedad: "hace 10 meses",
  },
  {
    id: "romina-i",
    autor: "Romina I.",
    texto:
      "Vengo seguido acá. La comida es de calidad y llenadora. Los chicos atienden muy bien son rápidos y eficientes. El ambiente es lindo, ponen música y tienen el local bien cuidado.",
    antiguedad: "hace 8 meses",
  },
];
```

- [ ] **Step 3: Verificar que el proyecto compila (typecheck)**

Run: `npx tsc --noEmit`
Expected: sin errores (exit code 0).

- [ ] **Step 4: Commit**

```bash
git add src/data/types.ts src/data/resenas.ts
git commit -m "feat: agregar datos de reseñas de clientes curadas de Google Maps"
```

---

### Task 2: Componente `Resenas.tsx` e integración en la landing

**Files:**
- Create: `src/components/Resenas.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `resenas` (`Reseña[]`) de `src/data/resenas.ts` (Task 1).
- Produces: `export function Resenas()` — componente sin props, renderiza la sección completa.

- [ ] **Step 1: Crear `src/components/Resenas.tsx`**

```tsx
import { resenas } from "@/data/resenas";

const LINK_GOOGLE_MAPS =
  "https://www.google.com/maps/search/Percy+Burger+Falucho+440+Guaymallén+Mendoza";

export function Resenas() {
  return (
    <section className="mx-auto mb-10 max-w-5xl px-4">
      <h2 className="mb-2 text-2xl font-bold text-brand-black">
        Lo que dicen nuestros clientes
      </h2>
      <a
        href={LINK_GOOGLE_MAPS}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 inline-block text-sm font-semibold text-brand-orange-burnt underline"
      >
        4.9★ · +79 reseñas en Google
      </a>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resenas.map((reseña) => (
          <div
            key={reseña.id}
            className="flex flex-col rounded-lg border border-brand-black/10 bg-white p-4 shadow-sm"
          >
            <p className="mb-2 font-semibold text-brand-black">{reseña.autor}</p>
            <p className="mb-3 flex-1 text-sm text-brand-black/70">{reseña.texto}</p>
            <p className="text-xs text-brand-black/50">{reseña.antiguedad}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Insertar `<Resenas />` en `src/app/page.tsx`**

En `src/app/page.tsx`, agregar el import junto a los demás:

```ts
import { Resenas } from "@/components/Resenas";
```

Y modificar el `return` para que quede:

```tsx
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
```

(Único cambio real: el import nuevo arriba, y `<Resenas />` insertado entre `</main>` y `<Ubicacion />`.)

- [ ] **Step 3: Levantar el sitio en desarrollo**

Run: `npm run dev`
Expected: servidor arriba en `http://localhost:3000` sin errores en consola.

- [ ] **Step 4: Verificar visualmente en el navegador**

Abrir `http://localhost:3000`, scrollear hasta después del catálogo y confirmar:
- La sección "Lo que dicen nuestros clientes" aparece antes de "Dónde estamos".
- El badge "4.9★ · +79 reseñas en Google" es un link que abre Google Maps en una pestaña nueva.
- Las 7 tarjetas se ven en grilla de 3 columnas en desktop.
- Cambiar a vista mobile en devtools y confirmar que la grilla pasa a 1 columna sin que el texto se corte.

- [ ] **Step 5: Typecheck y build final**

Run: `npx tsc --noEmit && npm run build`
Expected: ambos sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/components/Resenas.tsx src/app/page.tsx
git commit -m "feat: agregar sección de reseñas de clientes a la landing"
```

---

## Self-Review

**Spec coverage:** tipo `Reseña` (Task 1) ✓, datos de las 7 reseñas con nombre+inicial (Task 1) ✓, componente con badge de rating + link a Google Maps (Task 2) ✓, grilla de tarjetas con estilo consistente (Task 2) ✓, inserción entre catálogo y Ubicación (Task 2) ✓, sin tests automatizados nuevos, verificación manual (Task 2) ✓. Pendiente de confirmar con Percy queda fuera de este plan (es una acción de negocio, no de código) — anotar en el vault al cerrar la sesión.

**Placeholder scan:** sin TBD/TODO, todos los pasos tienen código completo.

**Type consistency:** `Reseña` (Task 1) usado igual en `resenas.ts` (Task 1) y consumido como `Reseña[]` implícito vía `resenas` en `Resenas.tsx` (Task 2) — consistente.
