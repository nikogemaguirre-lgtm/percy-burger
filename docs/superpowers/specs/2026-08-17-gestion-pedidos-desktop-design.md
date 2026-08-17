# Vista desktop de gestión de pedidos (sub-proyecto B — gestión de pedidos)

## Contexto

El sub-proyecto A ya dejó el checkout guardando cada pedido en Supabase (`pedidos`/`pedido_items`), pero **hoy no hay ninguna pantalla que los muestre** — Percy no tiene forma de ver un pedido salvo por el WhatsApp que le llega. Este sub-proyecto agrega esa pantalla, solo la versión desktop (la vista mobile minimalista es el sub-proyecto C, posterior).

## Arquitectura

Nueva ruta `/admin/pedidos` (Server Component, protegida por el `src/proxy.ts` ya existente — el matcher `/admin/:path*` ya la cubre sin cambios). Carga los pedidos activos iniciales en el servidor y los pasa a un Client Component que se suscribe a **Supabase Realtime** para reflejar pedidos nuevos y cambios de estado sin recargar la página — es el caso de uso real: la pantalla queda abierta en el local todo el día y los pedidos entran solos.

Habilitar Realtime en la tabla requiere un paso de SQL adicional (a correr a mano, como el resto de las tablas de este proyecto):

```sql
alter publication supabase_realtime add table pedidos;
```

Estructura de archivos:
- `src/app/admin/pedidos/page.tsx` — Server Component: verifica sesión (mismo patrón que `admin/page.tsx`), carga pedidos activos iniciales.
- `src/lib/pedidos-admin.ts` — lectura y mutación contra Supabase: `obtenerPedidosActivos()`, `obtenerPedidosEntregados()`, `avanzarEstadoPedido(id, estadoActual)`, más la función pura `siguienteEstado(estado)`.
- `src/components/admin/PedidosAdmin.tsx` — Client Component: mantiene el estado de la lista, arma la suscripción Realtime, maneja el toggle Activos/Historial.
- `src/components/admin/PedidoCard.tsx` — una tarjeta por pedido.

## Modelo de datos (lectura)

```ts
export type EstadoPedido = "nuevo" | "en_preparacion" | "listo" | "entregado";

export interface PedidoConItems {
  id: string;
  estado: EstadoPedido;
  clienteNombre: string;
  clienteTelefono: string;
  modalidad: "delivery" | "retiro";
  direccion: string | null;
  zonaNombre: string | null;
  aCoordinar: boolean;
  costoEnvio: number;
  subtotal: number;
  total: number;
  creadoEn: string;
  items: { nombre: string; precioUnitario: number; cantidad: number; nota: string | null }[];
}
```

`obtenerPedidosActivos()` trae los pedidos con `estado in ('nuevo','en_preparacion','listo')` ordenados por `creado_en` **ascendente** (el más viejo primero — es el que lleva más tiempo esperando). `obtenerPedidosEntregados()` trae `estado = 'entregado'` ordenados por `creado_en` **descendente** (más reciente primero, como cualquier historial). Ambas hacen el join con `pedido_items` igual que ya hace `obtenerCombos` con `combo_productos`.

## Estados y transición

Orden fijo: `nuevo → en_preparacion → listo → entregado`.

```ts
const ORDEN_ESTADOS: EstadoPedido[] = ["nuevo", "en_preparacion", "listo", "entregado"];

export function siguienteEstado(estado: EstadoPedido): EstadoPedido | null {
  const indice = ORDEN_ESTADOS.indexOf(estado);
  return indice === ORDEN_ESTADOS.length - 1 ? null : ORDEN_ESTADOS[indice + 1];
}
```

Función pura, sin dependencia de Supabase — testeable directo. `avanzarEstadoPedido(id, estadoActual)` calcula el siguiente estado con `siguienteEstado` y hace el `update` en Supabase; si `siguienteEstado` devuelve `null` (ya está en `entregado`), no se llama a nada (no debería ocurrir en la práctica, porque un pedido `entregado` ya no se muestra en Activos, pero la función queda protegida igual).

## UI

- Toggle **Activos / Historial** arriba de la lista. Activos es la vista por defecto al entrar.
- Cada `PedidoCard` muestra: nombre y teléfono del cliente; modalidad (dirección + zona si es delivery, "Retiro en el local" si no); lista de items con cantidad, nombre y nota si tiene; total; hora del pedido; una etiqueta de color por estado (mismo criterio visual que ya usa `combo.activo` en el panel); y, salvo en Historial, un botón **"Siguiente: <nombre del próximo estado>"** que llama a `avanzarEstadoPedido`.
- Si el `update` de estado falla, se muestra un mensaje inline en la tarjeta (mismo estilo `text-brand-red` que el resto del panel) y el estado visible no cambia hasta que la mutación confirme — no hay actualización optimista.
- El toggle a Historial dispara una carga aparte (`obtenerPedidosEntregados`) sin suscripción Realtime — el historial no necesita reflejar cambios en vivo.

## Testing

- Unit tests de `siguienteEstado` (los 4 casos: cada estado y su siguiente, más `entregado` devolviendo `null`).
- Unit tests de `obtenerPedidosActivos`/`obtenerPedidosEntregados`/`avanzarEstadoPedido` con Supabase mockeado, mismo patrón que `catalogo-admin.test.ts`.
- Verificación manual: completar un pedido real desde el checkout público, confirmar que aparece en Activos **sin recargar** la pantalla de `/admin/pedidos` (verifica que Realtime está andando), avanzarlo de estado con el botón hasta Entregado, confirmar que pasa a Historial y desaparece de Activos.

## Fuera de alcance (sub-proyecto C y posteriores)

- Vista mobile minimalista.
- Notificación push cuando entra un pedido nuevo.
- Cualquier filtro más allá de Activos/Historial (por fecha, por cliente, etc.).
