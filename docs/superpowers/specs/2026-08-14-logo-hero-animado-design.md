# Percy Burger — Logo en header + hero animado scroll-driven

Fecha: 2026-08-14
Estado: aprobado

## Contexto

El sitio público de Percy Burger ya está en producción (`https://percy-burger.vercel.app/`, spec previo `2026-08-13-sitio-publico-design.md`), con catálogo, carrito y checkout funcionando. Ese primer spec dejó explícitamente fuera de alcance el logo real y el hero animado de la landing, porque en ese momento no estaba decidido qué opción usar (ver `Hero animado (landing).md` del vault, que planteaba dos opciones sin resolver: A — ingredientes de hamburguesa explosionados, B — nombre "Percy Burger" en letras sueltas).

Con el logo real ya confirmado (`Identidad visual.md` del vault) y la decisión tomada con Nicolás en esta sesión de brainstorming, este spec cubre la implementación de esas dos piezas pendientes: el logo estático en el header, y el hero animado de la landing.

Referencia visual de la mecánica ("exploded view", capas flotando que se unen): foto de stock de una hamburguesa desarmada en capas sobre fondo negro (`hamburguesa-exploded-referencia.png` del vault) — se usa solo como referencia de la disposición vertical en capas, no como asset final.

## Decisión de diseño (resuelve la opción A/B pendiente)

Ninguna de las dos opciones originales tal cual: es un híbrido específico, validado con mockups en el companion visual de brainstorming durante esta sesión.

- Las "capas" de la hamburguesa de la foto de referencia se reemplazan por las piezas reales del logo de Percy Burger: el pan de arriba, las 5 letras de "PERSI", y el pan de abajo — **sin íconos ni emojis de comida**.
- Al cargar la página, esas 7 piezas están dispersas y flotando sobre fondo negro.
- A medida que el usuario scrollea (scroll libre, sin scroll-jacking), cada pieza viaja hasta encastrar en su posición exacta dentro del logo real: el pan arriba de la P, el pan abajo de la I.
- El fondo interpola de negro a naranja de marca (`#EF8B34`) a medida que las piezas se van uniendo, hasta cubrir toda la pantalla del hero cuando el logo terminó de armarse — no queda ningún círculo ni tarjeta contenedora, el naranja pasa a ser el fondo completo de la sección.
- El logo, tanto en su forma armada final del hero como en el header, es el isotipo real ya existente (silueta de hamburguesa negra + "PERSI" integrado, sobre naranja) — no se rediseña ni se recrea con tipografía nueva.

## Alcance

**Incluye:**
- Generación de 7 assets PNG con transparencia a partir del logo real (`Captura de pantalla 2026-08-13 a la(s) 15.47.19.png` del vault): pan de arriba, letra P, letra E, letra R, letra S, letra I, pan de abajo.
- Componente `Hero.tsx`: sección de altura de pantalla completa, insertada arriba de todo en `src/app/page.tsx`, antes de las secciones de Promos/categorías existentes.
- Animación scroll-driven de las 7 piezas con `framer-motion` (nueva dependencia), usando `useScroll` + `useTransform` dentro de un contenedor con `perspective` CSS para dar sensación de profundidad (3D simulado, no WebGL/three.js).
- Interpolación del color de fondo del hero de negro a `#EF8B34` en función del progreso de scroll.
- Fallback estático (logo ya armado sobre fondo naranja, sin animación) cuando el usuario tiene `prefers-reduced-motion` activado.
- Logo estático centrado en `Header.tsx`, reemplazando el texto "Percy Burger" que hoy está a la izquierda. La dirección del local se reubica debajo o se oculta en mobile para no competir visualmente con el logo centrado.
- Ajuste de escala de piezas y letras en mobile para que no se corten en pantallas angostas.

**Explícitamente fuera de alcance** (para una etapa posterior, ya acordada con Nicolás):
- Reordenamiento/rediseño visual del catálogo, carrito y checkout.
- Panel de administración de Percy.
- Cualquier cambio a la paleta de colores o al isotipo del logo en sí (se usa tal cual está confirmado en `Identidad visual.md`).

