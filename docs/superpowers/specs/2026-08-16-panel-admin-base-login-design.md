# Percy Burger — Panel de administración: base de datos + login (sub-proyecto 1)

Fecha: 2026-08-16
Estado: aprobado

## Contexto

El sitio público de Percy Burger está en producción (`https://percy-burger.vercel.app/`) con catálogo, carrito, checkout, hero animado, reseñas y ubicación ya implementados, todo sin backend ni base de datos — el catálogo vive hardcodeado en `src/data/menu.ts` y `src/data/combos.ts`.

El siguiente módulo grande, ya identificado como pendiente en `Panel de administración.md` del vault, es la vista que ve **Percy** (el dueño, usuario administrador único) para gestionar su negocio: CRUD de productos/combos, gestión de pedidos con estados, zonas de envío, configuración de Mercado Pago, generación de imágenes por IA y reportes de ventas.

Ese alcance completo es demasiado grande para un solo spec/plan — se decidió en brainstorming partirlo en sub-proyectos independientes, cada uno con su propio ciclo spec → plan → implementación. Este spec cubre **solo el primero: la base técnica** (base de datos + login de Percy), sin la cual no se puede construir nada más del panel. Los sub-proyectos siguientes (CRUD de productos, gestión de pedidos, zonas de envío, Mercado Pago, imágenes por IA, reportes) quedan fuera de este spec.

El hosting ya estaba decidido de antes (Vercel + Supabase, ver `Arquitectura técnica.md`), pero el framework/librería concreta para DB y auth estaba pendiente — se definió en esta sesión de brainstorming.

## Alcance

**Incluye:**
- Proyecto de Supabase (Postgres + Auth) conectado al proyecto Next.js.
- Tablas `productos` y `combos` en Postgres, con políticas RLS (lectura pública, escritura solo autenticada).
- Migración puntual de los datos de `src/data/menu.ts`/`combos.ts` a esas tablas, y borrado de esos dos archivos una vez migrados.
- El sitio público (`/`) pasa a leer productos y combos desde Supabase en vez de los archivos locales.
- Login de Percy: `/admin/login` (usuario/contraseña vía Supabase Auth) y `/admin` protegida (redirige a login si no hay sesión válida), mostrando una lista de solo lectura de los productos/combos ya migrados.
- Middleware de Next.js que valida la sesión server-side en cada request a `/admin/*`.
- Recuperación de contraseña por email (flujo nativo de Supabase Auth).
- Botón de cerrar sesión.
- Alta manual del usuario Percy (email + contraseña inicial) desde el dashboard de Supabase, a cargo de Nicolás al lanzar esto.

**Explícitamente fuera de alcance (sub-proyectos futuros):**
- CRUD real de productos/combos (crear, editar, borrar) — este spec solo deja la lista de lectura.
- Cambio de contraseña desde el panel.
- Gestión de pedidos, estados, vistas desktop/mobile separadas.
- Zonas de envío, configuración de Mercado Pago, generación de imágenes por IA, reportes de ventas, aviso de inactividad de la DB.
- Migración de `zonas.ts` o `resenas.ts` — quedan locales por ahora.

## Arquitectura

- **Base de datos:** Supabase Postgres, plan gratuito (ya decidido en `Arquitectura técnica.md`).
- **Auth:** Supabase Auth, email/password, un único usuario (Percy). Sin pantalla de auto-registro — el alta es manual desde el dashboard de Supabase.
- **Acceso a datos:** `@supabase/supabase-js` + `@supabase/ssr` (paquete oficial para Next.js App Router, maneja cookies de sesión server-side). El sitio público lee con la *anon key* (RLS permite `SELECT` público, bloquea escritura). El panel valida la sesión de Percy server-side antes de cualquier lectura/escritura de admin.
- **Rutas nuevas:**
  - `/admin/login` — formulario usuario/contraseña + link "Olvidé mi contraseña".
  - `/admin` — protegida por middleware; sin sesión válida redirige a `/admin/login`; con sesión, muestra lista de solo lectura de productos y combos.
- **Nota técnica de implementación:** Next.js 16 (usado en este proyecto) tiene cambios de convención respecto a versiones anteriores, según indica `AGENTS.md` del repo. Antes de escribir código de Route Handlers/Server Components/middleware para este sub-proyecto, se revisa `node_modules/next/dist/docs/` para confirmar la API vigente.

## Esquema de datos

