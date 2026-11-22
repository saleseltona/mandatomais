import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import type { TenantIntegration } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Instagram | Mandato+",
  description:
    "Escopo realista de integração oficial Meta, importação de arquivos e campo voluntário.",
};

export default async function InstagramPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadAuthenticatedMembership(params.escopo);
  const scopeQuery = `?escopo=${ctx.activeScope}`;

  const metaOAuthConfigured = Boolean(
    process.env.META_APP_ID && process.env.META_APP_SECRET
  );

  let integration: TenantIntegration | null = null;
  if (ctx.tenant) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("tenant_integrations")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("provider", "instagram_official")
      .maybeSingle();
    integration = (data as TenantIntegration | null) ?? null;
  }

  return (
    <PanelShell
      tenant={ctx.tenant}
      userEmail={ctx.userEmail}
      userProfile={ctx.userProfile}
      activeScope={ctx.activeScope}
      activeTab="configuracoes"
    >
      {!ctx.tenant ? (
        <OnboardingTenantForm />
      ) : (
        <div className="space-y-6">
          <Link
            href={`/painel/configuracoes${scopeQuery}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Configurações</span>
          </Link>

          <header>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
              Instagram
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Três formas transparentes e compatíveis com as políticas da Meta e
              com a LGPD.
            </p>
          </header>

          {/* A. Integração oficial */}
          <section className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-ink-primary">
                A. Integração oficial (Meta API)
              </h2>
              <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
                {integration?.status === "connected"
                  ? `Conectado (${integration.account_handle ?? "conta oficial"})`
                  : metaOAuthConfigured
                    ? "Pronto para conectar"
                    : "Aguardando credenciais Meta"}
              </span>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              A API oficial da Meta permite conectar contas profissionais do
              Instagram via OAuth oficial para consultar metadados autorizados
              da conta e interações permitidas.{" "}
              <strong className="font-medium text-ink-primary">
                A API da Meta não fornece a lista completa de seguidores.
              </strong>
            </p>

            <ul className="mt-3 space-y-1 text-xs text-ink-secondary">
              <li>• Nunca solicitamos senha do Instagram, cookies ou sessão.</li>
              <li>• Não realizamos scraping nem contorno de restrições.</li>
              <li>
                • Seguir um perfil não comprova consentimento nem apoio político.
              </li>
            </ul>

            {!metaOAuthConfigured ? (
              <div className="mt-4 rounded-xl bg-canvas p-3.5 text-xs text-ink-secondary">
                Para habilitar o botão de conexão OAuth oficial, configure{" "}
                <code>META_APP_ID</code> e <code>META_APP_SECRET</code> de um
                aplicativo aprovado na Meta for Developers.
              </div>
            ) : null}
          </section>

          {/* B. Importação por arquivo */}
          <section className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6">
            <h2 className="text-base font-semibold text-ink-primary">
              B. Importação por arquivo
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
              Você pode importar arquivos CSV ou XLSX legitimamente obtidos pelo
              responsável. O sistema inspeciona exatamente quais colunas existem
              no arquivo, não presume telefone ou e-mail e preserva a origem dos
              registros sem marcá-los como consentidos automaticamente.
            </p>
            <div className="mt-4">
              <Link
                href={`/painel/configuracoes/importacao${scopeQuery}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-navy px-4 text-xs font-medium text-white hover:bg-brand-navy-hover"
              >
                <span>Ir para Central de Importação</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </section>

          {/* C. Cadastro voluntário */}
          <section className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-ink-primary">
                C. Cadastro voluntário no formulário público
              </h2>
              <span className="rounded-full bg-brand-emerald-soft px-2.5 py-0.5 text-xs font-medium text-brand-emerald">
                Ativo nos links
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
              O formulário público já inclui o campo opcional{" "}
              <strong className="font-medium text-ink-primary">
                @Instagram
              </strong>{" "}
              com explicação clara de finalidade. A pessoa só informa se quiser,
              e o dado fica vinculado ao consentimento explícito registrado.
            </p>
          </section>
        </div>
      )}
    </PanelShell>
  );
}
