import { z } from "zod";
import { escapeCsvCell } from "@/lib/utils/csv";
import { normalizeWhatsapp } from "@/lib/validation/public-registration";

export const SURVEY_COMMUNICATION_CONSENT_TEXT =
  "Autorizo o Mandato+ e o responsável pelo cadastro a utilizar meus dados para envio de informações, avisos, convites, ações sociais, aniversários e comunicações relacionadas ao mandato, por WhatsApp, e-mail ou outros canais autorizados. Posso cancelar o recebimento a qualquer momento.";

export const SURVEY_MANAGEMENT_RATINGS = [
  "Ótima",
  "Boa",
  "Regular",
  "Ruim",
  "Péssima",
  "Não sei opinar",
] as const;

export const SURVEY_MANDATE_RATINGS = [
  "Ótimo",
  "Bom",
  "Regular",
  "Ruim",
  "Péssimo",
  "Não conheço o trabalho",
] as const;

export const SURVEY_AREAS = [
  "Saúde",
  "Educação",
  "Segurança",
  "Infraestrutura",
  "Transporte",
  "Emprego e renda",
  "Assistência social",
  "Cultura e lazer",
  "Esporte",
  "Meio ambiente",
  "Habitação",
  "Atendimento ao cidadão",
  "Transparência",
  "Outra",
] as const;

export type SurveyStatus = "draft" | "active" | "paused" | "closed";
export type SurveyTargetAudience = "geral" | "cidade" | "bairro" | "segmento";
export type SurveyQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "scale_5"
  | "scale_10"
  | "yes_no"
  | "short_text"
  | "long_text"
  | "date"
  | "number";

export interface SurveyCustomQuestion {
  id: string;
  label: string;
  type: SurveyQuestionType;
  required: boolean;
  options?: string[];
}

export interface SurveyRecord {
  id: string;
  tenant_id: string;
  data_scope: "mandate" | "campaign";
  slug: string;
  title: string;
  description: string | null;
  intro_text: string | null;
  thank_you_text: string | null;
  status: SurveyStatus;
  starts_at: string | null;
  ends_at: string | null;
  response_limit: number | null;
  target_audience: SurveyTargetAudience;
  target_city: string | null;
  target_neighborhoods: string[];
  target_segment: string | null;
  use_default_questions: boolean;
  custom_questions: SurveyCustomQuestion[];
  questionnaire_version: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurveyResponseRecord {
  id: string;
  survey_id: string;
  tenant_id: string;
  data_scope: "mandate" | "campaign";
  is_anonymous: boolean;
  city: string | null;
  neighborhood: string | null;
  management_rating: string | null;
  mandate_rating: string | null;
  strength_areas: string[];
  improvement_areas: string[];
  main_neighborhood_need: string | null;
  most_valued_action: string | null;
  what_to_improve: string | null;
  custom_answers: Record<string, string | string[]>;
  wants_updates: boolean;
  communication_consent_granted: boolean;
  communication_consent_version: string | null;
  respondent_name: string | null;
  respondent_whatsapp: string | null;
  respondent_email: string | null;
  linked_contact_id: string | null;
  source: string;
  questionnaire_version: string;
  created_at: string;
}

export type AnalysisClassification =
  | "elogio"
  | "critica"
  | "sugestao"
  | "demanda"
  | "observacao";

export type AnalysisStatus =
  | "nova"
  | "em_analise"
  | "encaminhada"
  | "respondida"
  | "arquivada";

export interface SurveyAnalysisRecord {
  id: string;
  response_id: string;
  survey_id: string;
  tenant_id: string;
  data_scope: "mandate" | "campaign";
  theme: string | null;
  classification: AnalysisClassification;
  priority: "baixa" | "media" | "alta";
  status: AnalysisStatus;
  linked_demand_id: string | null;
  linked_action_id: string | null;
  internal_note: string | null;
  analyzed_by: string | null;
  created_at: string;
  updated_at: string;
}

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  draft: "Rascunho",
  active: "Ativa",
  paused: "Pausada",
  closed: "Encerrada",
};

export const createSurveySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Informe um título com pelo menos 3 caracteres.")
    .max(140),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "O identificador deve ter pelo menos 3 caracteres.")
    .max(60)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífen."
    ),
  description: z
    .string()
    .trim()
    .max(400)
    .optional()
    .transform((v) => v || null),
  introText: z
    .string()
    .trim()
    .max(400)
    .optional()
    .transform((v) => v || null),
  thankYouText: z
    .string()
    .trim()
    .max(400)
    .optional()
    .transform((v) => v || null),
  status: z.enum(["draft", "active", "paused", "closed"]).default("active"),
  dataScope: z.enum(["mandate", "campaign"]).default("mandate"),
  startsAt: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(v).toISOString() : null)),
  endsAt: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(v).toISOString() : null)),
  responseLimit: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int().positive("O limite deve ser maior que zero.").nullable()
  ),
  targetAudience: z
    .enum(["geral", "cidade", "bairro", "segmento"])
    .default("geral"),
  targetCity: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || null),
  targetSegment: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || null),
  useDefaultQuestions: z.boolean().default(true),
});

