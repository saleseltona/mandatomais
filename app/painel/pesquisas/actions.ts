"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import {
  aggregateSurveyResults,
  createSurveySchema,
  type SurveyCustomQuestion,
  type SurveyResponseRecord,
  type SurveyStatus,
} from "@/lib/utils/surveys";

export interface SurveyActionState {
  error: string | null;
  success: string | null;
}

const customQuestionSchema = z.object({
  id: z.string().trim().min(1).max(60),
  label: z.string().trim().min(3, "Cada pergunta personalizada precisa de um enunciado.").max(200),
  type: z.enum([
    "single_choice",
    "multiple_choice",
    "scale_5",
    "scale_10",
    "yes_no",
    "short_text",
    "long_text",
    "date",
    "number",
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
});

const analysisSchema = z.object({
  surveyId: z.string().uuid(),
  responseId: z.string().uuid(),
  theme: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  classification: z.enum([
    "elogio",
    "critica",
    "sugestao",
    "demanda",
    "observacao",
  ]),
  priority: z.enum(["baixa", "media", "alta"]).default("media"),
  status: z
    .enum(["nova", "em_analise", "encaminhada", "respondida", "arquivada"])
    .default("em_analise"),
  linkedActionId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  internalNote: z
    .string()
    .trim()
    .max(600)
    .optional()
    .transform((v) => v || null),
});

function generateDemandProtocol(): string {
  const year = new Date().getFullYear();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `DEM-${year}-${suffix}`;
}

export async function createSurveyAction(
  _prevState: SurveyActionState,
  formData: FormData
): Promise<SurveyActionState> {
  void _prevState;

  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado.", success: null };
  }

  const rawScope = String(formData.get("dataScope") ?? "mandate");
  const ctx = await loadAuthenticatedMembership(rawScope);
  if (!ctx.tenant) {
    return { error: "Mandato não encontrado.", success: null };
  }

  if (!hasPermission(ctx.role, "links:manage")) {
    return {
      error: "Apenas proprietários e administradores podem criar pesquisas.",
      success: null,
    };
  }

  const parsed = createSurveySchema.safeParse({
    title: formData.get("title") ?? "",
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    introText: formData.get("introText") ?? "",
    thankYouText: formData.get("thankYouText") ?? "",
    status: formData.get("status") ?? "active",
    dataScope: rawScope === "campaign" ? "campaign" : "mandate",
    startsAt: formData.get("startsAt") ?? "",
    endsAt: formData.get("endsAt") ?? "",
    responseLimit: formData.get("responseLimit") ?? "",
    targetAudience: formData.get("targetAudience") ?? "geral",
    targetCity: formData.get("targetCity") ?? "",
    targetSegment: formData.get("targetSegment") ?? "",
    useDefaultQuestions: formData.get("useDefaultQuestions") !== "off",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados da pesquisa inválidos.",
      success: null,
    };
  }

  if (
    parsed.data.startsAt &&
    parsed.data.endsAt &&
    new Date(parsed.data.endsAt) < new Date(parsed.data.startsAt)
  ) {
    return {
      error: "A data de encerramento precisa ser posterior à data de início.",
      success: null,
    };
  }

  const rawNeighborhoods = String(formData.get("targetNeighborhoods") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);

  let customQuestions: SurveyCustomQuestion[] = [];
  const rawCustomJson = String(formData.get("customQuestionsJson") ?? "[]");
  try {
    const parsedJson = JSON.parse(rawCustomJson);
    const validatedCustom = z
      .array(customQuestionSchema)
      .max(20)
      .safeParse(parsedJson);
    if (!validatedCustom.success) {
      return {
        error:
          validatedCustom.error.issues[0]?.message ??
          "Perguntas personalizadas inválidas.",
        success: null,
      };
    }
    customQuestions = validatedCustom.data;
  } catch {
    return {
      error: "Formato inválido nas perguntas personalizadas.",
      success: null,
    };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("surveys")
    .insert({
      tenant_id: ctx.tenant.id,
      data_scope: parsed.data.dataScope,
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description,
      intro_text: parsed.data.introText,
      thank_you_text: parsed.data.thankYouText,
      status: parsed.data.status,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      response_limit: parsed.data.responseLimit,
      target_audience: parsed.data.targetAudience,
      target_city: parsed.data.targetCity,
      target_neighborhoods: rawNeighborhoods,
      target_segment: parsed.data.targetSegment,
      use_default_questions: parsed.data.useDefaultQuestions,
      custom_questions: customQuestions,
      created_by: ctx.userId,
    })
    .select("id, slug")
    .single();

  if (error || !created) {
    const isDuplicate = error?.code === "23505";
    return {
      error: isDuplicate
        ? "Já existe uma pesquisa com este endereço (slug). Escolha outro identificador."
        : "Não foi possível criar a pesquisa. Confirme se a migração 0008 foi aplicada no Supabase.",
      success: null,
    };
  }

  await supabase.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.userId,
    action: "survey.created",
    entity_type: "survey",
    entity_id: created.id,
    metadata: {
      slug: created.slug,
      status: parsed.data.status,
      data_scope: parsed.data.dataScope,
      custom_questions_count: customQuestions.length,
    },
  });

  revalidatePath("/painel/pesquisas");
  redirect(`/painel/pesquisas?escopo=${parsed.data.dataScope}`);
}

