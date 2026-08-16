"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useMotionTemplate, useReducedMotion, MotionValue } from "framer-motion";
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

  // El hero es la primera sección de la página (scroll 0 = tope del documento),
  // así que toda la dispersión inicial tiene que caber dentro de esos primeros
  // 100vh — no hay "arriba" al que scrollear para revelar una pieza que se pase.
  const offsetYInicial = distanciaAlCentro * 6; // vh extra de dispersión, simétrico arriba/abajo
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
  // Las piezas son recortes negros del logo real: sobre el fondo negro inicial
  // serían invisibles, así que arrancan invertidas (blancas) y se invierten de
  // vuelta a negro a medida que el fondo pasa a naranja.
  const inversion = useTransform(progreso, [0, 1], [1, 0]);
  const filter = useMotionTemplate`invert(${inversion})`;

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
        filter,
      }}
    />
  );
}

function HeroAnimado() {
  const heroRef = useRef<HTMLDivElement>(null);
  // El hero no queda pineado (scroll libre), así que si la animación durara
  // hasta que el hero termina de salir de pantalla ("end start"), el logo se
  // terminaría de armar justo cuando ya casi no queda hero visible. Cortando
  // en la mitad del recorrido ("center start") el usuario llega a ver el
  // logo completo antes de que el hero se termine de ir de la vista.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "center start"] });
  const backgroundColor = useTransform(scrollYProgress, [0, 1], ["#000000", "#EF8B34"]);

  return (
    <div ref={heroRef} className="relative h-screen overflow-hidden" style={{ perspective: 1000 }}>
      <motion.div className="absolute inset-0" style={{ backgroundColor }} />
      <p className="absolute left-1/2 top-10 -translate-x-1/2 text-center text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
  Hamburguesas
</p>
      <div
        className="absolute left-1/2 top-[65%] w-full max-w-xl -translate-x-1/2 -translate-y-1/2"
        style={{ transformStyle: "preserve-3d", aspectRatio: `${logoCanvas.width} / ${logoCanvas.height}` }}
      >
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
