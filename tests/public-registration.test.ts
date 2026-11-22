import { describe, expect, it } from "vitest";
import {
  createPublicLinkSchema,
  normalizeWhatsapp,
  publicRegistrationSchema,
} from "@/lib/validation/public-registration";

describe("Validação do cadastro público consentido (LGPD)", () => {
  it("normaliza o número de WhatsApp removendo pontuação", () => {
    expect(normalizeWhatsapp("(11) 98765-4321")).toBe("11987654321");
  });

  it("rejeita cadastro sem consentimento explícito", () => {
    const result = publicRegistrationSchema.safeParse({
      fullName: "Maria Silva",
      whatsapp: "(11) 98765-4321",
      email: "",
      city: "São Paulo",
      neighborhood: "Centro",
      birthDay: 15,
      birthMonth: 8,
      interestIds: [],
      consentAccepted: false,
    });

    expect(result.success).toBe(false);
  });

  it("exige pelo menos WhatsApp ou e-mail", () => {
    const result = publicRegistrationSchema.safeParse({
      fullName: "Maria Silva",
      whatsapp: "",
      email: "",
      city: "São Paulo",
      neighborhood: "",
      birthDay: null,
      birthMonth: null,
      interestIds: [],
      consentAccepted: true,
    });

    expect(result.success).toBe(false);
  });

  it("exige dia e mês juntos quando aniversário é informado", () => {
    const result = publicRegistrationSchema.safeParse({
      fullName: "João Santos",
      whatsapp: "11999998888",
      email: "",
      city: "Campinas",
      neighborhood: "",
      birthDay: 10,
      birthMonth: null,
      interestIds: [],
      consentAccepted: true,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita campos extras sensíveis como CPF", () => {
    const result = publicRegistrationSchema.safeParse({
      fullName: "Ana Costa",
      whatsapp: "11999998888",
      email: "ana@exemplo.com.br",
      city: "Belo Horizonte",
      neighborhood: "Savassi",
      birthDay: 22,
      birthMonth: 5,
      interestIds: [],
      consentAccepted: true,
      cpf: "000.000.000-00",
    });

    expect(result.success).toBe(false);
  });

  it("aceita cadastro mínimo válido com consentimento explícito", () => {
    const result = publicRegistrationSchema.safeParse({
      fullName: "Carlos Oliveira",
      whatsapp: "(21) 98888-7777",
      email: "",
      city: "Rio de Janeiro",
      neighborhood: "Tijuca",
      birthDay: 4,
      birthMonth: 11,
      interestIds: [],
      consentAccepted: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.whatsapp).toBe("21988887777");
    }
  });

  it("valida criação de link público separando escopo mandato e campanha", () => {
    const valid = createPublicLinkSchema.safeParse({
      title: "Informativo do Mandato",
      slug: "gabinete-carlos",
      description: "Receba notícias do mandato",
      dataScope: "mandate",
    });
    expect(valid.success).toBe(true);

    const invalidSlug = createPublicLinkSchema.safeParse({
      title: "Link inválido",
      slug: "Gabinete Com Espaço",
      dataScope: "campaign",
    });
    expect(invalidSlug.success).toBe(false);
  });
});
