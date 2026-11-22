import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AssistedRegistrationForm } from "@/components/panel/assisted-registration-form";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { loadPanelSummary } from "@/lib/supabase/panel-data";

export const metadata: Metadata = {
  title: "Novo apoiador | Mandato+",
  description:
    "Cadastro presencial assistido com registro explícito de consentimento.",
};

export default async function NovoApoiadorPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadPanelSummary(params.escopo);
  const scopeLabel = ctx.activeScope === "mandate" ? "Mandato" : "Campanha";

  return (
    <PanelShell
      tenant={ctx.tenant}
      userEmail={ctx.userEmail}
      activeScope={ctx.activeScope}
      activeTab="base"
    >
      {!ctx.tenant ? (
        <OnboardingTenantForm />
      ) : (
        <div className="mx-auto max-w-xl space-y-6">
          <Link
            href={`/painel/base?escopo=${ctx.activeScope}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary transition-colors hover:text-ink-primary"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Voltar para a base</span>
          </Link>

          <section className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-7">
            <p className="text-xs font-medium text-ink-muted">
              Atendimento presencial · {scopeLabel}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink-primary">
              Novo apoiador
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Cadastre um apoiador mediante autorização explícita registrada no
              ato do atendimento.
            </p>

            <div className="mt-6">
              <AssistedRegistrationForm
                dataScope={ctx.activeScope}
                interests={ctx.interests}
              />
            </div>
          </section>
        </div>
      )}
    </PanelShell>
  );
}
