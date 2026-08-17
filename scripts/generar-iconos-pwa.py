"""Genera los íconos PWA (192x192 y 512x512) del panel de administración de
Percy Burger a partir del logo completo, con fondo negro de marca.

Se corre una sola vez, a mano, cuando el logo fuente cambia. No forma parte
del build de Next.js.

Uso: python3 scripts/generar-iconos-pwa.py
"""
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
FUENTE = REPO_ROOT / "public" / "logo" / "logo-completo.png"
DESTINO = REPO_ROOT / "public" / "logo"

FONDO = (22, 22, 22, 255)  # #161616, brand-black
TAMANOS = [192, 512]
MARGEN = 0.12  # 12% de margen alrededor del logo dentro del ícono


def generar(tamano: int) -> None:
    logo = Image.open(FUENTE).convert("RGBA")
    lienzo = Image.new("RGBA", (tamano, tamano), FONDO)

    espacio_util = int(tamano * (1 - 2 * MARGEN))
    escala = min(espacio_util / logo.width, espacio_util / logo.height)
    nuevo_tamano = (round(logo.width * escala), round(logo.height * escala))
    logo_redimensionado = logo.resize(nuevo_tamano, Image.LANCZOS)

    x = (tamano - nuevo_tamano[0]) // 2
    y = (tamano - nuevo_tamano[1]) // 2
    lienzo.paste(logo_redimensionado, (x, y), logo_redimensionado)

    destino = DESTINO / f"icono-{tamano}.png"
    lienzo.save(destino)
    print(f"Generado {destino}")


if __name__ == "__main__":
    for tamano in TAMANOS:
        generar(tamano)
