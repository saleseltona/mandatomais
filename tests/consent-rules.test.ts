import { describe, expect, it } from "vitest";
import {
  CONSENT_CHECKBOX_DEFAULT_CHECKED,
  CONSENT_STATEMENT_PT_BR,
  CURRENT_CONSENT_VERSION,
  FORBIDDEN_MVP_FIELDS,
  consentInputSchema,
} from "@/lib/constants/consent";

describe("Regras obrigatórias de consentimento e LGPD do Mandato+", () => {
  it("mantém o checkbox de consentimento desmarcado por padrão", () => {
    expect(CONSENT_CHECKBOX_DEFAULT_CHECKED).toBe(false);
  });

  it("rejeita cadastro sem consentimento explícito marcado", () => {
    const result = consentInputSchema.safeParse({
      consentAccepted: false,
      consentSource: "link-publico-gabinete",
      consentVersion: CURRENT_CONSENT_VERSION,
      dataScope: "mandate",
    });

    expect(result.success).toBe(false);
  });

  it("aceita cadastro com consentimento explícito, origem, versão e escopo válidos", () => {
    const result = consentInputSchema.safeParse({
      consentAccepted: true,
      consentSource: "link-publico-gabinete",
      consentVersion: "1.0.0",
      dataScope: "mandate",
    });

    expect(result.success).toBe(true);
  });

  it("garante menção ao descadastro fácil no texto de consentimento", () => {
    expect(CONSENT_STATEMENT_PT_BR.toLowerCase()).toContain("descadastro");
  });

  it("lista explicitamente os campos sensíveis proibidos no MVP", () => {
    expect(FORBIDDEN_MVP_FIELDS).toContain("cpf");
    expect(FORBIDDEN_MVP_FIELDS).toContain("religiao");
    expect(FORBIDDEN_MVP_FIELDS).toContain("etnia");
    expect(FORBIDDEN_MVP_FIELDS).toContain("biometria");
  });
});
