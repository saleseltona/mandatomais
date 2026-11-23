import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  ClipboardList,
  Download,
  ExternalLink,
  MessageSquareText,
  Plus,
} from "lucide-react";
import { updateSurveyStatusAction } from "@/app/painel/pesquisas/actions";
import { CopyLinkButton } from "@/components/panel/copy-link-button";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { ShareLinkButton } from "@/components/panel/share-link-button";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import {
  SURVEY_STATUS_LABELS,
  type SurveyRecord,
  type SurveyStatus,
} from "@/lib/utils/surveys";

export const metadata: Metadata = {
  title: "Pesquisas de Percepção | Mandato+",
  description:
    "Ouça a população de forma consentida e estruturada para orientar as ações do mandato.",
};

const STATUS_BADGE_CLASS: Record<SurveyStatus, string> = {
  active: "bg-brand-emerald-soft text-brand-emerald",
  draft: "bg-surface-muted text-ink-secondary",
  paused: "bg-amber-50 text-amber-700",
  closed: "bg-surface-muted text-ink-muted",
};

export default async function PesquisasPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadAuthenticatedMembership(params.escopo);
  const scopeLabel = ctx.activeScope === "mandate" ? "Mandato" : "Campanha";

  let surveys: SurveyRecord[] = [];
  const countsBySurvey = new Map<
    string,
    { total: number; anonymous: number; identified: number }
  >();

  if (ctx.tenant) {
    const supabase = await createClient();
    const { data: surveyRows } = await supabase
      .from("surveys")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("data_scope", ctx.activeScope)
      .order("created_at", { ascending: false });

    surveys = (surveyRows ?? []) as SurveyRecord[];

    if (surveys.length > 0) {
      const surveyIds = surveys.map((s) => s.id);
      const { data: responseRows } = await supabase
        .from("survey_responses")
        .select("survey_id, is_anonymous")
        .eq("tenant_id", ctx.tenant.id)
        .in("survey_id", surveyIds);

      for (const row of responseRows ?? []) {
        const current = countsBySurvey.get(row.survey_id) ?? {
          total: 0,
          anonymous: 0,
          identified: 0,
        };
        current.total += 1;
        if (row.is_anonymous) current.anonymous += 1;
        else current.identified += 1;
        countsBySurvey.set(row.survey_id, current);
      }
    }
  }

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
      ) : (
        <div className="space-y-7">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
                Pesquisas de Percepção
              </h1>
              <p className="mt-0.5 text-sm text-ink-secondary">
                Escuta estruturada, voluntária e anônima quando o cidadão preferir · {scopeLabel}
              </p>
            </div>

            {ctx.canManageLinks ? (
              <Link
                href={`/painel/pesquisas/nova?escopo=${ctx.activeScope}`}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Nova pesquisa
              </Link>
            ) : null}
          </header>

          {surveys.length === 0 ? (
            <div className="rounded-2xl border border-border-subtle bg-white p-8 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted text-ink-secondary">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-base font-semibold text-ink-primary">
                Nenhuma pesquisa criada neste ambiente
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-secondary">
                Crie sua primeira Pesquisa de Percepção para ouvir a avaliação da população, identificar prioridades nos bairros e transformar sugestões em ações do mandato.
              </p>
              {ctx.canManageLinks ? (
                <div className="mt-5">
                  <Link
                    href={`/painel/pesquisas/nova?escopo=${ctx.activeScope}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    Criar primeira pesquisa
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-4">
              {surveys.map((survey) => {
                const publicPath = `/pesquisa/${survey.slug}`;
                const counts = countsBySurvey.get(survey.id) ?? {
                  total: 0,
                  anonymous: 0,
                  identified: 0,
                };

                return (
                  <li
                    key={survey.id}
                    className="space-y-4 rounded-2xl border border-border-subtle bg-white p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-ink-primary">
                            {survey.title}
                          </h2>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASS[survey.status]}`}
                          >
                            {SURVEY_STATUS_LABELS[survey.status]}
                          </span>
                        </div>
                        {survey.description ? (
                          <p className="text-xs text-ink-secondary">
                            {survey.description}
                          </p>
                        ) : null}
                        <p className="font-mono text-xs text-ink-muted">
                          {publicPath}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-xl font-semibold tabular-nums text-ink-primary">
                            {counts.total}
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            {counts.total === 1 ? "resposta" : "respostas"} (
                            {counts.anonymous} anôn. · {counts.identified} ident.)
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle/70 pt-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/painel/pesquisas/${survey.id}/resultados?escopo=${ctx.activeScope}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-navy px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          Resultados
                        </Link>
                        <Link
                          href={`/painel/pesquisas/${survey.id}/analise?escopo=${ctx.activeScope}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
                        >
                          <MessageSquareText className="h-3.5 w-3.5" />
                          Análise qualitativa
                        </Link>
                        <a
                          href={`/painel/pesquisas/${survey.id}/exportar`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary"
                        >
                          <Download className="h-3.5 w-3.5" />
                          CSV
                        </a>
                        <CopyLinkButton path={publicPath} />
                        <ShareLinkButton
                          path={publicPath}
                          tenantName={ctx.tenant!.name}
                          variant="light"
                        />
                        <Link
                          href={publicPath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary"
                        >
                          Abrir
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>

                      {ctx.canManageLinks ? (
                        <div className="flex items-center gap-1.5">
                          {survey.status !== "active" ? (
                            <form action={updateSurveyStatusAction}>
                              <input
                                type="hidden"
                                name="surveyId"
                                value={survey.id}
                              />
                              <input
                                type="hidden"
                                name="dataScope"
                                value={ctx.activeScope}
                              />
                              <input
                                type="hidden"
                                name="nextStatus"
                                value="active"
                              />
                              <button
                                type="submit"
                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-emerald transition-colors hover:bg-brand-emerald-soft"
                              >
                                Ativar
                              </button>
                            </form>
                          ) : (
                            <form action={updateSurveyStatusAction}>
                              <input
                                type="hidden"
                                name="surveyId"
                                value={survey.id}
                              />
                              <input
                                type="hidden"
                                name="dataScope"
                                value={ctx.activeScope}
                              />
                              <input
                                type="hidden"
                                name="nextStatus"
                                value="paused"
                              />
                              <button
                                type="submit"
                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50"
                              >
                                Pausar
                              </button>
                            </form>
                          )}

                          {survey.status !== "closed" ? (
                            <form action={updateSurveyStatusAction}>
                              <input
                                type="hidden"
                                name="surveyId"
                                value={survey.id}
                              />
                              <input
                                type="hidden"
                                name="dataScope"
                                value={ctx.activeScope}
                              />
                              <input
                                type="hidden"
                                name="nextStatus"
                                value="closed"
                              />
                              <button
                                type="submit"
                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary"
                              >
                                Encerrar
                              </button>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </PanelShell>
  );
}
