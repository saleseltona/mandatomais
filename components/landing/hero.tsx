import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonLinkClassName } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="bg-brand-navy text-white">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-white/70">
            Relacionamento político consentido
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.12]">
            Organize a base do seu mandato com clareza e consentimento.
          </h1>

          <p className="mt-5 text-base leading-relaxed text-white/75 sm:text-lg">
            Crie um link público de cadastro, organize apoiadores por cidade,
            bairro e interesse e acompanhe os aniversariantes do dia — sem
            disparo em massa e com respeito à privacidade.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/entrar"
              className={buttonLinkClassName("primary", "lg", "w-full sm:w-auto")}
            >
              <span>Acessar painel</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-white/10 px-5 text-sm font-medium text-white transition-colors hover:bg-white/15 sm:w-auto"
            >
              Ver como funciona
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
