import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("./supabase/service", () => ({
  createSupabaseServiceClient: () => ({ from: mockFrom }),
}));

import { obtenerSuscripciones, eliminarSuscripciones } from "./push-envio-admin";

beforeEach(() => {
  mockFrom.mockReset();
});

describe("obtenerSuscripciones", () => {
  it("trae endpoint, p256dh y auth de todas las suscripciones", async () => {
    const select = vi.fn().mockResolvedValue({
      data: [{ endpoint: "e1", p256dh: "p1", auth: "a1" }],
      error: null,
    });
    mockFrom.mockReturnValue({ select });

    const resultado = await obtenerSuscripciones();

    expect(mockFrom).toHaveBeenCalledWith("push_subscriptions");
    expect(select).toHaveBeenCalledWith("endpoint, p256dh, auth");
    expect(resultado).toEqual([{ endpoint: "e1", p256dh: "p1", auth: "a1" }]);
  });
});

describe("eliminarSuscripciones", () => {
  it("borra las suscripciones por endpoint", async () => {
    const in_ = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn(() => ({ in: in_ }));
    mockFrom.mockReturnValue({ delete: del });

    await eliminarSuscripciones(["e1", "e2"]);

    expect(mockFrom).toHaveBeenCalledWith("push_subscriptions");
    expect(in_).toHaveBeenCalledWith("endpoint", ["e1", "e2"]);
  });

  it("no llama a Supabase si la lista está vacía", async () => {
    await eliminarSuscripciones([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
