import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("./supabase/server", () => ({
  createSupabaseServerClient: async () => ({ from: mockFrom }),
}));

import { guardarSuscripcion } from "./push-admin";

beforeEach(() => {
  mockFrom.mockReset();
});

describe("guardarSuscripcion", () => {
  it("hace upsert de la suscripción por endpoint", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert });

    await guardarSuscripcion({ endpoint: "https://ejemplo.com/push/1", p256dh: "clave-p256dh", auth: "clave-auth" });

    expect(mockFrom).toHaveBeenCalledWith("push_subscriptions");
    expect(upsert).toHaveBeenCalledWith(
      { endpoint: "https://ejemplo.com/push/1", p256dh: "clave-p256dh", auth: "clave-auth" },
      { onConflict: "endpoint" },
    );
  });

  it("lanza un error legible si Supabase falla", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: "boom" } });
    mockFrom.mockReturnValue({ upsert });

    await expect(guardarSuscripcion({ endpoint: "e", p256dh: "p", auth: "a" })).rejects.toThrow(
      "No se pudo guardar la suscripción: boom",
    );
  });
});
