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