export const publicSurveyResponseSchema = z
  .object({
    isAnonymous: z.boolean(),
    city: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((v) => v || null),
    neighborhood: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((v) => v || null),
    managementRating: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((v) => v || null),
    mandateRating: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((v) => v || null),
    strengthAreas: z.array(z.string().trim().max(60)).max(15).default([]),
    improvementAreas: z.array(z.string().trim().max(60)).max(15).default([]),
    mainNeighborhoodNeed: z
      .string()
      .trim()
      .max(500, "Máximo de 500 caracteres.")
      .optional()
      .transform((v) => v || null),
    mostValuedAction: z
      .string()
      .trim()
      .max(500, "Máximo de 500 caracteres.")
      .optional()
      .transform((v) => v || null),
    whatToImprove: z
      .string()
      .trim()
      .max(500, "Máximo de 500 caracteres.")
      .optional()
      .transform((v) => v || null),
    customAnswers: z
      .record(z.union([z.string().max(500), z.array(z.string().max(100))]))
      .default({}),
    wantsUpdates: z.boolean().default(false),
    communicationConsentGranted: z.boolean().default(false),
    respondentName: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => v || null),
    respondentWhatsapp: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? normalizeWhatsapp(v) : null))
      .refine(
        (v) => v === null || (v.length >= 10 && v.length <= 13),
        "Informe um WhatsApp válido com DDD."
      ),
    respondentEmail: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.toLowerCase() : null))
      .refine(
        (v) => v === null || z.string().email().safeParse(v).success,
        "Informe um e-mail válido."
      ),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.wantsUpdates && data.respondentWhatsapp && !data.communicationConsentGranted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["communicationConsentGranted"],
        message:
          "Para receber informações por WhatsApp, marque a autorização de consentimento.",
      });
    }

    if (!data.isAnonymous && !data.respondentName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["respondentName"],
        message: "Informe seu nome ou selecione responder de forma anônima.",
      });
    }
  });

const STOPWORDS_PT = new Set([
  "para", "com", "sem", "mais", "menos", "muito", "muita", "pela", "pelo",
  "pelas", "pelos", "sobre", "entre", "como", "onde", "quando", "qual",
  "quais", "isso", "esse", "essa", "este", "esta", "aqui", "hoje", "ainda",
  "precisa", "falta", "melhorar", "bairro", "cidade", "mandato", "nosso",
  "nossa", "todos", "todas", "tambem", "também", "estao", "estão", "fazer",
  "tenho", "quero", "pode", "poderia", "porque", "pois", "muitos", "muitas",
]);

export interface AggregatedSurveyResults {
  totalResponses: number;
  anonymousCount: number;
  identifiedCount: number;
  managementDistribution: Array<{ label: string; count: number; pct: number }>;
  mandateDistribution: Array<{ label: string; count: number; pct: number }>;
  strengthRanking: Array<{ area: string; count: number }>;
  improvementRanking: Array<{ area: string; count: number }>;
  cityRanking: Array<{ city: string; count: number }>;
  neighborhoodRanking: Array<{ neighborhood: string; count: number }>;
  topKeywords: Array<{ word: string; count: number }>;
  whatsappSummaryText: string;
}

