import type { Metadata } from "next";
import Link from "next/link";
import { SignupTimelineForm } from "@/components/auth/signup-timeline-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Criar conta | Mandato+",
  description:
    "Crie sua conta pessoal e configure os detalhes do seu mandato no Mandato+.",
};

export default function CriarContaPage() {
  const supabaseReady = isSupabaseConfigured();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-border-subtle bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-brand-navy"
          >
            Mandato<span className="text-brand-emerald">+</span>
          </Link>

          <Link
            href="/entrar"
            className="text-xs font-medium text-ink-secondary transition-colors hover:text-ink-primary"
          >
            Já tem conta? <span className="text-brand-navy">Entrar</span>
          </Link>
        </div>
      </header>

      <main
        id="conteudo-principal"
        className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-14"
      >
        <div className="w-full max-w-xl">
          {!supabaseReady ? (
            <div
              role="status"
              className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900"
            >
              Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> em{" "}
              <code>.env.local</code> para habilitar o cadastro de contas.
            </div>
          ) : null}

          <SignupTimelineForm disabled={!supabaseReady} />
        </div>
      </main>
    </div>
  );
}
