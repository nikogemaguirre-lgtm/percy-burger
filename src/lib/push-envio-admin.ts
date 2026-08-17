import { createSupabaseServiceClient } from "./supabase/service";

export interface SuscripcionPush {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function obtenerSuscripciones(): Promise<SuscripcionPush[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (error) throw new Error(`No se pudieron obtener las suscripciones: ${error.message}`);
  return data as SuscripcionPush[];
}

export async function eliminarSuscripciones(endpoints: string[]): Promise<void> {
  if (endpoints.length === 0) return;
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("push_subscriptions").delete().in("endpoint", endpoints);
  if (error) throw new Error(`No se pudieron eliminar las suscripciones vencidas: ${error.message}`);
}
