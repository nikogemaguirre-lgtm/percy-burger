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