## Pipeline de generación de assets

El logo fuente es una imagen de dos colores puros (negro sobre naranja sólido `#EF8B34`), lo que permite aislar las piezas por umbral de color en vez de recrearlas a mano:

1. Cargar la imagen fuente con Python (PIL + numpy).
2. Aislar los píxeles negros (máscara por umbral de color) para separar el foreground del fondo naranja.
3. Recortar el pan de arriba y el pan de abajo por rango de coordenadas Y fijo (son las dos franjas negras continuas, arriba y abajo del bloque de letras).
4. Separar las 5 letras de la franja central por componentes conexos (`scipy.ndimage.label` o equivalente). Si el trazo "bubble" hace que dos letras aparezcan unidas en un mismo componente, ajustar el recorte manualmente por coordenadas X en vez de depender solo de la detección automática.
5. Exportar cada una de las 7 piezas como PNG independiente con canal alfa (fondo transparente), recortado a su bounding box.
6. Guardar los assets en `public/logo/` (p. ej. `pan-arriba.png`, `letra-p.png`, ..., `pan-abajo.png`), más el logo completo ya armado (`public/logo/logo-completo.png`) para el header y para el estado final del hero.

## Componente Hero

- Vive en `src/components/Hero.tsx`, se importa una sola vez en `src/app/page.tsx`, antes de las secciones existentes.
- Contenedor de altura `100vh` con `perspective` CSS.
- Cada una de las 7 piezas es una imagen posicionada con `position: absolute`, animada con `motion.img` de `framer-motion`.
- El progreso de scroll dentro de la zona del hero (`useScroll` con `target` en el propio contenedor) se mapea con `useTransform` a la posición X/Y/Z y rotación final de cada pieza — de su posición dispersa inicial a su posición de encastre en el logo armado.
- El color de fondo del contenedor también se deriva del mismo progreso de scroll (interpolación de negro a `#EF8B34`).
- Es scroll libre: nunca se captura ni se bloquea el scroll del usuario: las piezas simplemente reflejan cuánto se scrolleó, el usuario puede seguir bajando hacia el catálogo en cualquier momento aunque la animación no haya terminado.
- Con `prefers-reduced-motion: reduce`, el componente renderiza directamente el estado final (fondo naranja + `logo-completo.png` centrado), sin ninguna animación ni JS de scroll.

## Logo en el header

- `src/components/Header.tsx`: se reemplaza el texto "Percy Burger" del `<Link>` por `logo-completo.png`, centrado en la barra (en vez de a la izquierda como está hoy), tamaño fijo chico (~40–48px de alto).
- La dirección "Falucho 440, Dorrego, Guaymallén" que hoy está a la derecha se reubica debajo del logo en una segunda línea, o se oculta en mobile (breakpoint `sm`) para no competir con el logo centrado — mismo criterio de `hidden sm:block` que ya usa ese elemento hoy.
- Es una imagen estática, sin ninguna animación — la animación de armado vive únicamente en el hero de la landing.

## Responsive

- El hero mantiene la misma mecánica de scroll libre en mobile, con las piezas y letras escaladas hacia abajo (tamaño relativo al viewport, no un tamaño fijo en px) para que ninguna pieza se corte en pantallas angostas.
- El logo del header usa un tamaño fijo chico que ya funciona igual en mobile y desktop, sin necesidad de breakpoints propios.

## Testing

- Verificación visual manual en el navegador (Chrome, sesión de desarrollo local en `localhost:3000`), en desktop y en modo mobile de las devtools.
- Chequeo manual con `prefers-reduced-motion` activado en las devtools, para confirmar que el fallback estático se ve correcto.
- No se agregan tests automatizados nuevos para este spec — es una pieza puramente visual/de animación, sin lógica de negocio nueva que testear (a diferencia de `cart.ts`/`whatsapp.ts`, que sí tienen tests unitarios).
