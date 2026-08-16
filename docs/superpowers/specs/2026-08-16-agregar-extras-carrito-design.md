# Percy Burger — Agregar extras desde el carrito

Fecha: 2026-08-16
Estado: aprobado

## Contexto

La página `/carrito` (`src/app/carrito/page.tsx`) hoy solo muestra los ítems ya agregados, permite cambiar cantidades o quitarlos, y termina en un botón "Continuar" hacia `/checkout`. Para sumar cualquier otro producto (una papa, una salsa, una bebida) el cliente tiene que volver a la página principal y buscarlo entre todas las categorías del menú.

Nicolás pidió que desde el carrito se puedan agregar "condimentos" — en la práctica, productos que ya existen en el catálogo bajo las categorías `"extra"` (Papas, Dip Salsa Smash, Dip Salsa Tasty) y `"bebida"` (Gaseosa 500ml) — sin tener que volver al menú principal. No se trata de un sistema nuevo de modificadores por producto (no hay que elegir "con extra salsa" al agregar una hamburguesa puntual): son productos sueltos, ya existentes, que hoy solo se pueden agregar desde `/`.

## Alcance

**Incluye:**
- Sección nueva en `src/app/carrito/page.tsx`, entre la lista de ítems del carrito y el resumen de subtotal: "¿Querés agregar algo más?", con los productos de categoría `"extra"` y `"bebida"` de `src/data/menu.ts`.
- Reutilización directa del componente `ProductoCard` ya existente (`src/components/ProductoCard.tsx`) — mismo componente que usa la página principal, con imagen/placeholder, selector de tamaño (no aplica a estos 4 productos, que solo tienen precio `simple`) y botón "Agregar" ya conectado a `useCart()`.
- Grilla `grid-cols-1 sm:grid-cols-2` (la página de carrito es `max-w-2xl`, más angosta que el `max-w-5xl` del menú principal, por eso 2 columnas en vez de 3).

**Explícitamente fuera de alcance:**
- Cualquier sistema de modificadores/personalización por producto (ej. "agregar salsa extra" ligado a una hamburguesa específica). Los productos se agregan como ítems sueltos, igual que desde el menú principal.
- Cambios a `CartContext`, `src/lib/cart.ts` o al armado del mensaje de WhatsApp en `src/lib/whatsapp.ts` — no hacen falta, porque agregar un producto desde acá usa exactamente la misma función `agregar()` del contexto que ya usa `ProductoCard`, con la misma lógica de merge por id/cantidad ya probada en `cart.test.ts`.
- Cambios a la página principal (`/`) o a las categorías que ya se muestran ahí.

## Componente y datos

No se crean archivos de datos nuevos. En `src/app/carrito/page.tsx` se filtra el array ya existente `productos` (importado de `@/data/menu`):

```ts
const productosExtra = productos.filter((p) => p.categoria === "extra" || p.categoria === "bebida");
```

Y se renderiza con el mismo patrón de grilla que ya usa `src/app/page.tsx` para sus categorías, pero en 2 columnas:

```tsx
<section className="mb-6">
  <h2 className="mb-3 text-lg font-semibold text-brand-black">¿Querés agregar algo más?</h2>
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {productosExtra.map((producto) => (
      <ProductoCard key={producto.id} producto={producto} />
    ))}
  </div>
</section>
```

Se ubica después del `<ul>` de ítems del carrito y antes del bloque de subtotal, dentro del mismo `<main className="mx-auto max-w-2xl px-4 py-8">` que ya tiene la página.

## Comportamiento

- Al tocar "Agregar" en cualquiera de estas tarjetas, el producto se suma al carrito (o incrementa su cantidad si ya estaba) exactamente igual que desde la página principal — la página `/carrito` re-renderiza mostrando el nuevo ítem en la lista de arriba, porque `items` viene del mismo `CartContext` reactivo.
- Si el carrito está vacío, la página ya muestra un estado alternativo ("Todavía no agregaste nada al carrito", con link a "Ver el menú") y no llega a renderizar la lista de ítems ni esta sección nueva — se mantiene ese comportamiento sin cambios.

## Testing

- Verificación visual manual en el navegador: agregar una hamburguesa desde `/`, ir a `/carrito`, confirmar que aparece la sección "¿Querés agregar algo más?" con los 4 productos, agregar una Papa y una Gaseosa desde ahí, y confirmar que se suman a la lista de arriba y al subtotal.
- Sin tests automatizados nuevos — no hay lógica nueva que testear, `ProductoCard` y `cart.ts` ya tienen su cobertura existente y no se modifican.
