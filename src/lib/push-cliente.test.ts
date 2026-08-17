import { describe, it, expect, vi, afterEach } from "vitest";
import { convertirClaveVapid, esIphoneSinInstalar, soportaPush } from "./push-cliente";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("convertirClaveVapid", () => {
  it("convierte una clave base64url a Uint8Array", () => {
    // "AAECAw" en base64url decodifica a los bytes [0, 1, 2, 3]
    expect(convertirClaveVapid("AAECAw")).toEqual(new Uint8Array([0, 1, 2, 3]));
  });
});

describe("esIphoneSinInstalar", () => {
  it("devuelve true en iPhone Safari sin instalar como PWA", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      standalone: false,
    });
    expect(esIphoneSinInstalar()).toBe(true);
  });

  it("devuelve false si ya está instalado como PWA", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      standalone: true,
    });
    expect(esIphoneSinInstalar()).toBe(false);
  });

  it("devuelve false en Android", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 14)", standalone: false });
    expect(esIphoneSinInstalar()).toBe(false);
  });
});

describe("soportaPush", () => {
  it("devuelve true si el navegador tiene serviceWorker y PushManager", () => {
    vi.stubGlobal("navigator", { serviceWorker: {} });
    vi.stubGlobal("window", { PushManager: class {} });
    expect(soportaPush()).toBe(true);
  });

  it("devuelve false si falta PushManager", () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("window", {});
    expect(soportaPush()).toBe(false);
  });
});
