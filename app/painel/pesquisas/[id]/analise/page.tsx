import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ClipboardPlus,
  MessageCircle,
  Trash2,
} from "lucide-react";
import {
  createDemandFromSurveyResponseAction,
  deleteSurveyResponseAction,
  saveSurveyAnalysisAction,
} from "@/app/painel/pesquisas/actions";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import type {
  SurveyAnalysisRecord,
  SurveyRecord,
  SurveyResponseRecord,
} from "@/lib/utils/surveys";

export const metadata: Metadata = {
  title: "Análise Qualitativa da Pesquisa | Mandato+",
  description:
    "Classifique respostas abertas, vincule a ações do mandato e transforme demandas em atendimentos.",
};

function buildOfficialWhatsappReplyHref(
  whatsapp: string,
  respondentName: string | null,
  tenantName: string
): string {
  const digits = whatsapp.replace(/\D/g, "");
  const fullNumber = digits.startsWith("55") ? digits : `55${digits}`;
  const greeting = respondentName ? `Olá, ${respondentName}!` : "Olá!";
  const text = `${greeting} Agradecemos sua participação na pesquisa de percepção do mandato ${tenantName}. Caso não queira mais receber mensagens, basta avisar por aqui.`;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`;
}

export default async function PesquisaAnalisePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ escopo?: string; classificacao?: string }>;
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

  const [{ data: responseRows }, { data: analysisRows }, { data: actionRows }] =
    await Promise.all([
      supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", survey.id)
        .eq("tenant_id", ctx.tenant.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("survey_response_analyses")
        .select("*")
        .eq("survey_id", survey.id)
        .eq("tenant_id", ctx.tenant.id),
      supabase
        .from("mandate_actions")
        .select("id, title")
        .eq("tenant_id", ctx.tenant.id)
        .order("action_date", { ascending: false })
        .limit(50),
    ]);

  const responses = (responseRows ?? []) as SurveyResponseRecord[];
  const analysisMap = new Map<string, SurveyAnalysisRecord>();
  for (const row of (analysisRows ?? []) as SurveyAnalysisRecord[]) {
    analysisMap.set(row.response_id, row);
  }
  const mandateActions = (actionRows ?? []) as Array<{
    id: string;
    title: string;
  }>;

  const filteredResponses = responses.filter((r) => {
    if (!query.classificacao) return true;
    const analysis = analysisMap.get(r.id);
    return analysis?.classification === query.classificacao;
  });

  // Perfis somente leitura (viewer) não veem dados pessoais identificáveis
  const canViewRespondentPii = ctx.canEditContacts;

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/painel/pesquisas?escopo=${ctx.activeScope}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary transition-colors hover:text-ink-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para pesquisas
            </Link>

            <Link
              href={`/painel/pesquisas/${survey.id}/resultados?escopo=${ctx.activeScope}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Ver resultados consolidados
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
              Análise qualitativa · {survey.title}
            </h1>
            <p className="mt-0.5 text-sm text-ink-secondary">
              Classifique elogios, críticas e sugestões, vincule a ações do mandato ou abra demandas estruturadas.
            </p>
          </div>
        </header>

        {/* Filtro rápido por classificação */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "", label: "Todas" },
            { value: "elogio", label: "Elogios" },
            { value: "critica", label: "Críticas" },
            { value: "sugestao", label: "Sugestões" },
            { value: "demanda", label: "Demandas" },
            { value: "observacao", label: "Observações" },
          ].map((opt) => {
            const active = (query.classificacao ?? "") === opt.value;
            const href = opt.value
              ? `/painel/pesquisas/${survey.id}/analise?escopo=${ctx.activeScope}&classificacao=${opt.value}`
              : `/painel/pesquisas/${survey.id}/analise?escopo=${ctx.activeScope}`;
            return (
              <Link
                key={opt.label}
                href={href}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-brand-navy text-white"
                    : "border border-border-subtle bg-white text-ink-secondary hover:bg-surface-muted"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>

        {filteredResponses.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-white p-8 text-center">
            <p className="text-sm font-medium text-ink-primary">
              Nenhuma resposta encontrada neste filtro.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {filteredResponses.map((r) => {
              const analysis = analysisMap.get(r.id);
              const canReplyWhatsapp =
                canViewRespondentPii &&
                !r.is_anonymous &&
                r.communication_consent_granted &&
                Boolean(r.respondent_whatsapp);

              return (
                <li
                  key={r.id}
                  className="space-y-4 rounded-2xl border border-border-subtle bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-ink-primary">
                          {r.is_anonymous
                            ? "Participante anônimo"
                            : canViewRespondentPii
                              ? r.respondent_name || "Participante identificado"
                              : "Participante identificado"}
                        </span>
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-ink-secondary">
                          {r.is_anonymous ? "Anônima" : "Identificada"}
                        </span>
                        {r.mandate_rating ? (
                          <span className="rounded-full bg-brand-emerald-soft px-2 py-0.5 text-[11px] font-medium text-brand-emerald">
                            Mandato: {r.mandate_rating}
                          </span>
                        ) : null}
                        {r.management_rating ? (
                          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-ink-secondary">
                            Gestão: {r.management_rating}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-ink-muted">
                        {[r.neighborhood, r.city].filter(Boolean).join(", ") ||
                          "Localidade não informada"}{" "}
                        · {new Date(r.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canReplyWhatsapp && r.respondent_whatsapp ? (
                        <a
                          href={buildOfficialWhatsappReplyHref(
                            r.respondent_whatsapp,
                            r.respondent_name,
                            ctx.tenant!.name
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-emerald px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Responder via WhatsApp
                        </a>
                      ) : null}

                      {ctx.canEditContacts && !analysis?.linked_demand_id ? (
                        <form action={createDemandFromSurveyResponseAction}>
                          <input
                            type="hidden"
                            name="surveyId"
                            value={survey.id}
                          />
                          <input type="hidden" name="responseId" value={r.id} />
                          <input
                            type="hidden"
                            name="dataScope"
                            value={ctx.activeScope}
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
                          >
                            <ClipboardPlus className="h-3.5 w-3.5" />
                            Criar demanda
                          </button>
                        </form>
                      ) : analysis?.linked_demand_id ? (
                        <Link
                          href={`/painel/demandas?escopo=${ctx.activeScope}`}
                          className="rounded-xl bg-surface-muted px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary"
                        >
                          Demanda vinculada
                        </Link>
                      ) : null}

                      {ctx.canDeleteContacts ? (
                        <form action={deleteSurveyResponseAction}>
                          <input
                            type="hidden"
                            name="surveyId"
                            value={survey.id}
                          />
                          <input type="hidden" name="responseId" value={r.id} />
                          <input
                            type="hidden"
                            name="dataScope"
                            value={ctx.activeScope}
                          />
                          <button
                            type="submit"
                            title="Excluir resposta (LGPD)"
                            className="rounded-xl p-1.5 text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>

                  {/* Respostas abertas */}
                  <div className="space-y-1.5 rounded-xl bg-canvas/70 p-3.5 text-xs">
                    {r.strength_areas?.length ? (
                      <p className="text-ink-primary">
                        <strong className="font-medium text-ink-secondary">
                          Acertos:
                        </strong>{" "}
                        {r.strength_areas.join(", ")}
                      </p>
                    ) : null}
                    {r.improvement_areas?.length ? (
                      <p className="text-ink-primary">
                        <strong className="font-medium text-ink-secondary">
                          Melhorar:
                        </strong>{" "}
                        {r.improvement_areas.join(", ")}
                      </p>
                    ) : null}
                    {r.main_neighborhood_need ? (
                      <p className="text-ink-primary">
                        <strong className="font-medium text-ink-secondary">
                          Necessidade do bairro:
                        </strong>{" "}
                        {r.main_neighborhood_need}
                      </p>
                    ) : null}
                    {r.most_valued_action ? (
                      <p className="text-ink-primary">
                        <strong className="font-medium text-ink-secondary">
                          Ação mais valorizada:
                        </strong>{" "}
                        {r.most_valued_action}
                      </p>
                    ) : null}
                    {r.what_to_improve ? (
                      <p className="text-ink-primary">
                        <strong className="font-medium text-ink-secondary">
                          O que fazer melhor:
                        </strong>{" "}
                        {r.what_to_improve}
                      </p>
                    ) : null}
                    {!r.main_neighborhood_need &&
                    !r.most_valued_action &&
                    !r.what_to_improve ? (
                      <p className="text-ink-muted">
                        Apenas respostas objetivas registradas.
                      </p>
                    ) : null}
                  </div>

                  {/* Formulário de classificação interna */}
                  {ctx.canEditContacts ? (
                    <form
                      action={saveSurveyAnalysisAction}
                      className="grid gap-3 border-t border-border-subtle/70 pt-3.5 sm:grid-cols-2 lg:grid-cols-5"
                    >
                      <input type="hidden" name="surveyId" value={survey.id} />
                      <input type="hidden" name="responseId" value={r.id} />
                      <input
                        type="hidden"
                        name="dataScope"
                        value={ctx.activeScope}
                      />

                      <div>
                        <label className="block text-[11px] font-medium text-ink-muted">
                          Classificação
                        </label>
                        <select
                          name="classification"
                          defaultValue={analysis?.classification ?? "observacao"}
                          className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-2.5 py-1.5 text-xs text-ink-primary"
                        >
                          <option value="elogio">Elogio</option>
                          <option value="critica">Crítica</option>
                          <option value="sugestao">Sugestão</option>
                          <option value="demanda">Demanda</option>
                          <option value="observacao">Observação</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-ink-muted">
                          Prioridade
                        </label>
                        <select
                          name="priority"
                          defaultValue={analysis?.priority ?? "media"}
                          className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-2.5 py-1.5 text-xs text-ink-primary"
                        >
                          <option value="baixa">Baixa</option>
                          <option value="media">Média</option>
                          <option value="alta">Alta</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-ink-muted">
                          Status interno
                        </label>
                        <select
                          name="status"
                          defaultValue={analysis?.status ?? "nova"}
                          className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-2.5 py-1.5 text-xs text-ink-primary"
                        >
                          <option value="nova">Nova</option>
                          <option value="em_analise">Em análise</option>
                          <option value="encaminhada">Encaminhada</option>
                          <option value="respondida">Respondida</option>
                          <option value="arquivada">Arquivada</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-ink-muted">
                          Tema / Ação do mandato
                        </label>
                        <select
                          name="linkedActionId"
                          defaultValue={analysis?.linked_action_id ?? ""}
                          className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-2.5 py-1.5 text-xs text-ink-primary"
                        >
                          <option value="">Sem vínculo com ação</option>
                          {mandateActions.map((act) => (
                            <option key={act.id} value={act.id}>
                              {act.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-brand-navy px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                        >
                          Salvar análise
                        </button>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-2">
                        <input
                          type="text"
                          name="theme"
                          defaultValue={analysis?.theme ?? ""}
                          maxLength={80}
                          placeholder="Tema principal (ex.: Iluminação pública)"
                          className="w-full rounded-xl border border-border-subtle bg-white px-3 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted"
                        />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3">
                        <input
                          type="text"
                          name="internalNote"
                          defaultValue={analysis?.internal_note ?? ""}
                          maxLength={600}
                          placeholder="Nota interna da equipe (nunca exibida publicamente)"
                          className="w-full rounded-xl border border-border-subtle bg-white px-3 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted"
                        />
                      </div>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PanelShell>
  );
}
