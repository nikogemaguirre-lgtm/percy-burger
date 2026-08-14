# Logo en header + hero animado — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el header de texto y la landing sin hero por el logo real de Percy Burger — un logo estático centrado en el header, y en la landing un hero scroll-driven donde 7 piezas del logo (pan de arriba, letras P-E-R-S-I, pan de abajo) flotan dispersas sobre fondo negro y se unen en el logo real a medida que se scrollea, con el fondo interpolando a naranja de marca.

**Architecture:** Un script Python de una sola corrida extrae las 7 piezas del logo real (PNG con transparencia) más un manifiesto tipado en TypeScript, a partir de la única imagen fuente del vault. Un componente `Hero.tsx` client-side usa `framer-motion` para mapear el progreso de scroll a la posición/rotación de cada pieza y al color de fondo, sin capturar el scroll del usuario. El header usa el logo completo ya armado, sin animación.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS 4, framer-motion (nueva dependencia), Python 3 + Pillow (solo como utilidad de generación de assets, no corre en producción).

## Global Constraints

- Color naranja de marca exacto: `#EF8B34` (ya definido como `--color-brand-orange` en `src/app/globals.css`, coincide pixel a pixel con el fondo del logo fuente).
- El hero es de **scroll libre**: nunca se captura ni se bloquea el scroll del usuario (sin scroll-jacking, sin `position: sticky` para pinnear la sección).
- Con `prefers-reduced-motion: reduce`, no debe ejecutarse ninguna animación: se muestra directamente el estado final (fondo naranja + logo completo).
- No se agregan tests automatizados nuevos para el componente visual `Hero.tsx` (decisión explícita del spec — es una pieza puramente de animación, sin lógica de negocio). El script Python sí se verifica con aserciones propias y verificación manual de su salida.
- Convención existente del repo: imágenes con `<img>` plano (no `next/image` — ver `ProductoCard.tsx`), datos tipados en `src/data/*.ts` con sus tipos en `src/data/types.ts`.
- La imagen fuente del logo vive fuera del repo, en `~/Obsidian/Percy Burger/imagenes/Captura de pantalla 2026-08-13 a la(s) 15.47.19.png` (640×638px, RGB puro: fondo `#EF8B34`, figura `#000000`). El script la lee de ahí una sola vez; los PNG generados sí se commitean al repo en `public/logo/`.

---

### Task 1: Script de extracción de las piezas del logo

**Files:**
- Create: `scripts/extraer-logo.py`
- Create (generado por el script, no a mano): `public/logo/pan-arriba.png`, `public/logo/pan-abajo.png`, `public/logo/letra-p.png`, `public/logo/letra-e.png`, `public/logo/letra-r.png`, `public/logo/letra-s.png`, `public/logo/letra-i.png`, `public/logo/logo-completo.png`
- Create (generado por el script, no a mano): `src/data/logoPiezas.ts`
- Modify: `src/data/types.ts` (agrega el tipo `LogoPieza`)

**Interfaces:**
- Produces: `src/data/types.ts` exporta `LogoPieza { id: string; archivo: string; x: number; y: number; width: number; height: number }`. `src/data/logoPiezas.ts` exporta `logoCanvas: { width: number; height: number }`, `logoPiezas: LogoPieza[]` (7 piezas, sin incluir el logo completo) y `logoCompletoUrl: string`. Todas las tareas siguientes consumen estos tres exports.

- [ ] **Step 1: Agregar el tipo `LogoPieza` a `src/data/types.ts`**

Agregar al final del archivo:

```ts
export interface LogoPieza {
  id: string;
  archivo: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

- [ ] **Step 2: Crear el directorio de destino de los assets**

Run: `mkdir -p public/logo`

- [ ] **Step 3: Escribir el script `scripts/extraer-logo.py`**

```python
"""Extrae las 7 piezas del logo real de Percy Burger (pan de arriba, letras
P-E-R-S-I, pan de abajo) como PNG con transparencia, más un archivo de datos
TypeScript con la posición de cada pieza dentro del logo armado.

Se corre una sola vez, a mano, cuando el logo fuente cambia. No forma parte
del build de Next.js.

Uso: python3 scripts/extraer-logo.py
"""
import json
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
FUENTE = Path.home() / "Obsidian" / "Percy Burger" / "imagenes" / "Captura de pantalla 2026-08-13 a la(s) 15.47.19.png"
DESTINO_PNG = REPO_ROOT / "public" / "logo"
DESTINO_TS = REPO_ROOT / "src" / "data" / "logoPiezas.ts"

