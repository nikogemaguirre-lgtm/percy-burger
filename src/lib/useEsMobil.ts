import { useSyncExternalStore } from "react";

const CONSULTA_MOBIL = "(max-width: 767px)";

function suscribirse(callback: () => void) {
  const mediaQuery = window.matchMedia(CONSULTA_MOBIL);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function obtenerValorCliente(): boolean {
  return window.matchMedia(CONSULTA_MOBIL).matches;
}

function obtenerValorServidor(): boolean {
  return false;
}

export function useEsMobil(): boolean {
  return useSyncExternalStore(suscribirse, obtenerValorCliente, obtenerValorServidor);
}
