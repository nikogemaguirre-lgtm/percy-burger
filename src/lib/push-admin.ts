import { createSupabaseServerClient } from "./supabase/server";
import type { SuscripcionPush } from "./push-envio-admin";

export type { SuscripcionPush };

export async function guardarSuscripcion(sub: SuscripcionPush): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, { onConflict: "endpoint" });
  if (error) throw new Error(`No se pudo guardar la suscripción: ${error.message}`);
}
