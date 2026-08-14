import Link from "next/link";
import { logoCompletoUrl } from "@/data/logoPiezas";

export function Header() {
  return (
    <header className="border-b border-brand-black/10 bg-brand-black">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 px-4 py-3">
        <Link href="/">
          <img src={logoCompletoUrl} alt="Percy Burger" className="h-12 w-auto" />
        </Link>
        <span className="hidden text-sm text-white/70 sm:block">Falucho 440, Dorrego, Guaymallén</span>
      </div>
    </header>
  );
}
