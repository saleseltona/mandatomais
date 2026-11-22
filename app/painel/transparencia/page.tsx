import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toggleMandateActionVisibilityAction } from "@/app/painel/transparencia/actions";
import { CopyLinkButton } from "@/components/panel/copy-link-button";
import { CreateMandateActionForm } from "@/components/panel/create-mandate-action-form";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import type { MandateAction } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Transparência | Mandato+",
  description: "Registre entregas e ações do mandato para prestação de contas.",
};

export default async function TransparenciaPainelPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadAuthenticatedMembership(params.escopo);

  let actions: MandateAction[] = [];
  if (ctx.tenant) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("mandate_actions")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .order("action_date", { ascending: false })
      .limit(50);
    actions = (data as MandateAction[] | null) ?? [];
  }

  const publicPath = ctx.tenant ? `/transparencia/${ctx.tenant.slug}` : "";

  return (
    <PanelShell
      tenant={ctx.tenant}
      allMemberships={ctx.allMemberships}
      userEmail={ctx.userEmail}
      userProfile={ctx.userProfile}
      activeScope={ctx.activeScope}
      activeTab="transparencia"
    >
      {!ctx.tenant ? (
        <OnboardingTenantForm />
      ) : (
        <div className="space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
                Transparência
              </h1>
              <p className="mt-0.5 text-sm text-ink-secondary">
                Prestação de contas e ações realizadas pelo mandato.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <CopyLinkButton path={publicPath} />
              <Link
                href={publicPath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-navy px-3.5 text-xs font-medium text-white hover:bg-brand-navy-hover"
              >
                <span>Ver página pública</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </header>

          <div className="grid gap-7 lg:grid-cols-12 lg:items-start">
            <section className="lg:col-span-7">
              {actions.length === 0 ? (
                <div className="rounded-2xl border border-border-subtle bg-white p-6">
                  <p className="text-sm font-medium text-ink-primary">
                    Nenhuma ação registrada ainda.
                  </p>
                  <p className="mt-1 text-xs text-ink-secondary">
                    Publique entregas do mandato para disponibilizar na página
                    pública de transparência.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border-subtle/70 rounded-2xl border border-border-subtle bg-white">
                  {actions.map((act) => (
                    <li key={act.id} className="space-y-2 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-ink-muted tabular-nums">
                            {act.action_date.split("-").reverse().join("/")}
                            {act.category ? ` · ${act.category}` : ""}
                            {act.neighborhood ? ` · ${act.neighborhood}` : ""}
                          </p>
                          <h2 className="mt-0.5 text-sm font-semibold text-ink-primary">
                            {act.title}
                          </h2>
                        </div>

                        {ctx.canManageLinks ? (
                          <form action={toggleMandateActionVisibilityAction}>
                            <input
                              type="hidden"
                              name="actionId"
                              value={act.id}
                            />
                            <input
                              type="hidden"
                              name="nextPublic"
                              value={String(!act.is_public)}
                            />
                            <button
                              type="submit"
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                act.is_public
                                  ? "bg-brand-emerald-soft text-brand-emerald"
                                  : "bg-surface-muted text-ink-muted"
                              }`}
                            >
                              {act.is_public ? "Pública" : "Interna"}
                            </button>
                          </form>
                        ) : null}
                      </div>

                      <p className="text-xs leading-relaxed text-ink-secondary">
                        {act.summary}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {ctx.canManageLinks ? (
              <section className="rounded-2xl border border-border-subtle bg-white p-5 lg:col-span-5">
                <h2 className="text-sm font-semibold text-ink-primary">
                  Registrar nova ação
                </h2>
                <div className="mt-4">
                  <CreateMandateActionForm
                    defaultCity={ctx.tenant.city ?? ""}
                  />
                </div>
              </section>
            ) : null}
          </div>
        </div>
      )}
    </PanelShell>
  );
}
