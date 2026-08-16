# Percy Burger — Sección de reseñas de clientes

Fecha: 2026-08-16
Estado: aprobado

## Contexto

El sitio público de Percy Burger está en producción (`https://percy-burger.vercel.app/`) con catálogo, carrito, checkout, hero animado y sección de ubicación ya implementados. Uno de los pendientes que había quedado documentado en `Reseñas de clientes.md` del vault era mostrar prueba social de clientes reales en la web.

Instagram (@persiburger) no sirve como fuente porque el feed tiene 0 publicaciones con comentarios. Google Maps sí: la ficha "PERSI BURGER" tiene 4.9★ sobre 79 opiniones reales, de las cuales se seleccionaron 7 testimonios en `Reseñas de clientes.md` (Karen Soria, Ayelen Yanquez, Matías Fontemachi, Camila Bianchi, Christian Rosso, Milagros Persia, Romina Indovino).

Esa nota dejaba tres preguntas sin resolver, ya cerradas en esta sesión de brainstorming:
- **Fuente:** reseñas estáticas curadas a mano (no integración en vivo con la API de Google Places — evita costo y complejidad para un sitio que hoy no tiene backend).
- **Privacidad:** nombre de pila + inicial del apellido (ej. "Karen S."), no el apellido completo tal como aparece en Google.
- **Confirmación con Percy:** todavía no se confirmó con Percy si tiene objeción a usar estas reseñas públicas en su web. Se avanza igual con la implementación; queda como pendiente confirmarlo con él antes de que esto se considere definitivo en producción (ver sección Pendientes más abajo).

## Alcance

**Incluye:**
- Tipo `Reseña` en `src/data/types.ts`.
- Archivo de datos `src/data/resenas.ts` con las 7 reseñas curadas, siguiendo el mismo patrón que `combos.ts`/`menu.ts`.
- Componente `src/components/Resenas.tsx`: Server Component (sin `"use client"`, no hay estado ni interactividad), con:
  - Encabezado "Lo que dicen nuestros clientes".
  - Badge de rating agregado: "4.9★ · +79 reseñas en Google", con link a `https://www.google.com/maps/search/Percy+Burger+Falucho+440+Guaymallén+Mendoza` (`target="_blank"`, `rel="noopener noreferrer"`).
  - Grilla de tarjetas con las 7 reseñas (3 columnas en desktop, 1 en mobile), mismo patrón de grilla que ya usan las secciones de categorías del catálogo.
- Inserción de `<Resenas />` en `src/app/page.tsx`, entre el cierre de `<main>` (catálogo) y `<Ubicacion />`.

**Explícitamente fuera de alcance:**
- Integración en vivo con Google Places API (fase futura si algún día se justifica el costo/complejidad).
- Fotos de perfil de quien reseña (Google no las expone vía navegación manual, y no se van a inventar avatares).
- Cualquier cambio al catálogo, carrito, checkout o panel de administración — no relacionado con este spec.

## Datos

`src/data/types.ts` suma:

```ts
export interface Reseña {
  id: string;
  autor: string;       // "Karen S."
  texto: string;
  antiguedad: string;  // "hace 3 semanas"
}
```

`src/data/resenas.ts` exporta `export const resenas: Reseña[]` con las 7 entradas, texto tomado tal cual de `Reseñas de clientes.md` del vault (recortando comillas de apertura/cierre), autor reducido a nombre de pila + inicial:

- Karen S. — "hace 3 semanas"
- Ayelen Y. — "hace 3 meses"
- Matías F. — "hace 10 meses"
- Camila B. — "hace 5 meses"
- Christian R. — "hace 6 meses"
- Milagros P. — "hace 10 meses"
- Romina I. — "hace 8 meses"

## Componente `Resenas.tsx`

- Estructura de sección igual a las secciones del catálogo en `page.tsx` (`<section className="mb-10">`, `<h2 className="mb-4 text-2xl font-bold text-brand-black">`).
- Badge de rating: texto corto con la estrella y el conteo, como link (`<a>`) con estilo discreto (subrayado o color `brand-orange-burnt`), no un botón grande — es secundario respecto a las tarjetas.
- Cada tarjeta reutiliza el estilo visual ya establecido por `ProductoCard`/`ComboCard`: `rounded-lg border border-brand-black/10 bg-white p-4 shadow-sm`. Contenido: nombre del autor en negrita, texto de la reseña, antigüedad en gris chico debajo.
- Grilla: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`, igual que el resto de las grillas de `page.tsx`.

## Ubicación en la página

En `src/app/page.tsx`, `<Resenas />` se importa y se renderiza justo después del `</main>` que cierra el catálogo, y antes de `<Ubicacion />`. Orden final de la landing: Hero → catálogo (promos + categorías) → Reseñas → Ubicación.

## Pendientes fuera de este spec

- Confirmar con Percy si tiene objeción a que estas reseñas de clientes reales (con nombre, aunque abreviado) se publiquen en su web — anotar en `Pendientes.md` del vault al cerrar esta sesión.
- Si algún día cambia el volumen/calidad de reseñas en Google, esta lista se actualiza a mano en `src/data/resenas.ts` (no hay sincronización automática).

## Testing

- Verificación visual manual en el navegador (desktop y mobile de las devtools), igual que el resto de las secciones de la landing.
- Sin lógica de negocio nueva (no hay estado, cálculos ni validación) — no se agregan tests automatizados nuevos, consistente con el criterio ya usado para `Hero.tsx`/`Ubicacion.tsx`.
