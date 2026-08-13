import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-brand-black/10 bg-brand-black">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-extrabold text-brand-yellow">
          Percy Burger
        </Link>
        <span className="hidden text-sm text-white/70 sm:block">Falucho 440, Dorrego, Guaymallén</span>
      </div>
    </header>
  );
}
