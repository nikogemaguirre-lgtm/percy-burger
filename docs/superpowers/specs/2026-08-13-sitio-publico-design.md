# Percy Burger — Sitio público (catálogo + carrito + checkout WhatsApp)

Fecha: 2026-08-13
Estado: aprobado

## Contexto

Percy Burger es una hamburguesería (Falucho 440, Dorrego, Guaymallén, Mendoza) que necesita una web de pedidos. El proyecto completo incluye sitio público, panel de administración con login, Mercado Pago, generación de imágenes por IA y reportes de ventas — demasiado grande para un solo módulo. Este spec cubre únicamente el primer módulo: **el sitio público**, la parte de mayor valor y menos bloqueada por pendientes (no depende de login, base de datos ni credenciales de pago).

Contexto completo del proyecto en el vault de Obsidian `~/Obsidian/Percy Burger/` (ver especialmente `Menú y precios.md`, `Pago y entrega.md`, `Arquitectura técnica.md`, `Panel de administración.md`).

## Alcance

**Incluye:**
- Landing con catálogo de productos (categorías: Clásicas, Especiales, Extras, Bebidas) y sección de Promos/Combos.
- Carrito de compra (agregar, editar cantidad, quitar).
- Checkout: datos de contacto, delivery (con selección de zona de envío) o retiro en el local, forma de pago fija en "pagar al recibir".
- Generación del link `wa.me` con el pedido pre-armado para que el cliente lo envíe a Percy.

**Explícitamente fuera de alcance** (módulos posteriores):
- Login y panel de administración de Percy.
- Integración de Mercado Pago (pago online) — el checkout solo ofrece "pagar al recibir" en este módulo.
- Generación de imágenes por IA para productos.
- Reportes de ventas.
- Persistencia en base de datos real (Supabase) — se usan datos locales tipados.
- Hero animado de la landing (opción A/B sin decidir con Percy todavía) — landing simple sin animación por ahora.
- Páginas legales (Términos y condiciones / Política de privacidad) — módulo de contenido estático aparte.

## Stack

- **Next.js (App Router) + TypeScript**, desplegado en **Vercel** (plan Hobby, ya decidido para el proyecto completo).
- **Tailwind CSS** para estilos.
- **Estado del carrito:** React Context + `localStorage` (persiste entre refrescos sin necesitar backend); si `localStorage` no está disponible, degrada a memoria en sesión sin romper la app.
- **Sin base de datos:** menú, combos y zonas de envío viven en archivos de datos TypeScript tipados, con la misma forma que tendrán luego las tablas de Supabase — migrar a DB más adelante es cambiar el origen del dato, no cómo se consume.

## Modelo de datos

```ts
type Tamaño = "simple" | "doble" | "triple";

interface Producto {
  id: string;
  categoria: "clasica" | "especial" | "extra" | "bebida";
  nombre: string;
  ingredientes: string;
  precios: Record<Tamaño, number>; // extras/bebidas usan un único precio bajo "simple"
  imagenUrl: string;
}

interface Combo {
  id: string;
  nombre: string;
  productosIds: string[];
  precio: number;
  imagenUrl: string;
  activo: boolean;
}

interface Zona {
  id: string;
  nombre: string;
  costoEnvio: number;
}
```

Menú y combos: datos **reales**, ya extraídos del vault (`Menú y precios.md`) — no productos de ejemplo genéricos, porque el menú real ya está confirmado.

Zonas de envío: datos de **ejemplo** (p. ej. "Dorrego $800", "Guaymallén centro $1000"), porque el listado real de zonas de Percy sigue pendiente (ver `Pendientes.md` del vault) — estructurados para que reemplazarlos después sea trivial.

## Estructura de carpetas

```
src/
  app/
    page.tsx                 → landing + catálogo
    carrito/page.tsx         → resumen del carrito
    checkout/page.tsx        → datos, delivery/retiro, zona, confirmación
    layout.tsx, globals.css
  components/
    ProductoCard.tsx, ComboCard.tsx, CartDrawer.tsx, ZonaSelect.tsx, ...
  context/
    CartContext.tsx          → estado global del carrito (Context + localStorage)
  data/
    menu.ts, combos.ts, zonas.ts, types.ts
  lib/
    whatsapp.ts               → arma el texto del pedido y la URL wa.me
```

## Flujo de páginas

**Landing / catálogo (`/`):** header con logo y paleta de marca (ver `Identidad visual.md` del vault), productos agrupados por categoría, sección de Promos/Combos. Cada `ProductoCard` permite elegir tamaño y agregar al carrito. `CartDrawer` fijo muestra cantidad de ítems y total.

**Carrito (`/carrito`):** lista editable (cambiar cantidad, quitar ítem), subtotal, botón "Continuar" hacia checkout. Estado vacío con link al catálogo si no hay ítems.

**Checkout (`/checkout`):**
1. Datos de contacto: nombre, teléfono.
2. Modalidad: **Delivery** (dirección + selector de zona — el costo de envío se suma al total; si la dirección no matchea ninguna zona, queda "a coordinar por WhatsApp" sin bloquear el pedido) o **Retiro en el local** (sin dirección, sin costo de envío).
3. Forma de pago: fija en "Pagar al recibir" (efectivo o transferencia coordinada), sin selector — Mercado Pago no está integrado en este módulo.
4. Confirmar: arma el texto del pedido (ítems, tamaños, subtotal, envío, total, datos de contacto/dirección) vía `lib/whatsapp.ts` y redirige a `wa.me/5492616968888?text=...`. El carrito se vacía al confirmar.

## Manejo de errores

- Validación de formulario en el cliente: nombre y teléfono requeridos, zona seleccionada o "a coordinar" explícito antes de confirmar.
- Si `localStorage` no está disponible, el carrito sigue funcionando en memoria durante la sesión.

## Testing

- Tests unitarios para `lib/whatsapp.ts` (formato del texto del pedido y de la URL generada).
- Tests unitarios para el cálculo de totales del `CartContext` (subtotal, suma de envío, edición de cantidades).
- Sin tests end-to-end en este módulo — fuera de alcance.

## Deploy

`create-next-app` (TypeScript, Tailwind, App Router, ESLint), repo conectado a Vercel para deploy automático en cada push a `main` (plan Hobby). Sin variables de entorno necesarias en este módulo.
