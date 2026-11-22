import Link from "next/link";
import { buttonLinkClassName } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-brand-navy"
        >
          Mandato<span className="text-brand-emerald">+</span>
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-7 text-sm text-ink-secondary md:flex"
        >
          <a href="#recursos" className="transition-colors hover:text-ink-primary">
            Recursos
          </a>
          <a href="#como-funciona" className="transition-colors hover:text-ink-primary">
            Como funciona
          </a>
          <a href="#lgpd-seguranca" className="transition-colors hover:text-ink-primary">
            Privacidade
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/entrar" className={buttonLinkClassName("ghost", "sm")}>
            Entrar
          </Link>
          <Link
            href="/criar-conta"
            className={buttonLinkClassName("secondary", "sm")}
          >
            Criar conta
          </Link>
        </div>
      </div>
    </header>
  );
}
