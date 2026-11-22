import type * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  PublicRegistrationForm,
  type PublicInterestOption,
} from "@/components/public/public-registration-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { DataScope } from "@/lib/types/database";
import { buildTenantThemeStyle } from "@/lib/utils/branding";

export const metadata: Metadata = {
  title: "Cadastro | Mandato+",
  description:
    "Cadastre-se voluntariamente com consentimento explícito e opção de descadastro a qualquer momento.",
};

interface PublicLinkDetails {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  data_scope: DataScope;
  tenant_name: string;
  office_title: string | null;
  tenant_city: string | null;
  tenant_state: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  logo_url?: string | null;
  avatar_url?: string | null;
  interests: PublicInterestOption[];
}

export default async function CadastroPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let linkDetails: PublicLinkDetails | null = null;
  const supabaseReady = isSupabaseConfigured();

  if (supabaseReady) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_public_registration_link", {
      p_slug: slug,
    });
    if (data) {
      linkDetails = data as PublicLinkDetails;
    }
  }

  const themeStyle = buildTenantThemeStyle(
    linkDetails?.primary_color,
    linkDetails?.accent_color
  );

  return (
    <div
      style={themeStyle as React.CSSProperties}
      className="flex min-h-screen flex-col bg-canvas"
    >
      <header className="border-b border-border-subtle bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-brand-navy"
          >
            Mandato<span className="text-brand-emerald">+</span>
          </Link>
          <span className="text-xs text-ink-muted">Cadastro voluntário</span>
        </div>
      </header>

      <main
        id="conteudo-principal"
        className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-12"
      >
        {!supabaseReady ? (
          <div className="rounded-2xl border border-border-subtle bg-white p-6">
            <h1 className="text-lg font-semibold text-ink-primary">
              Ambiente não configurado
            </h1>
            <p className="mt-1.5 text-sm text-ink-secondary">
              Configure as variáveis do Supabase em <code>.env.local</code> para
              ativar este link.
            </p>
          </div>
        ) : !linkDetails ? (
          <div className="rounded-2xl border border-border-subtle bg-white p-6">
            <h1 className="text-lg font-semibold text-ink-primary">
              Link indisponível
            </h1>
            <p className="mt-1.5 text-sm text-ink-secondary">
              Este endereço não foi encontrado ou foi pausado.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-8">
            <div className="mb-6 border-b border-border-subtle pb-5">
              <p className="text-xs font-medium text-ink-muted">
                {linkDetails.data_scope === "mandate" ? "Mandato" : "Campanha"}
                {linkDetails.office_title ? ` · ${linkDetails.office_title}` : ""}
              </p>

              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink-primary">
                {linkDetails.title}
              </h1>
              <p className="mt-1 text-sm font-medium text-brand-navy">
                {linkDetails.tenant_name}
                {linkDetails.tenant_city
                  ? ` · ${linkDetails.tenant_city}${
                      linkDetails.tenant_state
                        ? `/${linkDetails.tenant_state}`
                        : ""
                    }`
                  : ""}
              </p>

              {linkDetails.description ? (
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {linkDetails.description}
                </p>
              ) : null}
            </div>

            <PublicRegistrationForm
              slug={linkDetails.slug}
              tenantName={linkDetails.tenant_name}
              interests={linkDetails.interests ?? []}
            />
          </div>
        )}
      </main>
    </div>
  );
}
