import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateSurveyForm } from "@/components/panel/create-survey-form";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";

export const metadata: Metadata = {
  title: "Nova Pesquisa de Percepção | Mandato+",
  description:
    "Crie uma nova pesquisa de percepção e avaliação do mandato com coleta consentida.",
};

export default async function NovaPesquisaPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadAuthenticatedMembership(params.escopo);

  return (
    <PanelShell
      tenant={ctx.tenant}
      allMemberships={ctx.allMemberships}
      userEmail={ctx.userEmail}
      userProfile={ctx.userProfile}
      activeScope={ctx.activeScope}
      activeTab="pesquisas"
    >
      {!ctx.tenant ? (
        <OnboardingTenantForm />
      ) : !ctx.canManageLinks ? (
        <div className="rounded-2xl border border-border-subtle bg-white p-6">
          <p className="text-sm font-semibold text-ink-primary">
            Permissão restrita
          </p>
          <p className="mt-1 text-xs text-ink-secondary">
            Apenas proprietários e administradores podem criar novas pesquisas.
          </p>
          <Link
            href={`/painel/pesquisas?escopo=${ctx.activeScope}`}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-navy hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para pesquisas
          </Link>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          <header className="space-y-2">
            <Link
              href={`/painel/pesquisas?escopo=${ctx.activeScope}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary transition-colors hover:text-ink-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para pesquisas
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
                Nova Pesquisa de Percepção
              </h1>
              <p className="mt-0.5 text-sm text-ink-secondary">
                Configure o formulário público de escuta. Respostas anônimas são sempre permitidas.
              </p>
            </div>
          </header>

          <CreateSurveyForm
            activeScope={ctx.activeScope}
            defaultCity={ctx.tenant.city ?? ""}
          />
        </div>
      )}
    </PanelShell>
  );
}
