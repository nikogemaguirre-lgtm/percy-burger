# Historial agrupado por día/semana, con totales

## Contexto

`/admin/pedidos` ya tiene un toggle "Activos / Historial" en la vista de escritorio (`PedidosAdminDesktop`) que muestra todos los pedidos entregados en una lista plana, del más nuevo al más viejo, sin agrupar. A medida que se acumulan pedidos esa lista se va a volver larga y sin estructura. Además, la vista mobile (`PedidosAdminMobile`) hoy no tiene Historial — fue una decisión explícita del sub-proyecto anterior mantenerla minimalista, solo con pedidos activos.

Este trabajo agrega:
1. Agrupado del Historial por día (últimos 7 días corridos) y por semana calendario (todo lo más viejo que eso).
2. Un total de lo vendido (suma de `pedido.total`) al lado de cada grupo, día o semana.
3. El mismo Historial agrupado también en la vista mobile, con el mismo toggle que ya tiene escritorio.

## Arquitectura

Una función pura nueva hace todo el trabajo de agrupado sobre los datos que la app ya trae hoy (`obtenerPedidosEntregadosCliente()`, sin cambios) — no hay que tocar la consulta a Supabase ni agregar manejo de errores nuevo, es una capa de presentación.

- `src/lib/historial-mapeo.ts` — `agruparHistorial(pedidos, ahora?)` y el tipo `GrupoHistorial`.
- `src/components/admin/HistorialAgrupado.tsx` — Client Component chico y genérico: recibe los grupos ya armados y una función para dibujar cada pedido, así lo reusan tanto `PedidosAdminDesktop` (le pasa `PedidoCard`) como `PedidosAdminMobile` (le pasa `PedidoCardMobile`) sin duplicar el armado de encabezados.
- `PedidosAdminDesktop.tsx` — se modifica para agrupar antes de renderizar cuando `vista === "historial"`.
- `PedidosAdminMobile.tsx` — se modifica para sumar el toggle "Activos / Historial" (hoy no lo tiene) y usar `HistorialAgrupado` igual que escritorio.

## Modelo de datos

```ts
export type GrupoHistorial = {
  tipo: "dia" | "semana";
  etiqueta: string;   // "17 de agosto" | "11 al 17 de agosto" | "28 de julio al 3 de agosto"
  total: number;      // suma de pedido.total de ese grupo
  pedidos: PedidoConItems[];
};

export function agruparHistorial(pedidos: PedidoConItems[], ahora?: Date): GrupoHistorial[];
```

`ahora` es opcional (default `new Date()`), inyectable en los tests para que sean determinísticos.

## Reglas de agrupado

- **Últimos 7 días corridos** (hoy + los 6 anteriores — días 0 a 6 contando desde hoy, por fecha calendario, no por horas exactas): un grupo por día (`tipo: "dia"`), etiquetado con la fecha en formato largo (ej. "17 de agosto"). Sin casos especiales de "Hoy"/"Ayer" — se mantiene simple, solo la fecha.
- **7 días atrás o más** (a partir del primer día fuera de esa ventana de 7): se agrupan por **semana calendario, lunes a domingo** (`tipo: "semana"`), etiquetada con el rango de fechas: mismo mes → "11 al 17 de agosto"; cruza de mes → "28 de julio al 3 de agosto".
- El corte de "hoy" y los límites de día/semana usan el reloj y la zona horaria del propio navegador donde corre la vista (mismo criterio que ya usa el resto de la app, ej. `formatearHora` en `formato-pedido.ts`) — no hace falta manejo de zona horaria aparte, es un negocio de una sola ubicación.
- Cada grupo trae su `total` ya calculado: suma de `pedido.total` de todos los pedidos de ese grupo.
- Un pedido sin entregar (no debería llegar acá, pero por las dudas) no se contempla — `agruparHistorial` recibe siempre la lista ya filtrada a `estado === "entregado"`, como hoy.
- Orden: grupos del más reciente al más viejo (día de hoy primero si existe, semanas más nuevas antes que las viejas); dentro de cada grupo, pedidos del más nuevo al más viejo — mismo orden que ya devuelve `obtenerPedidosEntregadosCliente()`.
- Sin pedidos entregados: `agruparHistorial` devuelve `[]`; el mensaje "Todavía no hay pedidos entregados" que ya existe se sigue mostrando sin cambios.

## UI

`HistorialAgrupado` recibe `grupos: GrupoHistorial[]` y `renderPedido: (pedido: PedidoConItems) => ReactNode`. Por cada grupo dibuja un encabezado con la etiqueta y el total (ej. **"17 de agosto — $24.500"**) y debajo, siempre visible (sin acordeón / sin plegar), la lista de pedidos usando `renderPedido`.

En mobile se agrega el mismo toggle "Activos / Historial" que ya tiene `PedidosAdminDesktop`, arriba de la lista de `PedidosAdminMobile` — mismo estilo de botones, mismo comportamiento (cambiar de vista dispara la carga de `obtenerPedidosEntregadosCliente()` la primera vez que se entra a Historial).

## Testing

`src/lib/historial-mapeo.test.ts` (función pura, con `ahora` fijo para determinismo):

- Pedido de hoy → un grupo de día con la etiqueta de hoy.
- Pedido de exactamente 6 días atrás → todavía día suelto (último día de la ventana de 7).
- Pedido de exactamente 7 días atrás → ya cae en un grupo de semana (primer día fuera de la ventana), con el rango lunes-domingo correcto.
- Varios pedidos el mismo día → un solo grupo de día, `total` sumado correctamente.
- Una semana que cruza de mes → etiqueta con los dos nombres de mes.
- Orden de grupos (más nuevo primero) y de pedidos dentro de cada grupo (más nuevo primero).
- Lista vacía de pedidos → devuelve `[]`.

No hay tests nuevos de componentes React (`HistorialAgrupado`, los cambios en `PedidosAdminDesktop`/`PedidosAdminMobile`) — mismo criterio que el resto del proyecto: no hay infraestructura de testing de UI, se verifican a mano en el navegador (ver Global Constraints de planes anteriores).

## Fuera de alcance

- No se toca la consulta a Supabase de pedidos entregados (`obtenerPedidosEntregados`/`obtenerPedidosEntregadosCliente`) — sigue trayendo todo el historial sin paginar. Si el volumen de pedidos entregados crece mucho con el tiempo, paginar o limitar esa consulta queda como mejora futura, no parte de este trabajo.
- No hay "ganancia" real (venta menos costo) — el sistema no registra costos de insumos en ningún lado. El total mostrado es la suma de lo vendido (`pedido.total`), tal como lo pidió Nicolás.
- No se agregan reportes descargables ni exportación — eso ya está anotado aparte en `Pendientes.md` del vault como "Reportes de ventas", fuera de alcance de este trabajo puntual.
