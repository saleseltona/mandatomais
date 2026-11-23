import { describe, expect, it } from "vitest";
import {
  aggregateSurveyResults,
  buildSurveyResponsesCsv,
  createSurveySchema,
  publicSurveyResponseSchema,
  type SurveyResponseRecord,
} from "@/lib/utils/surveys";

describe("Módulo 12 — Pesquisa de Percepção (validação LGPD e ética)", () => {
  it("aceita resposta 100% anônima sem dados pessoais", () => {
    const parsed = publicSurveyResponseSchema.safeParse({
      isAnonymous: true,
      city: "Imperatriz",
      neighborhood: "Centro",
      managementRating: "Boa",
      mandateRating: "Ótimo",
      strengthAreas: ["Saúde", "Transparência"],
      improvementAreas: ["Infraestrutura"],
      mainNeighborhoodNeed: "Mais iluminação nas ruas",
      mostValuedAction: "Atendimento nos bairros",
      whatToImprove: "Ampliar horários de atendimento",
      wantsUpdates: false,
      communicationConsentGranted: false,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejeita campos sensíveis não permitidos via schema strict (CPF, partido, religião)", () => {
    const parsed = publicSurveyResponseSchema.safeParse({
      isAnonymous: true,
      managementRating: "Regular",
      wantsUpdates: false,
      communicationConsentGranted: false,
      cpf: "123.456.789-00",
      partido: "Partido X",
    });

    expect(parsed.success).toBe(false);
  });

  it("exige consentimento explícito e WhatsApp quando o cidadão solicita atualizações", () => {
    const semConsentimento = publicSurveyResponseSchema.safeParse({
      isAnonymous: true,
      managementRating: "Boa",
      wantsUpdates: true,
      respondentWhatsapp: "(99) 99999-8888",
      communicationConsentGranted: false,
    });

    expect(semConsentimento.success).toBe(false);

    const comConsentimento = publicSurveyResponseSchema.safeParse({
      isAnonymous: true,
      managementRating: "Boa",
      wantsUpdates: true,
      respondentWhatsapp: "(99) 99999-8888",
      communicationConsentGranted: true,
    });

    expect(comConsentimento.success).toBe(true);
  });

  it("valida criação de pesquisa com slug normalizado", () => {
    const parsed = createSurveySchema.safeParse({
      title: "Escuta Popular 2026",
      slug: "escuta-popular-2026",
      status: "active",
      dataScope: "mandate",
      responseLimit: "500",
      targetAudience: "cidade",
      targetCity: "Imperatriz",
      useDefaultQuestions: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.responseLimit).toBe(500);
    }
  });
});

describe("Módulo 12 — Agregação de resultados e CSV seguro", () => {
  const sampleResponses: SurveyResponseRecord[] = [
    {
      id: "resp-1",
      survey_id: "surv-1",
      tenant_id: "ten-1",
      data_scope: "mandate",
      is_anonymous: true,
      city: "Imperatriz",
      neighborhood: "Centro",
      management_rating: "Boa",
      mandate_rating: "Ótimo",
      strength_areas: ["Saúde", "Transparência"],
      improvement_areas: ["Infraestrutura"],
      main_neighborhood_need: "Iluminação pública e asfalto na rua principal",
      most_valued_action: "Mutirão de saúde",
      what_to_improve: "Mais iluminação nos bairros",
      custom_answers: {},
      wants_updates: false,
      communication_consent_granted: false,
      communication_consent_version: null,
      respondent_name: null,
      respondent_whatsapp: null,
      respondent_email: null,
      linked_contact_id: null,
      source: "link_publico",
      questionnaire_version: "1.0.0",
      created_at: "2026-11-20T12:00:00.000Z",
    },
    {
      id: "resp-2",
      survey_id: "surv-1",
      tenant_id: "ten-1",
      data_scope: "mandate",
      is_anonymous: false,
      city: "Imperatriz",
      neighborhood: "Bacuri",
      management_rating: "Regular",
      mandate_rating: "Bom",
      strength_areas: ["Saúde"],
      improvement_areas: ["Infraestrutura", "Segurança"],
      main_neighborhood_need: "=CMD('calc') Iluminação no posto",
      most_valued_action: "Atendimento rápido",
      what_to_improve: "Asfalto no Bacuri",
      custom_answers: {},
      wants_updates: true,
      communication_consent_granted: true,
      communication_consent_version: "1.0.0",
      respondent_name: "Maria Silva",
      respondent_whatsapp: "5599999998888",
      respondent_email: "maria@exemplo.com.br",
      linked_contact_id: "contact-1",
      source: "link_publico",
      questionnaire_version: "1.0.0",
      created_at: "2026-11-21T15:00:00.000Z",
    },
  ];

  it("calcula distribuições, rankings e palavras-chave corretamente", () => {
    const agg = aggregateSurveyResults(sampleResponses, "Nov/2026");

    expect(agg.totalResponses).toBe(2);
    expect(agg.anonymousCount).toBe(1);
    expect(agg.identifiedCount).toBe(1);
    expect(agg.strengthRanking[0]).toEqual({ area: "Saúde", count: 2 });
    expect(agg.improvementRanking[0]).toEqual({
      area: "Infraestrutura",
      count: 2,
    });
    expect(agg.cityRanking[0]).toEqual({ city: "Imperatriz", count: 2 });
    expect(agg.topKeywords.some((k) => k.word === "iluminacao")).toBe(true);
    expect(agg.whatsappSummaryText).toContain("2 pessoas participaram");
    expect(agg.whatsappSummaryText).toContain("Saúde");
  });

  it("protege contra CSV Formula Injection e omite PII quando includeIdentifiable=false", () => {
    const viewerCsv = buildSurveyResponsesCsv(sampleResponses, false);
    expect(viewerCsv).not.toContain("Maria Silva");
    expect(viewerCsv).not.toContain("5599999998888");
    expect(viewerCsv).not.toContain("maria@exemplo.com.br");
    expect(viewerCsv).toContain("'=CMD('calc')");

    const adminCsv = buildSurveyResponsesCsv(sampleResponses, true);
    expect(adminCsv).toContain("Maria Silva");
    expect(adminCsv).toContain("5599999998888");
    expect(adminCsv).toContain("'=CMD('calc')");
  });
});
