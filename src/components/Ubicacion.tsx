import { NUMERO_WHATSAPP_PERCY } from "@/lib/whatsapp";

const DIRECCION = "Falucho 440, Dorrego, Guaymallén";
const MAPS_EMBED_SRC = `https://maps.google.com/maps?q=${encodeURIComponent(
  `Percy Burger, ${DIRECCION}, Mendoza`
)}&output=embed`;

export function Ubicacion() {
  return (
    <section className="bg-brand-black text-white">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 sm:items-center">
        <div>
          <h2 className="mb-4 text-2xl font-bold">Dónde estamos</h2>
          <p className="mb-4 text-white/80">{DIRECCION}</p>
          <a
            href={`https://wa.me/${NUMERO_WHATSAPP_PERCY}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-brand-orange px-6 py-2 font-semibold text-brand-black transition hover:bg-brand-orange-burnt"
          >
            Escribinos por WhatsApp
          </a>
        </div>
        <iframe
          src={MAPS_EMBED_SRC}
          title="Ubicación de Percy Burger en el mapa"
          className="h-64 w-full rounded-lg border-0 sm:h-72"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
