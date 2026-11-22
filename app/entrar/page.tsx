import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Entrar | Mandato+",
  description: "Acesse sua conta do Mandato+.",
};

export default function EntrarPage() {
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
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary transition-colors hover:text-ink-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            <span>Início</span>
          </Link>
        </div>
      </header>

      <main
        id="conteudo-principal"
        className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6"
      >
        <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-white p-6 sm:p-7">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-ink-primary">
              Entrar no Mandato+
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Acesse o painel do seu gabinete.
            </p>
          </div>

          {!supabaseReady ? (
            <div
              role="status"
              className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900"
            >
              Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> em{" "}
              <code>.env.local</code> para habilitar o login.
            </div>
          ) : null}

          <LoginForm disabled={!supabaseReady} />

          <p className="mt-5 border-t border-border-subtle pt-4 text-center text-xs text-ink-secondary">
            Ainda não tem conta?{" "}
            <Link
              href="/criar-conta"
              className="font-medium text-brand-navy hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
