import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  MessageSquareText,
} from "lucide-react";
import { CopyLinkButton } from "@/components/panel/copy-link-button";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { SurveyResultsActions } from "@/components/panel/survey-results-actions";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import {
  aggregateSurveyResults,
  SURVEY_STATUS_LABELS,
  type SurveyRecord,
  type SurveyResponseRecord,
} from "@/lib/utils/surveys";

export const metadata: Metadata = {
  title: "Resultados da Pesquisa | Mandato+",
  description:
    "Painel consolidado de avaliações, áreas prioritárias e percepção da população.",
};

export default async function PesquisaResultadosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    escopo?: string;
    cidade?: string;
    bairro?: string;
    tipo?: string;
    de?: string;
    ate?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const ctx = await loadAuthenticatedMembership(query.escopo);

  if (!ctx.tenant) {
    return (
      <PanelShell
        tenant={null}
        allMemberships={ctx.allMemberships}
        userEmail={ctx.userEmail}
        userProfile={ctx.userProfile}
        activeScope={ctx.activeScope}
        activeTab="pesquisas"
      >
        <OnboardingTenantForm />
      </PanelShell>
    );
  }

  const supabase = await createClient();
  const { data: surveyRow } = await supabase
    .from("surveys")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();

  if (!surveyRow) notFound();
  const survey = surveyRow as SurveyRecord;

  const { data: allRows } = await supabase
    .from("survey_responses")
    .select("*")
    .eq("survey_id", survey.id)
    .eq("tenant_id", ctx.tenant.id)
    .order("created_at", { ascending: false });

  const allResponses = (allRows ?? []) as SurveyResponseRecord[];

  const cities = Array.from(
    new Set(allResponses.map((r) => r.city).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const neighborhoods = Array.from(
    new Set(
      allResponses
        .filter((r) => !query.cidade || r.city === query.cidade)
        .map((r) => r.neighborhood)
        .filter(Boolean) as string[]
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const filtered = allResponses.filter((r) => {
    if (query.cidade && r.city !== query.cidade) return false;
    if (query.bairro && r.neighborhood !== query.bairro) return false;
    if (query.tipo === "anonima" && !r.is_anonymous) return false;
    if (query.tipo === "identificada" && r.is_anonymous) return false;
    if (query.de && r.created_at.slice(0, 10) < query.de) return false;
    if (query.ate && r.created_at.slice(0, 10) > query.ate) return false;
    return true;
  });

  const periodLabel =
    query.de || query.ate
      ? `${query.de || "início"} a ${query.ate || "hoje"}`
      : undefined;

  const agg = aggregateSurveyResults(filtered, periodLabel);
  const optInCount = filtered.filter(
    (r) => r.wants_updates && r.communication_consent_granted
  ).length;

  const openSuggestions = filtered
    .filter(
      (r) =>
        r.main_neighborhood_need || r.most_valued_action || r.what_to_improve
    )
    .slice(0, 10);

  return (
    <PanelShell
      tenant={ctx.tenant}
      allMemberships={ctx.allMemberships}
      userEmail={ctx.userEmail}
      userProfile={ctx.userProfile}
      activeScope={ctx.activeScope}
      activeTab="pesquisas"
    >
      <div className="space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <Link
              href={`/painel/pesquisas?escopo=${ctx.activeScope}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary transition-colors hover:text-ink-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para pesquisas
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <CopyLinkButton path={`/pesquisa/${survey.slug}`} />
              <Link
                href={`/painel/pesquisas/${survey.id}/analise?escopo=${ctx.activeScope}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
              >
                <MessageSquareText className="h-3.5 w-3.5" />
                Análise qualitativa
              </Link>
              <a
                href={`/painel/pesquisas/${survey.id}/exportar`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </a>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
                {survey.title}
              </h1>
              <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
                {SURVEY_STATUS_LABELS[survey.status]}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-ink-secondary">
              Resultados consolidados e anonimizados ·{" "}
              <span className="font-mono text-xs">/pesquisa/{survey.slug}</span>
            </p>
          </div>
        </header>

        {/* Filtros */}
        <form
          method="get"
          className="grid gap-3 rounded-2xl border border-border-subtle bg-white p-4 sm:grid-cols-2 lg:grid-cols-6 print:hidden"
        >
          <input type="hidden" name="escopo" value={ctx.activeScope} />
          <div>
            <label className="block text-[11px] font-medium text-ink-muted">
              Município
            </label>
            <select
              name="cidade"
              defaultValue={query.cidade ?? ""}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-2.5 py-1.5 text-xs text-ink-primary"
            >
              <option value="">Todos</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ink-muted">
              Bairro
            </label>
            <select
              name="bairro"
              defaultValue={query.bairro ?? ""}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-2.5 py-1.5 text-xs text-ink-primary"
            >
              <option value="">Todos</option>
              {neighborhoods.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ink-muted">
              Identificação
            </label>
            <select
              name="tipo"
              defaultValue={query.tipo ?? ""}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-2.5 py-1.5 text-xs text-ink-primary"
            >
              <option value="">Todas</option>
              <option value="anonima">Anônimas</option>
              <option value="identificada">Identificadas</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ink-muted">
              De
            </label>
            <input
              type="date"
              name="de"
              defaultValue={query.de ?? ""}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-2.5 py-1.5 text-xs text-ink-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ink-muted">
              Até
            </label>
            <input
              type="date"
              name="ate"
              defaultValue={query.ate ?? ""}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-2.5 py-1.5 text-xs text-ink-primary"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-brand-navy px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              Filtrar
            </button>
            <Link
              href={`/painel/pesquisas/${survey.id}/resultados?escopo=${ctx.activeScope}`}
              className="rounded-xl border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-muted"
            >
              Limpar
            </Link>
          </div>
        </form>

        {/* Ações de relatório e transparência */}
        <SurveyResultsActions
          surveyId={survey.id}
          surveyTitle={survey.title}
          tenantName={ctx.tenant.name}
          totalResponses={agg.totalResponses}
          topStrengths={agg.strengthRanking.map((s) => ({
            label: s.area,
            count: s.count,
          }))}
          topImprovements={agg.improvementRanking.map((s) => ({
            label: s.area,
            count: s.count,
          }))}
          whatsappSummaryText={agg.whatsappSummaryText}
          canPublishTransparency={ctx.canManageLinks}
        />

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border-subtle bg-white p-5">
            <p className="text-xs text-ink-muted">Total de respostas</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-primary">
              {agg.totalResponses}
            </p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-white p-5">
            <p className="text-xs text-ink-muted">Respostas anônimas</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-primary">
              {agg.anonymousCount}
            </p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-white p-5">
            <p className="text-xs text-ink-muted">Respostas identificadas</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-primary">
              {agg.identifiedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-white p-5">
            <p className="text-xs text-ink-muted">Opt-in consentido</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-emerald">
              {optInCount}
            </p>
          </div>
        </div>

        {/* Avaliações */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3 rounded-2xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-primary">
              Avaliação da gestão pública municipal
            </h2>
            <div className="space-y-2.5">
              {agg.managementDistribution.map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-primary">{row.label}</span>
                    <span className="tabular-nums text-ink-secondary">
                      {row.count} ({row.pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-brand-navy"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-primary">
              Avaliação do desempenho do mandato
            </h2>
            <div className="space-y-2.5">
              {agg.mandateDistribution.map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-primary">{row.label}</span>
                    <span className="tabular-nums text-ink-secondary">
                      {row.count} ({row.pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-brand-emerald"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Áreas de acerto x melhoria */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3 rounded-2xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-primary">
              Áreas onde o mandato está acertando
            </h2>
            {agg.strengthRanking.length === 0 ? (
              <p className="text-xs text-ink-muted">Nenhuma citação ainda.</p>
            ) : (
              <ul className="divide-y divide-border-subtle/60">
                {agg.strengthRanking.map((item) => (
                  <li
                    key={item.area}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <span className="text-ink-primary">{item.area}</span>
                    <span className="rounded-full bg-brand-emerald-soft px-2 py-0.5 font-medium tabular-nums text-brand-emerald">
                      {item.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-primary">
              Áreas que precisam melhorar
            </h2>
            {agg.improvementRanking.length === 0 ? (
              <p className="text-xs text-ink-muted">Nenhuma citação ainda.</p>
            ) : (
              <ul className="divide-y divide-border-subtle/60">
                {agg.improvementRanking.map((item) => (
                  <li
                    key={item.area}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <span className="text-ink-primary">{item.area}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium tabular-nums text-amber-700">
                      {item.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Território e palavras-chave */}
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-3 rounded-2xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-primary">
              Participação por município
            </h2>
            {agg.cityRanking.length === 0 ? (
              <p className="text-xs text-ink-muted">Sem dados territoriais.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {agg.cityRanking.slice(0, 8).map((item) => (
                  <li
                    key={item.city}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate text-ink-primary">
                      {item.city}
                    </span>
                    <span className="tabular-nums text-ink-secondary">
                      {item.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-primary">
              Bairros mais participativos
            </h2>
            {agg.neighborhoodRanking.length === 0 ? (
              <p className="text-xs text-ink-muted">Sem bairros informados.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {agg.neighborhoodRanking.slice(0, 8).map((item) => (
                  <li
                    key={item.neighborhood}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate text-ink-primary">
                      {item.neighborhood}
                    </span>
                    <span className="tabular-nums text-ink-secondary">
                      {item.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-primary">
              Termos mais citados nas respostas abertas
            </h2>
            {agg.topKeywords.length === 0 ? (
              <p className="text-xs text-ink-muted">
                Aguardando respostas abertas.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {agg.topKeywords.map((kw) => (
                  <span
                    key={kw.word}
                    className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-ink-primary"
                  >
                    {kw.word}{" "}
                    <span className="text-ink-muted">({kw.count})</span>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sugestões recentes */}
        <section className="space-y-3 rounded-2xl border border-border-subtle bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-primary">
              Relatos e sugestões recentes
            </h2>
            <Link
              href={`/painel/pesquisas/${survey.id}/analise?escopo=${ctx.activeScope}`}
              className="text-xs font-medium text-brand-navy hover:underline print:hidden"
            >
              Ver todas e classificar
            </Link>
          </div>

          {openSuggestions.length === 0 ? (
            <p className="text-xs text-ink-muted">
              Nenhuma resposta aberta recebida neste filtro.
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle/70">
              {openSuggestions.map((item) => (
                <li key={item.id} className="space-y-1.5 py-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                    <span>
                      {item.is_anonymous ? "Anônimo" : "Identificado"}
                    </span>
                    {item.neighborhood || item.city ? (
                      <span>
                        · {[item.neighborhood, item.city].filter(Boolean).join(", ")}
                      </span>
                    ) : null}
                    <span>
                      · {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {item.main_neighborhood_need ? (
                    <p className="text-ink-primary">
                      <strong className="font-medium text-ink-secondary">
                        Necessidade do bairro:
                      </strong>{" "}
                      {item.main_neighborhood_need}
                    </p>
                  ) : null}
                  {item.most_valued_action ? (
                    <p className="text-ink-primary">
                      <strong className="font-medium text-ink-secondary">
                        Mais valorizado:
                      </strong>{" "}
                      {item.most_valued_action}
                    </p>
                  ) : null}
                  {item.what_to_improve ? (
                    <p className="text-ink-primary">
                      <strong className="font-medium text-ink-secondary">
                        O que melhorar:
                      </strong>{" "}
                      {item.what_to_improve}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PanelShell>
  );
}