BG = (239, 139, 52)  # #EF8B34, fondo naranja del logo fuente
UMBRAL_FG = 60  # un pixel es "negro" (parte del isotipo) si sus 3 canales están debajo de este valor
PADDING = 6  # margen extra alrededor de cada pieza, para no cortar el antialiasing del borde
DILATACION = 2  # cuánto se expande la máscara propia de cada pieza; evita que una pieza incluya un pedacito de la pieza vecina


def cargar():
    im = Image.open(FUENTE).convert("RGB")
    return im, im.load(), im.size


def es_fg(px, x, y):
    r, g, b = px[x, y]
    return r < UMBRAL_FG and g < UMBRAL_FG and b < UMBRAL_FG


def encontrar_componentes(px, w, h):
    """Flood fill iterativo (BFS) sobre los píxeles negros. Devuelve una grilla
    de labels (qué componente es cada píxel, -1 si es fondo) y la lista de
    componentes con su bounding box."""
    labels = [[-1] * w for _ in range(h)]
    componentes = []
    for y in range(h):
        for x in range(w):
            if es_fg(px, x, y) and labels[y][x] == -1:
                idx = len(componentes)
                pila = [(x, y)]
                labels[y][x] = idx
                minx = maxx = x
                miny = maxy = y
                area = 0
                while pila:
                    cx, cy = pila.pop()
                    area += 1
                    minx, maxx = min(minx, cx), max(maxx, cx)
                    miny, maxy = min(miny, cy), max(maxy, cy)
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and labels[ny][nx] == -1 and es_fg(px, nx, ny):
                            labels[ny][nx] = idx
                            pila.append((nx, ny))
                componentes.append({"minx": minx, "miny": miny, "maxx": maxx, "maxy": maxy, "area": area})
    return labels, componentes


def clasificar(componentes):
    """Separa los componentes detectados en los 2 panes (anchos) y las 5 letras
    (angostas), y les asigna nombre según su posición."""
    con_indice = [(i, c) for i, c in enumerate(componentes) if c["area"] > 20]
    panes = [(i, c) for i, c in con_indice if (c["maxx"] - c["minx"]) > 300]
    letras = [(i, c) for i, c in con_indice if (c["maxx"] - c["minx"]) <= 300]
    if len(panes) != 2:
        raise SystemExit(f"Se esperaban 2 panes (arriba/abajo), se encontraron {len(panes)}")
    if len(letras) != 5:
        raise SystemExit(f"Se esperaban 5 letras (PERSI), se encontraron {len(letras)}")
    panes.sort(key=lambda t: t[1]["miny"])  # el de miny más chico es el de arriba
    letras.sort(key=lambda t: t[1]["minx"])  # de izquierda a derecha: P, E, R, S, I
    nombres_letras = ["p", "e", "r", "s", "i"]
    piezas = [("pan-arriba", panes[0][0], panes[0][1]), ("pan-abajo", panes[1][0], panes[1][1])]
    piezas += [(f"letra-{n}", i, c) for n, (i, c) in zip(nombres_letras, letras)]
    return piezas


def alpha_en(px, x, y):
    """Alpha continuo (0-1) según qué tan 'negro' es el pixel, para que el
    borde recortado quede antialiaseado en vez de dentado."""
    r, g, b = px[x, y]
    t = 1 - (g / BG[1])
    return max(0.0, min(1.0, t))


