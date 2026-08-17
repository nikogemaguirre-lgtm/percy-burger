# Vista mobile de gestión de pedidos + push (sub-proyecto C — gestión de pedidos)

## Contexto

El sub-proyecto B dejó `/admin/pedidos` con una vista desktop (toggle Activos/Historial, tarjetas con botón "Siguiente", polling de 15s). Falta la contraparte mobile: según [[Panel de administración]] del vault, no es un responsive comprimido de la desktop sino **una interfaz pensada aparte**, minimalista, con foco en "ver pedido nuevo, cambiar su estado". Este sub-proyecto agrega esa vista y, además, notificaciones push al celular de Percy cuando entra un pedido nuevo — el vault lo dejaba anotado como "a evaluar" y se decidió sumarlo ahora en el brainstorming de esta sesión.

## Arquitectura general

**Misma URL, detección por viewport.** `/admin/pedidos` sigue siendo la única entrada. Un hook nuevo `useEsMobil()` (basado en `matchMedia("(max-width: 767px)")`, alineado al breakpoint `md` de Tailwind que ya usa el resto del sitio) decide en runtime qué vista renderiza.

**Reorganización de componentes**, para no duplicar la lógica de polling entre las dos vistas:

- `src/lib/usePedidosActivos.ts` — hook nuevo: encapsula el polling de 15s de pedidos activos y `avanzarEstadoPedido` (refresco inmediato tras la mutación, igual que hoy). Hoy esa lógica vive mezclada dentro de `PedidosAdmin.tsx`.
- `src/components/admin/PedidosAdminDesktop.tsx` — la vista actual (toggle Activos/Historial + lista), migrada tal cual desde `PedidosAdmin.tsx`, usando el hook nuevo para la parte de Activos.
- `src/components/admin/PedidosAdminMobile.tsx` — vista nueva (ver sección siguiente).
- `src/components/admin/PedidosAdmin.tsx` — queda como selector: `useEsMobil() ? <PedidosAdminMobile /> : <PedidosAdminDesktop />`, recibiendo `pedidosIniciales` y pasándolo a la que corresponda.
- `src/lib/formato-pedido.ts` — nuevo: `formatearPrecio`/`formatearHora`, extraídas de `PedidoCard.tsx` (hoy privadas ahí) para reusarlas también en la tarjeta mobile sin duplicarlas.

**Layout de `/admin` sin header público.** Hoy `src/app/layout.tsx` (raíz) envuelve *todo* el sitio, incluido `/admin/*`, con `Header` y `CartDrawer` públicos. Se agrega `src/app/admin/layout.tsx` propio que no los incluye — deja `/admin/*` con su propio `<html>`/`<body>` minimal (mismas clases base `bg-white text-brand-black`). Afecta también a la vista desktop del panel (mejora prolija y acotada, no un rediseño); es requisito además para que la instalación como PWA (sección siguiente) abra directo al trabajo sin la interfaz de cliente encima.

## Vista mobile

- Sin toggle Activos/Historial — **solo pedidos activos**, mismo orden que desktop (más viejo primero). El historial se sigue consultando desde la vista desktop.
- Lista vertical con scroll simple (no "una tarjeta a la vez"), para que Percy vea de un vistazo todos los pedidos en danza.
- `PedidoCardMobile.tsx` — mismo contenido que `PedidoCard.tsx` (cliente, modalidad/dirección, ítems con nota, hora, total, etiqueta de estado, botón "Siguiente"), pero con tipografía y botón de avance más grandes, pensados para uso a una mano con el pulgar. Reusa `formatearPrecio`/`formatearHora` de `formato-pedido.ts` y el mismo mapa `COLOR_ESTADO`/`ETIQUETAS_ESTADO` de `pedidos-mapeo.ts`.
- Si no hay pedidos activos, mismo mensaje que ya usa la desktop ("No hay pedidos activos.").
- Banner de activación de notificaciones (ver Push) arriba de la lista, descartable, no bloqueante — la vista funciona igual sin él (fallback: polling de 15s).

## Instalación como PWA

- `public/manifest.json`: `name: "Percy Burger · Panel"`, `short_name: "Percy Admin"`, `start_url: "/admin/pedidos"`, `display: "standalone"`, `background_color`/`theme_color` en `brand-black` (`#161616`), íconos `192×192` y `512×512`.
- Íconos generados a partir de `public/logo/logo-completo.png` (fondo `brand-black`, logo centrado con margen) con un script puntual en `scripts/`, siguiendo el mismo criterio que `scripts/extraer-logo.py` — se genera una vez y el script no queda como dependencia de build.
- `public/sw.js`: service worker mínimo, **sin cacheo de assets** (no es objetivo funcionar offline, solo habilitar Push API). Escucha:
  - `push` → `self.registration.showNotification(data.title, { body: data.body, icon: "/logo/icono-192.png", data: { url: "/admin/pedidos" } })`.
  - `notificationclick` → cierra la notificación y enfoca/abre una ventana en `/admin/pedidos`.
