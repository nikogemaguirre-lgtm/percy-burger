"use client";

export default function ErrorGlobal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-lg text-brand-black/70">No pudimos cargar el menú. Probá de nuevo.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-brand-red px-4 py-2 font-semibold text-white"
      >
        Reintentar
      </button>
    </main>
  );
}
