import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { obtenerSuscripciones, eliminarSuscripciones } from "@/lib/push-envio-admin";
import { armarPayloadPush, endpointsInvalidos, type ResultadoEnvioPush } from "@/lib/push-mapeo";

export const runtime = "nodejs";

webpush.setVapidDetails(
  "mailto:nikogem.aguirre@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(request: NextRequest) {
  const secreto = request.headers.get("x-webhook-secret");
  if (secreto !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const pedido = body?.record;
  const total = Number(pedido?.total);
  if (!pedido?.cliente_nombre || Number.isNaN(total)) {
    return NextResponse.json({ error: "Payload de pedido inválido" }, { status: 400 });
  }

  const payload = armarPayloadPush({ clienteNombre: pedido.cliente_nombre, total });
  const suscripciones = await obtenerSuscripciones();

  const resultados: ResultadoEnvioPush[] = await Promise.all(
    suscripciones.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        return { endpoint: sub.endpoint, statusCode: null };
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode ?? null;
        return { endpoint: sub.endpoint, statusCode };
      }
    }),
  );

  const vencidos = endpointsInvalidos(resultados);
  await eliminarSuscripciones(vencidos);

  return NextResponse.json({ enviados: suscripciones.length - vencidos.length, eliminados: vencidos.length });
}