```sql
create table productos (
  id text primary key,
  categoria text not null check (categoria in ('clasica','especial','extra','bebida')),
  nombre text not null,
  ingredientes text not null,
  precio_simple integer not null,
  precio_doble integer,
  precio_triple integer,
  imagen_url text not null
);

create table combos (
  id text primary key,
  nombre text not null,
  descripcion text not null,
  precio integer not null,
  imagen_url text not null,
  activo boolean not null default true
);

alter table productos enable row level security;
alter table combos enable row level security;

create policy "productos: lectura publica" on productos for select using (true);
create policy "combos: lectura publica" on combos for select using (true);

create policy "productos: escritura autenticada" on productos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "combos: escritura autenticada" on combos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

Los `id` se conservan como texto, mismos slugs que hoy (ej. `"cheese-burger"`), para no romper las referencias existentes a imágenes en `/productos/` ni la lógica del carrito. Los precios de `Producto` (`precios: Partial<Record<Tamaño, number>> & { simple: number }`) se aplanan a tres columnas (`precio_simple` obligatoria, `precio_doble`/`precio_triple` nullable) — se reconstruye el objeto `precios` al leer, en la capa de mapeo DB→`Producto`.

Las políticas de escritura ya quedan listas desde este sub-proyecto aunque el CRUD (que las va a usar) llegue en el siguiente.

## Login y sesión

- `/admin/login`: formulario (email + contraseña) que llama a `supabase.auth.signInWithPassword`. Credenciales inválidas → mensaje de error genérico (sin distinguir "usuario no existe" de "contraseña incorrecta").
- Sesión persistida vía cookies con `@supabase/ssr` — dura hasta que Percy cierre sesión explícitamente (Supabase refresca el token automáticamente mientras haya actividad), cumpliendo el requisito de "sesión permanente" del vault.
- Middleware de Next.js sobre `/admin/*` (excepto `/admin/login`) que verifica la sesión server-side en cada request; sin sesión válida o expirada → redirect a `/admin/login` (nunca un 500 ni datos expuestos).
- Botón "Cerrar sesión" visible en `/admin`.
- Recuperación de contraseña: flujo nativo `supabase.auth.resetPasswordForEmail` desde un link "Olvidé mi contraseña" en `/admin/login` — usa la plantilla de email que Supabase ya provee en el plan gratuito, sin código de envío de mail propio.
- Alta del usuario inicial: Nicolás la hace a mano desde el dashboard de Supabase al lanzar esto y le entrega usuario/contraseña a Percy. El cambio de contraseña *desde el panel* queda fuera de este sub-proyecto.

## Migración de datos y fuente pública

- Script puntual `scripts/migrar-catalogo.ts` (se corre una vez, no queda como parte del flujo normal de la app) que lee `productos`/`combos` de `src/data/menu.ts`/`combos.ts` e inserta las filas correspondientes en Supabase vía `supabase-js` con la *service role key* (solo se usa localmente para la migración, nunca se expone al cliente).
- Tras confirmar la migración (verificando en el dashboard de Supabase que las filas quedaron bien), el sitio público deja de importar de `src/data/menu.ts`/`combos.ts` y pasa a leer productos/combos desde Supabase en un Server Component (mismo patrón de rendering server-side que ya usa hoy, sin JS adicional en el cliente).
- `src/data/menu.ts` y `src/data/combos.ts` se borran una vez confirmado que el sitio público funciona leyendo de la DB — no quedan como fallback muerto.
- `src/data/zonas.ts` y `src/data/resenas.ts` no se tocan en este sub-proyecto.

## Manejo de errores

- Login con credenciales inválidas: mensaje de error genérico en el formulario.
- Falla de conexión a Supabase, tanto en el sitio público como en el panel: página de error controlada ("no pudimos cargar el menú, probá de nuevo"), no un crash en blanco.
- Middleware: sesión ausente o expirada en `/admin/*` → redirect a `/admin/login`, nunca un 500 ni una respuesta que exponga datos de admin.

## Testing

- Tests unitarios (Vitest, mismo patrón que `cart.test.ts`/`whatsapp.test.ts`) para la función de mapeo DB→`Producto`/`Combo` (reconstrucción del objeto `precios` a partir de las columnas planas).
- Login y flujo de sesión: verificación manual en el navegador (no hay infraestructura de test e2e en este proyecto) — igual que se hizo con las features anteriores del sitio público.
- Verificación end-to-end manual: sitio público mostrando el catálogo migrado, y `/admin` mostrando login → lista de productos tras autenticarse → redirect a login tras cerrar sesión o con sesión expirada.

## Pendientes fuera de este spec

- Sub-proyectos siguientes ya identificados en brainstorming: CRUD de productos/combos, gestión de pedidos con estados (vistas desktop/mobile), zonas de envío, configuración de Mercado Pago, generación de imágenes por IA, reportes de ventas + aviso de inactividad de la DB.
- Cambio de contraseña desde el panel (hoy solo vía "olvidé mi contraseña").