- `src/app/admin/layout.tsx` agrega `<link rel="manifest" href="/manifest.json">` y registra el service worker (`navigator.serviceWorker.register("/sw.js")`) — solo dentro de `/admin`, no en el sitio público.

## Push — suscripción (cliente)

- Botón "Activar notificaciones" en el banner de la vista mobile. Al tocarlo: pide permiso (`Notification.requestPermission()`), y si se concede, `pushManager.subscribe()` con la clave pública VAPID, y guarda la suscripción resultante llamando a `POST /api/push/suscribir`.
- Caso iPhone/Safari sin modo standalone (`window.navigator.standalone === false` y `/iPhone|iPad/.test(navigator.userAgent)`): en vez del botón, el banner muestra "Para recibir avisos, agregá esta página a tu pantalla de inicio primero (compartir → Agregar a inicio)" — evita ofrecer una acción que en ese estado no puede funcionar (limitación real de iOS: push web solo funciona instalado como PWA en Safari).
- Si el permiso ya fue denegado antes, o el navegador no soporta `PushManager`, el banner no se muestra — la vista sigue funcionando con el polling de 15s como único mecanismo de actualización, nunca queda una vista rota por esto.

## Push — envío (servidor)

- Tabla nueva en Supabase, `push_subscriptions`:
  ```sql
  create table if not exists push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    creado_en timestamptz not null default now()
  );
  ```
  RLS: lectura/escritura solo autenticada (mismo patrón que `productos`/`combos`/`pedidos` en su parte administrada) — no hay necesidad de acceso público, la suscripción la crea el propio Percy logueado.
- `POST /api/push/suscribir` (route handler) — recibe `{ endpoint, keys: { p256dh, auth } }` del navegador, valida sesión de Supabase Auth (mismo patrón que el resto de `/admin`), hace upsert en `push_subscriptions` por `endpoint`.
- `POST /api/push/enviar` (route handler) — trae todas las filas de `push_subscriptions`, arma el payload (`{ title: "Pedido nuevo", body: "<nombre> — <total>", url: "/admin/pedidos" }`) a partir del `pedido_id` recibido en el body, y envía con el paquete `web-push` usando `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (variables de entorno nuevas en Vercel, generadas una vez con `npx web-push generate-vapid-keys`). Protegido por un header `x-webhook-secret` que debe matchear `PUSH_WEBHOOK_SECRET` (variable de entorno nueva) — no usa sesión de usuario porque quien llama es Supabase, no un navegador logueado.
  - Suscripciones que devuelven `410`/`404` al enviar (dispositivo desinstaló la PWA o revocó el permiso) se borran de `push_subscriptions` en la misma request, para no acumular reintentos inútiles.
- **Disparo:** Database Webhook de Supabase (Settings → Database → Webhooks) en `insert` sobre `pedidos`, apuntando a `POST https://percy-burger.vercel.app/api/push/enviar` con el header `x-webhook-secret` configurado en el propio webhook. Totalmente desacoplado de `guardarPedido()` y del checkout público: si el push falla o Supabase tarda en llamarlo, el pedido real por WhatsApp ya salió antes, sin depender de esto.

## Fuera de alcance

- Toggle de Historial en la vista mobile (se sigue consultando desde desktop).
- Cacheo offline / funcionamiento sin conexión (el service worker es solo para push).
- Reemplazar el polling de la vista desktop por Realtime (ver nota del sub-proyecto B).
- Gestión de zonas de envío, Mercado Pago, imágenes por IA, reportes de ventas (resto de sub-proyectos pendientes del panel, sin orden decidido todavía).

## Testing

- Unit tests de `formato-pedido.ts` (extracción sin cambio de comportamiento — mismos casos que hoy cubre implícitamente `PedidoCard`).
- Unit tests de `useEsMobil` (mock de `matchMedia`, dos casos: ancho por debajo y por encima del breakpoint).
- Unit tests de `/api/push/enviar`: armado del payload, y que una suscripción con respuesta `410` se borra de la tabla (Supabase mockeado, mismo patrón que `pedidos-admin.test.ts`).
- Verificación manual end-to-end: instalar la PWA en un celular real (Android y, si es posible probarlo, iPhone), activar notificaciones, crear un pedido de prueba desde el checkout público, confirmar que llega la notificación push y que tocarla abre `/admin/pedidos`; confirmar también que la vista mobile se ve y funciona bien sin haber activado notificaciones (fallback de polling).
