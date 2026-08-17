# Persistencia de pedidos (sub-proyecto A — gestión de pedidos)

## Contexto

El panel de administración tiene hoy CRUD de productos y combos, pero **la gestión de pedidos no puede empezar todavía**: el checkout del sitio público solo arma un mensaje de texto y redirige a `wa.me`, sin guardar nada en ninguna base de datos. No existe tabla `pedidos` en Supabase.

Este sub-proyecto es el primero de tres para completar "gestión de pedidos", en este orden:

- **A (este spec): persistencia** — tabla nueva + que el checkout la grabe.
- **B: vista desktop en `/admin`** — listar pedidos, cambiar su estado.
- **C: vista mobile minimalista** — pantalla aparte para el celular de Percy.

B y C no tienen sentido sin datos reales que gestionar, así que A va primero. Este spec cubre únicamente A.

## Modelo de datos

Dos tablas nuevas en Supabase (creadas a mano en el SQL Editor, siguiendo la convención ya usada en este proyecto para `productos`/`combos`/`combo_productos`):

```sql
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  estado text not null default 'nuevo' check (estado in ('nuevo','en_preparacion','listo','entregado')),
  cliente_nombre text not null,
  cliente_telefono text not null,
  modalidad text not null check (modalidad in ('delivery','retiro')),
  direccion text,
  zona_nombre text,
  a_coordinar boolean not null default false,
  costo_envio numeric not null default 0,
  subtotal numeric not null,
  total numeric not null,
  creado_en timestamptz not null default now()
);

alter table pedidos enable row level security;

drop policy if exists "pedidos inserción pública" on pedidos;
create policy "pedidos inserción pública" on pedidos
  for insert with check (true);

drop policy if exists "pedidos lectura autenticada" on pedidos;
create policy "pedidos lectura autenticada" on pedidos
  for select using (auth.role() = 'authenticated');

drop policy if exists "pedidos escritura autenticada" on pedidos;
create policy "pedidos escritura autenticada" on pedidos
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  nombre text not null,
  precio_unitario numeric not null,
  cantidad int not null check (cantidad > 0),
  nota text
);

alter table pedido_items enable row level security;

drop policy if exists "pedido_items inserción pública" on pedido_items;
create policy "pedido_items inserción pública" on pedido_items
  for insert with check (true);

drop policy if exists "pedido_items lectura autenticada" on pedido_items;
create policy "pedido_items lectura autenticada" on pedido_items
  for select using (auth.role() = 'authenticated');
```

A diferencia de `productos`/`combos`, acá `id` es `uuid` con `default gen_random_uuid()` — un pedido no necesita un id humano-legible como un slug, es un registro interno.

RLS de dos niveles distinto al del panel: **inserción pública** (el checkout no tiene login — cualquiera puede crear un pedido, nunca leerlos ni modificarlos) y **lectura/actualización solo para el usuario autenticado** (Percy, vía el panel — sub-proyecto B). No hay política de `delete` en ninguna tabla: ningún flujo de v1 la necesita.

`pedido_items` es un **snapshot** de lo que había en el carrito al momento de la compra (nombre, precio unitario, cantidad, nota) — sin referencia (`producto_id`/`combo_id`) al catálogo original, para no depender de que ese producto siga existiendo ni de que su precio no haya cambiado. Coincide en forma con `ItemCarrito` (`src/lib/cart.ts`), salvo que no persiste `id` ni `imagenUrl` (no hacen falta para gestionar el pedido).

## Cambios en el checkout

Nuevo archivo `src/lib/pedidos.ts`:

- `construirFilaPedido(items, subtotal, costoEnvio, datos)`: función **pura**, sin llamadas a Supabase, que arma los objetos a insertar (`{ pedido, items }`) a partir del carrito y los datos del formulario de checkout — misma forma de entrada que ya usa `construirTextoPedido` en `src/lib/whatsapp.ts`.
- `guardarPedido(items, subtotal, costoEnvio, datos): Promise<void>`: llama a `createSupabaseBrowserClient()`, inserta en `pedidos` y después en `pedido_items` usando el `id` del pedido recién creado. **Nunca lanza** — cualquier error (de red, de Supabase, lo que sea) se atrapa internamente y la función igual resuelve. Es la única función de mutación del proyecto con esta garantía; todas las del panel (`catalogo-admin.ts`) sí lanzan porque ahí un error debe bloquear el guardado y mostrarse al usuario — acá la prioridad es la opuesta: el pedido real por WhatsApp nunca se posterga por un problema de guardado interno.

`src/app/checkout/page.tsx` — `manejarConfirmar` pasa a ser `async`: llama a `await guardarPedido(...)` antes de `vaciar()` y el redirect a `wa.me`, sin ningún `try/catch` adicional (no hace falta, `guardarPedido` ya no lanza) y sin cambiar el resto del flujo visible para el cliente.

## Testing y verificación

- Test unitario de `construirFilaPedido` (Vitest, sin mocks): dado un carrito + datos de checkout, arma correctamente la fila de `pedidos` y el array de `pedido_items`, para los casos delivery con zona, delivery a coordinar, y retiro.
- Test de `guardarPedido` con `supabase-js` mockeado (mismo patrón que `catalogo-admin.test.ts`): confirma que inserta en el orden correcto (`pedidos` primero, `pedido_items` con el `id` devuelto), y que si Supabase devuelve error en cualquiera de los dos inserts, la función resuelve sin lanzar.
- Verificación manual: completar un pedido real de punta a punta en el checkout (navegador), y confirmar que quedó guardado corriendo una consulta puntual contra Supabase (mismo patrón de script temporal ya usado para verificar `combo_productos` y el bucket `catalogo` — se crea, se corre, se borra). Este sub-proyecto no tiene ninguna pantalla que lea `pedidos` todavía, así que no hay forma de verificarlo navegando el sitio.

## Fuera de alcance (sub-proyectos B y C)

- Cualquier pantalla que liste o muestre pedidos, en `/admin` o en la vista mobile.
- Cambiar el estado de un pedido.
- Notificación push al celular de Percy cuando entra un pedido nuevo.