export function aggregateSurveyResults(
  responses: SurveyResponseRecord[],
  periodLabel?: string
): AggregatedSurveyResults {
  const total = responses.length;
  let anonymousCount = 0;
  let identifiedCount = 0;

  const mgmtMap = new Map<string, number>();
  const mandateMap = new Map<string, number>();
  const strengthMap = new Map<string, number>();
  const improvementMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const neighborhoodMap = new Map<string, number>();
  const wordMap = new Map<string, number>();

  for (const r of responses) {
    if (r.is_anonymous) anonymousCount += 1;
    else identifiedCount += 1;

    if (r.management_rating) {
      mgmtMap.set(
        r.management_rating,
        (mgmtMap.get(r.management_rating) ?? 0) + 1
      );
    }
    if (r.mandate_rating) {
      mandateMap.set(
        r.mandate_rating,
        (mandateMap.get(r.mandate_rating) ?? 0) + 1
      );
    }
    for (const a of r.strength_areas ?? []) {
      strengthMap.set(a, (strengthMap.get(a) ?? 0) + 1);
    }
    for (const a of r.improvement_areas ?? []) {
      improvementMap.set(a, (improvementMap.get(a) ?? 0) + 1);
    }
    if (r.city) {
      cityMap.set(r.city, (cityMap.get(r.city) ?? 0) + 1);
    }
    if (r.neighborhood) {
      neighborhoodMap.set(
        r.neighborhood,
        (neighborhoodMap.get(r.neighborhood) ?? 0) + 1
      );
    }

    const openTexts = [
      r.main_neighborhood_need,
      r.most_valued_action,
      r.what_to_improve,
    ]
      .filter(Boolean)
      .join(" ");

    const tokens = openTexts
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS_PT.has(w));

    for (const token of tokens) {
      wordMap.set(token, (wordMap.get(token) ?? 0) + 1);
    }
  }

  const toDist = (labels: readonly string[], map: Map<string, number>) =>
    labels.map((label) => {
      const count = map.get(label) ?? 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return { label, count, pct };
    });

  const strengthRanking = Array.from(strengthMap.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);

  const improvementRanking = Array.from(improvementMap.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);

  const cityRanking = Array.from(cityMap.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);

  const neighborhoodRanking = Array.from(neighborhoodMap.entries())
    .map(([neighborhood, count]) => ({ neighborhood, count }))
    .sort((a, b) => b.count - a.count);

  const topKeywords = Array.from(wordMap.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const topStrengths = strengthRanking
    .slice(0, 2)
    .map((s) => s.area)
    .join(" e ");
  const topImprovements = improvementRanking
    .slice(0, 2)
    .map((s) => s.area)
    .join(" e ");

  const periodPrefix = periodLabel ? `No período ${periodLabel}, ` : "";
  const whatsappSummaryText = [
    `${periodPrefix}${total} ${
      total === 1 ? "pessoa participou" : "pessoas participaram"
    } da pesquisa de percepção.`,
    topStrengths
      ? `As áreas mais reconhecidas foram ${topStrengths}.`
      : null,
    topImprovements
      ? `As principais prioridades de melhoria apontadas foram ${topImprovements}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    totalResponses: total,
    anonymousCount,
    identifiedCount,
    managementDistribution: toDist(SURVEY_MANAGEMENT_RATINGS, mgmtMap),
    mandateDistribution: toDist(SURVEY_MANDATE_RATINGS, mandateMap),
    strengthRanking,
    improvementRanking,
    cityRanking,
    neighborhoodRanking,
    topKeywords,
    whatsappSummaryText,
  };
}

/**
 * Gera CSV seguro (BOM UTF-8 + proteção Formula Injection).
 * Se includeIdentifiable = false (ex.: perfil viewer), oculta nome, WhatsApp e e-mail.
 */
export function buildSurveyResponsesCsv(
  responses: SurveyResponseRecord[],
  includeIdentifiable: boolean
): string {
  const baseHeaders = [
    "Data",
    "Tipo",
    "Cidade",
    "Bairro",
    "Avaliação da Gestão",
    "Avaliação do Mandato",
    "Áreas de Acerto",
    "Áreas de Melhoria",
    "Principal Necessidade",
    "Ação Mais Valorizada",
    "O Que Melhorar",
    "Consentimento de Comunicação",
  ];

  const headers = includeIdentifiable
    ? [...baseHeaders, "Nome", "WhatsApp", "E-mail"]
    : baseHeaders;

  const lines = [headers.map(escapeCsvCell).join(";")];

  for (const r of responses) {
    const baseCols = [
      r.created_at,
      r.is_anonymous ? "Anônima" : "Identificada",
      r.city ?? "",
      r.neighborhood ?? "",
      r.management_rating ?? "",
      r.mandate_rating ?? "",
      (r.strength_areas ?? []).join(", "),
      (r.improvement_areas ?? []).join(", "),
      r.main_neighborhood_need ?? "",
      r.most_valued_action ?? "",
      r.what_to_improve ?? "",
      r.communication_consent_granted ? "Sim" : "Não",
    ];

    const cols = includeIdentifiable
      ? [
          ...baseCols,
          r.is_anonymous ? "" : (r.respondent_name ?? ""),
          r.is_anonymous ? "" : (r.respondent_whatsapp ?? ""),
          r.is_anonymous ? "" : (r.respondent_email ?? ""),
        ]
      : baseCols;

    lines.push(cols.map(escapeCsvCell).join(";"));
  }

  return `\uFEFF${lines.join("\r\n")}`;
}
