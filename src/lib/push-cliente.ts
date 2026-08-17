export function convertirClaveVapid(clave: string): Uint8Array {
  const padding = "=".repeat((4 - (clave.length % 4)) % 4);
  const base64 = (clave + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((caracter) => caracter.charCodeAt(0)));
}

export function esIphoneSinInstalar(): boolean {
  if (typeof navigator === "undefined") return false;
  const esIphone = /iPhone|iPad/.test(navigator.userAgent);
  const esStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return esIphone && !esStandalone;
}

export function soportaPush(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}
