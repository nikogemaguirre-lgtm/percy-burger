import { logoCompletoUrl } from "@/data/logoPiezas";

const SIN_FOTO = "/placeholder.svg";

export function ImagenProducto({ src, nombre }: { src: string; nombre: string }) {
  if (src === SIN_FOTO) {
    return (
      <div className="mb-3 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-md bg-brand-black">
        <img src={logoCompletoUrl} alt="" aria-hidden="true" className="h-10 w-auto opacity-90" />
        <span className="px-2 text-center text-sm font-semibold text-brand-yellow">{nombre}</span>
      </div>
    );
  }

  return <img src={src} alt={nombre} className="mb-3 h-40 w-full rounded-md object-cover" />;
}