export async function updateSurveyStatusAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const surveyId = String(formData.get("surveyId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "") as SurveyStatus;
  const scope = String(formData.get("dataScope") ?? "mandate");

  if (
    !surveyId ||
    !["draft", "active", "paused", "closed"].includes(nextStatus)
  ) {
    return;
  }

  const ctx = await loadAuthenticatedMembership(scope);
  if (!ctx.tenant || !hasPermission(ctx.role, "links:manage")) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("surveys")
    .update({ status: nextStatus })
    .eq("id", surveyId)
    .eq("tenant_id", ctx.tenant.id);

  if (!error) {
    await supabase.from("audit_logs").insert({
      tenant_id: ctx.tenant.id,
      actor_user_id: ctx.userId,
      action: "survey.status_updated",
      entity_type: "survey",
      entity_id: surveyId,
      metadata: { next_status: nextStatus },
    });
  }

  revalidatePath("/painel/pesquisas");
  revalidatePath(`/painel/pesquisas/${surveyId}/resultados`);
}

export async function saveSurveyAnalysisAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const scope = String(formData.get("dataScope") ?? "mandate");
  const ctx = await loadAuthenticatedMembership(scope);
  if (!ctx.tenant || !hasPermission(ctx.role, "contacts:edit")) return;

  const parsed = analysisSchema.safeParse({
    surveyId: formData.get("surveyId") ?? "",
    responseId: formData.get("responseId") ?? "",
    theme: formData.get("theme") ?? "",
    classification: formData.get("classification") ?? "observacao",
    priority: formData.get("priority") ?? "media",
    status: formData.get("status") ?? "em_analise",
    linkedActionId: formData.get("linkedActionId") ?? "",
    internalNote: formData.get("internalNote") ?? "",
  });

  if (!parsed.success) return;

  const supabase = await createClient();

  const { data: survey } = await supabase
    .from("surveys")
    .select("id, data_scope")
    .eq("id", parsed.data.surveyId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();

  if (!survey) return;

  const { error } = await supabase.from("survey_response_analyses").upsert(
    {
      response_id: parsed.data.responseId,
      survey_id: parsed.data.surveyId,
      tenant_id: ctx.tenant.id,
      data_scope: survey.data_scope,
      theme: parsed.data.theme,
      classification: parsed.data.classification,
      priority: parsed.data.priority,
      status: parsed.data.status,
      linked_action_id: parsed.data.linkedActionId,
      internal_note: parsed.data.internalNote,
      analyzed_by: ctx.userId,
    },
    { onConflict: "response_id" }
  );

  if (!error) {
    await supabase.from("audit_logs").insert({
      tenant_id: ctx.tenant.id,
      actor_user_id: ctx.userId,
      action: "survey_analysis.updated",
      entity_type: "survey_response",
      entity_id: parsed.data.responseId,
      metadata: {
        survey_id: parsed.data.surveyId,
        classification: parsed.data.classification,
        priority: parsed.data.priority,
        status: parsed.data.status,
      },
    });
  }

  revalidatePath(`/painel/pesquisas/${parsed.data.surveyId}/analise`);
}

export async function createDemandFromSurveyResponseAction(
  formData: FormData
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const surveyId = String(formData.get("surveyId") ?? "");
  const responseId = String(formData.get("responseId") ?? "");
  const scope = String(formData.get("dataScope") ?? "mandate");

  if (!surveyId || !responseId) return;

  const ctx = await loadAuthenticatedMembership(scope);
  if (!ctx.tenant || !hasPermission(ctx.role, "contacts:edit")) return;

  const supabase = await createClient();
  const { data: response } = await supabase
    .from("survey_responses")
    .select("*")
    .eq("id", responseId)
    .eq("survey_id", surveyId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();

  if (!response) return;

  const typed = response as SurveyResponseRecord;
  const rawTitle =
    typed.main_neighborhood_need?.trim() ||
    typed.what_to_improve?.trim() ||
    "Demanda oriunda da Pesquisa de Percepção";
  const title = rawTitle.length > 130 ? `${rawTitle.slice(0, 127)}...` : rawTitle;

  const descriptionParts = [
    typed.main_neighborhood_need
      ? `Necessidade do bairro: ${typed.main_neighborhood_need}`
      : null,
    typed.what_to_improve
      ? `O que melhorar: ${typed.what_to_improve}`
      : null,
    typed.improvement_areas?.length
      ? `Áreas citadas: ${typed.improvement_areas.join(", ")}`
      : null,
  ].filter(Boolean);

  const protocol = generateDemandProtocol();
  const { data: demand, error: demandError } = await supabase
    .from("demands")
    .insert({
      tenant_id: ctx.tenant.id,
      data_scope: typed.data_scope,
      protocol,
      title,
      description: descriptionParts.join("\n").slice(0, 600) || null,
      category: typed.improvement_areas?.[0] ?? "Pesquisa de Percepção",
      city: typed.city || ctx.tenant.city || "Não informada",
      neighborhood: typed.neighborhood || null,
      priority: "media",
      status: "recebida",
      requester_name: typed.is_anonymous
        ? "Participante anônimo (pesquisa)"
        : typed.respondent_name || "Participante da pesquisa",
      office_note: `Criada a partir da Pesquisa de Percepção (resposta ${responseId.slice(0, 8)}).`,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();

  if (demandError || !demand) return;

  await supabase.from("survey_response_analyses").upsert(
    {
      response_id: responseId,
      survey_id: surveyId,
      tenant_id: ctx.tenant.id,
      data_scope: typed.data_scope,
      classification: "demanda",
      priority: "media",
      status: "encaminhada",
      linked_demand_id: demand.id,
      analyzed_by: ctx.userId,
    },
    { onConflict: "response_id" }
  );

  await supabase.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.userId,
    action: "demand.created_from_survey",
    entity_type: "demand",
    entity_id: demand.id,
    metadata: {
      protocol,
      survey_id: surveyId,
      response_id: responseId,
    },
  });

  revalidatePath(`/painel/pesquisas/${surveyId}/analise`);
  revalidatePath("/painel/demandas");
}

export async function publishSurveySummaryToTransparencyAction(
  _prevState: SurveyActionState,
  formData: FormData
): Promise<SurveyActionState> {
  void _prevState;

  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado.", success: null };
  }

  const surveyId = String(formData.get("surveyId") ?? "");
  if (!surveyId) {
    return { error: "Pesquisa não informada.", success: null };
  }

  const ctx = await loadAuthenticatedMembership("mandate");
  if (!ctx.tenant || !hasPermission(ctx.role, "links:manage")) {
    return {
      error: "Apenas proprietários e administradores podem publicar na transparência.",
      success: null,
    };
  }

  const supabase = await createClient();
  const { data: survey } = await supabase
    .from("surveys")
    .select("id, title, slug, target_city")
    .eq("id", surveyId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();

  if (!survey) {
    return { error: "Pesquisa não encontrada.", success: null };
  }

  const { data: responses } = await supabase
    .from("survey_responses")
    .select("*")
    .eq("survey_id", surveyId)
    .eq("tenant_id", ctx.tenant.id);

  const list = (responses ?? []) as SurveyResponseRecord[];
  if (list.length === 0) {
    return {
      error: "Aguarde ao menos 1 resposta antes de publicar o resumo agregado.",
      success: null,
    };
  }

  const agg = aggregateSurveyResults(list, survey.title);
  const topStrength = agg.strengthRanking
    .slice(0, 3)
    .map((item) => item.area)
    .join(", ");
  const topImprovement = agg.improvementRanking
    .slice(0, 3)
    .map((item) => item.area)
    .join(", ");

  const summary = [
    `Resumo agregado e anonimizado de ${agg.totalResponses} participações na pesquisa "${survey.title}".`,
    topStrength ? `Principais pontos positivos citados: ${topStrength}.` : null,
    topImprovement ? `Prioridades apontadas para melhoria: ${topImprovement}.` : null,
    "Nenhum dado pessoal ou resposta individual foi divulgado.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 600);

  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: actionRow, error } = await supabase
    .from("mandate_actions")
    .insert({
      tenant_id: ctx.tenant.id,
      data_scope: "mandate",
      title: `Resultado agregado: ${survey.title}`.slice(0, 140),
      summary,
      category: "Escuta popular",
      city: survey.target_city || ctx.tenant.city || null,
      neighborhood: null,
      action_date: todayIso,
      is_public: true,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error || !actionRow) {
    return {
      error: "Não foi possível publicar o resumo na página de transparência.",
      success: null,
    };
  }

  await supabase.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.userId,
    action: "survey.summary_published_transparency",
    entity_type: "mandate_action",
    entity_id: actionRow.id,
    metadata: {
      survey_id: survey.id,
      total_responses: agg.totalResponses,
    },
  });

  revalidatePath("/painel/transparencia");
  return {
    error: null,
    success: "Resumo agregado e anonimizado publicado na Transparência do mandato.",
  };
}

export async function deleteSurveyResponseAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const surveyId = String(formData.get("surveyId") ?? "");
  const responseId = String(formData.get("responseId") ?? "");
  const scope = String(formData.get("dataScope") ?? "mandate");

  if (!surveyId || !responseId) return;

  const ctx = await loadAuthenticatedMembership(scope);
  if (!ctx.tenant || !hasPermission(ctx.role, "contacts:delete")) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("survey_responses")
    .delete()
    .eq("id", responseId)
    .eq("survey_id", surveyId)
    .eq("tenant_id", ctx.tenant.id);

  if (!error) {
    await supabase.from("audit_logs").insert({
      tenant_id: ctx.tenant.id,
      actor_user_id: ctx.userId,
      action: "survey_response.deleted_lgpd",
      entity_type: "survey_response",
      entity_id: responseId,
      metadata: { survey_id: surveyId },
    });
  }

  revalidatePath(`/painel/pesquisas/${surveyId}/analise`);
  revalidatePath(`/painel/pesquisas/${surveyId}/resultados`);
}