def recortar_pieza(px, labels, w, h, idx, caja):
    x0 = max(0, caja["minx"] - PADDING)
    y0 = max(0, caja["miny"] - PADDING)
    x1 = min(w, caja["maxx"] + PADDING + 1)
    y1 = min(h, caja["maxy"] + PADDING + 1)
    cw, ch = x1 - x0, y1 - y0

    propio = [[labels[y0 + y][x0 + x] == idx for x in range(cw)] for y in range(ch)]
    dilatado = [[False] * cw for _ in range(ch)]
    for y in range(ch):
        for x in range(cw):
            if propio[y][x]:
                for dy in range(-DILATACION, DILATACION + 1):
                    for dx in range(-DILATACION, DILATACION + 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < ch and 0 <= nx < cw:
                            dilatado[ny][nx] = True

    recorte = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    datos = []
    for y in range(ch):
        for x in range(cw):
            a = alpha_en(px, x0 + x, y0 + y) if dilatado[y][x] else 0.0
            datos.append((0, 0, 0, round(a * 255)))
    recorte.putdata(datos)
    return recorte, (x0, y0, x1, y1)


def escribir_ts(manifest):
    piezas_ts = ",\n".join(
        f'  {{ id: "{p["id"]}", archivo: "{p["archivo"]}", x: {p["x"]}, y: {p["y"]}, width: {p["width"]}, height: {p["height"]} }}'
        for p in manifest["piezas"]
    )
    contenido = f'''import {{ LogoPieza }} from "./types";

export const logoCanvas = {{ width: {manifest["canvasWidth"]}, height: {manifest["canvasHeight"]} }};

export const logoCompletoUrl = "/logo/logo-completo.png";

export const logoPiezas: LogoPieza[] = [
{piezas_ts},
];
'''
    DESTINO_TS.write_text(contenido)


def main():
    im, px, (w, h) = cargar()
    labels, componentes = encontrar_componentes(px, w, h)
    detectados = sum(1 for c in componentes if c["area"] > 20)
    assert detectados == 7, f"Se esperaban 7 componentes, se detectaron {detectados}"

    piezas = clasificar(componentes)
    manifest = {"canvasWidth": w, "canvasHeight": h, "piezas": []}
    for nombre, idx, caja in piezas:
        recorte, bbox_real = recortar_pieza(px, labels, w, h, idx, caja)
        archivo = f"{nombre}.png"
        recorte.save(DESTINO_PNG / archivo)
        manifest["piezas"].append({
            "id": nombre,
            "archivo": f"/logo/{archivo}",
            "x": bbox_real[0],
            "y": bbox_real[1],
            "width": bbox_real[2] - bbox_real[0],
            "height": bbox_real[3] - bbox_real[1],
        })
        print(f"{nombre}: {bbox_real}")

    im.save(DESTINO_PNG / "logo-completo.png")
    escribir_ts(manifest)
    print(f"OK: 8 PNG en {DESTINO_PNG} + {DESTINO_TS}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Correr el script**

Run: `python3 scripts/extraer-logo.py`

Expected (los números son deterministas porque la imagen fuente no cambia):
```
pan-arriba: (95, 142, 546, 289)
pan-abajo: (95, 410, 546, 500)
letra-p: (95, 289, 196, 415)
letra-e: (186, 284, 292, 416)
letra-r: (283, 283, 390, 419)
letra-s: (382, 281, 484, 417)
letra-i: (473, 284, 547, 419)
OK: 8 PNG en .../public/logo + .../src/data/logoPiezas.ts
```

- [ ] **Step 5: Verificar visualmente 2-3 piezas generadas**

Abrir `public/logo/pan-arriba.png` y `public/logo/letra-s.png` en un visor de imágenes (o `open public/logo/letra-s.png` en macOS). Verificar que el fondo sea transparente (no naranja ni blanco) y que la forma no tenga fragmentos de otras piezas pegados.

- [ ] **Step 6: Confirmar que `src/data/logoPiezas.ts` compila**

Run: `npx tsc --noEmit`
Expected: sin errores relacionados a `logoPiezas.ts` ni a `types.ts`.

- [ ] **Step 7: Commit**

```bash
git add scripts/extraer-logo.py public/logo src/data/logoPiezas.ts src/data/types.ts
git commit -m "feat: generar piezas del logo (pan arriba/abajo + letras PERSI) para el hero animado"
```

---

### Task 2: Instalar framer-motion

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: dependencia `framer-motion` disponible para importar en `src/components/Hero.tsx` (Task 3).

- [ ] **Step 1: Instalar la dependencia**

Run: `npm install framer-motion`

- [ ] **Step 2: Verificar que quedó en `dependencies`**

Run: `grep framer-motion package.json`
Expected: una línea dentro de `"dependencies"` con la versión instalada.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: agregar framer-motion para la animación scroll-driven del hero"
```

---

### Task 3: Componente `Hero.tsx`

**Files:**
- Create: `src/components/Hero.tsx`

**Interfaces:**
- Consumes: `logoPiezas`, `logoCanvas`, `logoCompletoUrl` de `@/data/logoPiezas` (Task 1). `LogoPieza` de `@/data/types` (Task 1). `framer-motion` (Task 2): `motion`, `useScroll`, `useTransform`, `useReducedMotion`.
- Produces: `Hero` (named export, componente sin props) — usado por `src/app/page.tsx` en Task 4.

- [ ] **Step 1: Escribir `src/components/Hero.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, MotionValue } from "framer-motion";
import { logoPiezas, logoCanvas, logoCompletoUrl } from "@/data/logoPiezas";
import { LogoPieza } from "@/data/types";

// Orden de arriba hacia abajo dentro del logo armado: pan-arriba, P, E, R, S, I, pan-abajo.
// Se usa para calcular cuánto se dispersa cada pieza en el estado inicial: las piezas
// de los extremos (los panes) arrancan más lejos que las del medio.
const ORDEN_DISPERSION = ["pan-arriba", "letra-p", "letra-e", "letra-r", "letra-s", "letra-i", "pan-abajo"];
const INDICE_CENTRAL = (ORDEN_DISPERSION.length - 1) / 2; // 3, la posición de "letra-s"

function PiezaAnimada({ pieza, progreso }: { pieza: LogoPieza; progreso: MotionValue<number> }) {
  const indice = ORDEN_DISPERSION.indexOf(pieza.id);
  const distanciaAlCentro = indice - INDICE_CENTRAL; // negativo arriba, positivo abajo
  const jitter = indice % 2 === 0 ? 1 : -1;

  const offsetYInicial = distanciaAlCentro * 14; // vh extra de dispersión, simétrico arriba/abajo
  const offsetXInicial = jitter * 6; // vw de jitter horizontal
  const rotateInicial = jitter * 8; // grados de jitter
  const rotateYInicial = jitter * 18; // profundidad 3D simulada (perspective del contenedor padre)

  // "x", "y", "rotate", "rotateY" y "scale" son los nombres especiales que
  // framer-motion combina automáticamente en un único `transform` CSS — no
  // usar "translateX"/"translateY" como key de style, no son reconocidos.
  const y = useTransform(progreso, [0, 1], [`${offsetYInicial}vh`, "0vh"]);
  const x = useTransform(progreso, [0, 1], [`${offsetXInicial}vw`, "0vw"]);
  const rotate = useTransform(progreso, [0, 1], [rotateInicial, 0]);
  const rotateY = useTransform(progreso, [0, 1], [rotateYInicial, 0]);
  const scale = useTransform(progreso, [0, 1], [0.85, 1]);

  const leftPct = (pieza.x / logoCanvas.width) * 100;
  const topPct = (pieza.y / logoCanvas.height) * 100;
  const widthPct = (pieza.width / logoCanvas.width) * 100;

  return (
    <motion.img
      src={pieza.archivo}
      alt=""
      aria-hidden="true"
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${widthPct}%`,
        x,
        y,
        rotate,
        rotateY,
        scale,
      }}
    />
  );
}

function HeroAnimado() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const backgroundColor = useTransform(scrollYProgress, [0, 1], ["#000000", "#EF8B34"]);

  return (
    <div ref={heroRef} className="relative h-screen overflow-hidden" style={{ perspective: 1000 }}>
      <motion.div className="absolute inset-0" style={{ backgroundColor }} />
      <div className="relative mx-auto h-full max-w-xl" style={{ transformStyle: "preserve-3d" }}>
        {logoPiezas.map((pieza) => (
          <PiezaAnimada key={pieza.id} pieza={pieza} progreso={scrollYProgress} />
        ))}
      </div>
    </div>
  );
}

function HeroEstatico() {
  return (
    <div className="relative flex h-screen items-center justify-center" style={{ backgroundColor: "#EF8B34" }}>
      <img src={logoCompletoUrl} alt="Percy Burger" className="max-h-[60%] max-w-[70%] object-contain" />
    </div>
  );
}

export function Hero() {
  const prefiereMenosMovimiento = useReducedMotion();
  return prefiereMenosMovimiento ? <HeroEstatico /> : <HeroAnimado />;
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores en `Hero.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/Hero.tsx
git commit -m "feat: agregar componente Hero con animación scroll-driven del logo"
```

---

### Task 4: Insertar el hero en la landing y verificar en el navegador

**Files:**
- Modify: `src/app/page.tsx:1-9` (imports y JSX del `return`)

**Interfaces:**
- Consumes: `Hero` de `@/components/Hero` (Task 3).

- [ ] **Step 1: Importar y renderizar `Hero` arriba de todo**

En `src/app/page.tsx`, agregar el import junto a los existentes:

```tsx
import { Hero } from "@/components/Hero";
```

Y como primera línea dentro del `<main>` que devuelve `Home()` (antes de la sección de Promos), agregar:

```tsx
<Hero />
```

- [ ] **Step 2: Verificar en el navegador (desktop)**

Con el servidor de desarrollo corriendo (`npm run dev`, ya debería estar activo en `localhost:3000`), recargar la pestaña de Chrome abierta en esa URL. Confirmar:
- Al cargar, se ven las 7 piezas dispersas flotando sobre fondo negro.
- Al scrollear hacia abajo, las piezas convergen y el fondo pasa a naranja `#EF8B34`, terminando en el logo armado reconocible.
- El scroll nunca queda trabado — se puede seguir bajando hacia el catálogo en cualquier momento.

- [ ] **Step 3: Verificar en modo mobile**

En las devtools de Chrome, activar la vista de dispositivo móvil (p. ej. iPhone), recargar, y repetir la verificación del Step 2. Confirmar que ninguna pieza se corta en los bordes de la pantalla.

- [ ] **Step 4: Verificar el fallback de `prefers-reduced-motion`**

En las devtools de Chrome: Cmd+Shift+P → "Show Rendering" → "Emulate CSS media feature prefers-reduced-motion: reduce". Recargar la página. Confirmar que se ve directamente el logo armado sobre fondo naranja, sin ninguna animación al scrollear. Volver a desactivar la emulación al terminar.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: insertar el hero animado en la landing"
```

---

### Task 5: Logo centrado en el header

**Files:**
- Modify: `src/components/Header.tsx`

**Interfaces:**
- Consumes: `logoCompletoUrl` de `@/data/logoPiezas` (Task 1).

- [ ] **Step 1: Reemplazar el contenido del header**

Contenido actual de `src/components/Header.tsx`:

```tsx
import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-brand-black/10 bg-brand-black">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-extrabold text-brand-yellow">
          Percy Burger
        </Link>
        <span className="hidden text-sm text-white/70 sm:block">Falucho 440, Dorrego, Guaymallén</span>
      </div>
    </header>
  );
}
```

Reemplazar por:

```tsx
import Link from "next/link";
import { logoCompletoUrl } from "@/data/logoPiezas";

export function Header() {
  return (
    <header className="border-b border-brand-black/10 bg-brand-black">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 px-4 py-3">
        <Link href="/">
          <img src={logoCompletoUrl} alt="Percy Burger" className="h-12 w-auto" />
        </Link>
        <span className="hidden text-sm text-white/70 sm:block">Falucho 440, Dorrego, Guaymallén</span>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verificar en el navegador**

Recargar `localhost:3000` en la pestaña de Chrome. Confirmar que el header muestra el logo centrado (ícono de hamburguesa negra + "PERSI" sobre naranja), con la dirección debajo en desktop y oculta en mobile (repetir el chequeo de vista mobile de las devtools).

- [ ] **Step 3: Confirmar que compila y pasan los tests existentes**

Run: `npx tsc --noEmit && npm test`
Expected: sin errores de tipos; los tests existentes (`cart.test.ts`, `whatsapp.test.ts`) siguen en verde (no dependen del header).

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: mostrar el logo real centrado en el header"
```
