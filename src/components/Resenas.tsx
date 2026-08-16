import { resenas } from "@/data/resenas";

const LINK_GOOGLE_MAPS =
  "https://www.google.com/maps/search/Percy+Burger+Falucho+440+Guaymallén+Mendoza";

export function Resenas() {
  return (
    <section className="mx-auto mb-10 max-w-5xl px-4">
      <h2 className="mb-2 text-2xl font-bold text-brand-black">
        Lo que dicen nuestros clientes
      </h2>
      <a
        href={LINK_GOOGLE_MAPS}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 inline-block text-sm font-semibold text-brand-orange-burnt underline"
      >
        4.9★ · +79 reseñas en Google
      </a>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resenas.map((reseña) => (
          <div
            key={reseña.id}
            className="flex flex-col rounded-lg border border-brand-black/10 bg-white p-4 shadow-sm"
          >
            <p className="mb-2 font-semibold text-brand-black">{reseña.autor}</p>
            <p className="mb-3 flex-1 text-sm text-brand-black/70">{reseña.texto}</p>
            <p className="text-xs text-brand-black/50">{reseña.antiguedad}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
