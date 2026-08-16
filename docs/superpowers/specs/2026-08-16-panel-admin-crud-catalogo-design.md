# Panel de administración — CRUD de productos y combos (sub-proyecto 2)

## Contexto

El panel `/admin` (sub-proyecto 1, ya en producción) tiene login protegido y lee productos/combos desde Supabase, pero hoy es **solo lectura**. Este sub-proyecto agrega crear, editar y borrar productos y combos, siguiendo el orden de sub-proyectos ya planteado para el panel completo (CRUD → gestión de pedidos → zonas de envío → Mercado Pago → imágenes por IA → reportes).

Vista desktop únicamente. La vista mobile minimalista definida en el vault (`Panel de administración.md`) es para gestión de pedidos, un sub-proyecto posterior — no aplica a este CRUD de catálogo.

## Arquitectura

Mutaciones **client-side con `supabase-js`**, mismo patrón ya validado en el login/logout del sub-proyecto 1: el componente Client llama directo a `supabase.from("productos").insert/update/delete(...)`, protegido por políticas RLS (lectura pública, escritura solo para el usuario autenticado). Sin Server Actions ni API routes propias — se mantiene la convención ya establecida de que el proyecto es 100% client-side para las mutaciones de datos.

`page.tsx` sigue siendo un Server Component (protegido por `src/proxy.ts`, ya existente) que obtiene los datos iniciales (`obtenerProductos`/`obtenerCombos`, extendido a incluir `combo_productos`) y los pasa a un Client Component que maneja estado local y mutaciones — mismo patrón que `CartContext` en el sitio público.

## Modelo de datos

Tabla nueva `combo_productos` (relación estructurada combo↔producto, reemplaza la descripción de texto libre suelta):

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
```

`on delete restrict` en `producto_id` es la implementación real de "bloquear el borrado de un producto usado en un combo": Postgres rechaza el `delete` mientras exista la referencia. El panel hace una consulta previa (`select combo_id from combo_productos where producto_id = ...`) antes de intentar borrar, para mostrar un mensaje claro con el nombre de los combos afectados en vez de propagar el error crudo de Postgres.

`Combo.descripcion` (campo de texto libre existente) se mantiene como campo editable aparte — sigue siendo útil para aclaraciones que no son parte de la lista estructurada de productos (ej. "servido con papas grandes").

Bucket de Supabase Storage `catalogo` (nuevo, lectura pública / escritura autenticada, misma lógica de RLS que las tablas):

```sql
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

Al subir una foto se guarda en `catalogo/<tipo>/<id>-<timestamp>.<ext>` (tipo = `productos` o `combos`) y la URL pública resultante se persiste en `imagen_url`. Convive con el placeholder de marca (`ImagenProducto.tsx`) para ítems sin foto propia todavía — sin cambios en ese componente.

Como en este proyecto las tablas/políticas se crean a mano en el SQL Editor de Supabase (no versionado en el repo — así se hizo con `productos`/`combos` en el sub-proyecto 1), estos scripts van documentados acá para que Nicolás los corra manualmente antes de la implementación, igual que la vez pasada. Son idempotentes (`if not exists`, `drop policy if exists`) por si hace falta re-ejecutarlos.

## Tipos y mapeo

`src/data/types.ts` — `Combo` gana una lista de ítems:

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
  productos: ComboItem[]; // nuevo
}
```

`src/lib/catalogo.ts` extiende `obtenerCombos` para traer `combo_productos` (join) y `mapRowACombo` para incluir `productos`. Se agregan funciones de mutación (`crearProducto`, `actualizarProducto`, `borrarProducto`, `crearCombo`, `actualizarCombo`, `borrarCombo`, `subirImagen`) en el mismo archivo o uno nuevo `src/lib/catalogo-admin.ts` si `catalogo.ts` crece demasiado — a decidir en el plan según tamaño real.

## Componentes y flujo de UI

- `/admin` (`src/app/admin/page.tsx`) pasa a tener dos secciones con su propia lista: **Productos** y **Combos**, cada una con botón "Nuevo" y, por ítem, "Editar"/"Borrar".
- `AdminModal.tsx` (nuevo, patrón similar al `CartDrawer.tsx` ya existente): modal reusable que hospeda el formulario activo.
- `ProductoForm.tsx` (nuevo): nombre, categoría (select: clásica/especial/extra/bebida), ingredientes, precios por tamaño (simple obligatorio; doble/triple opcionales), input de imagen (subida de archivo).
- `ComboForm.tsx` (nuevo): nombre, descripción, precio, selector de productos + cantidad (agregar/quitar filas, sobre el catálogo ya cargado), toggle activo/inactivo, input de imagen.
- Borrar dispara `window.confirm` (sin modal separado) salvo cuando el producto está referenciado en algún combo: en ese caso se muestra un aviso bloqueante (no un confirm) listando los combos afectados y no se ejecuta el borrado hasta que se lo saque de esos combos primero.

## Validación y manejo de errores

- Validación de formulario antes de enviar: nombre y precio simple obligatorios, precio > 0, imagen con tipo (jpg/png/webp) y tamaño (< 5MB) aceptados — validación simple a mano, sin librería nueva.
- Errores de Supabase (red, RLS, restricción `on delete restrict` si algo se cuela) se muestran como mensaje inline en el modal, mismo estilo que las páginas de login/recuperación de contraseña existentes.

## Testing

- Unit tests (Vitest, ya usado para `cart.ts`/`whatsapp.ts`): mapeo de filas ↔ tipos extendido a `combo_productos`, validación de formulario, y el cálculo de "qué combos referencian este producto" para el aviso de borrado bloqueado.
- Verificación manual en navegador (dev server + Chrome) de las mutaciones reales contra Supabase: crear/editar/borrar producto y combo, subir imagen, e intentar borrar un producto usado en un combo (debe bloquear con el mensaje correcto). No hay infraestructura de test de integración con Supabase real en este proyecto todavía, igual que en el sub-proyecto anterior.

## Fuera de alcance (queda para sub-proyectos posteriores)

- Vista mobile minimalista del panel.
- Gestión de pedidos, zonas de envío, configuración de Mercado Pago, generación de imágenes por IA, reportes de ventas, aviso de inactividad de la base de datos.
