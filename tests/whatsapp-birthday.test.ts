import { describe, expect, it } from "vitest";
import {
  buildOfficialBirthdayWhatsAppUrl,
  formatBrazilianWhatsAppE164,
  getTodayInBrazil,
} from "@/lib/utils/whatsapp";

describe("Aniversariantes e link oficial do WhatsApp (regras Mandato+)", () => {
  it("normaliza número brasileiro com DDD para DDI 55", () => {
    expect(formatBrazilianWhatsAppE164("(11) 98765-4321")).toBe("5511987654321");
    expect(formatBrazilianWhatsAppE164("5521988887777")).toBe("5521988887777");
    expect(formatBrazilianWhatsAppE164("123")).toBeNull();
  });

  it("nunca gera link de WhatsApp para contato com consentimento revogado", () => {
    const url = buildOfficialBirthdayWhatsAppUrl({
      fullName: "Maria Souza",
      whatsapp: "11987654321",
      consentStatus: "revoked",
      tenantName: "Gabinete Exemplo",
      unsubscribeToken: "11111111-1111-4111-8111-111111111111",
      appUrl: "https://mandatoplus.com.br",
    });

    expect(url).toBeNull();
  });

  it("gera link oficial wa.me com mensagem personalizada e link obrigatório de descadastro", () => {
    const token = "11111111-1111-4111-8111-111111111111";
    const url = buildOfficialBirthdayWhatsAppUrl({
      fullName: "Maria Souza",
      whatsapp: "(11) 98765-4321",
      consentStatus: "granted",
      tenantName: "Gabinete Exemplo",
      unsubscribeToken: token,
      appUrl: "https://mandatoplus.com.br/",
    });

    expect(url).not.toBeNull();
    expect(url).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/);

    const decoded = decodeURIComponent(url!.split("?text=")[1] ?? "");
    expect(decoded).toContain("Maria");
    expect(decoded).toContain("Gabinete Exemplo");
    expect(decoded).toContain(
      `https://mandatoplus.com.br/descadastro/${token}`
    );
  });

  it("calcula dia e mês corretos no fuso de Brasília (America/Sao_Paulo)", () => {
    // 2026-05-10T01:30:00Z corresponde a 2026-05-09 22:30 em Brasília (UTC-3)
    const date = new Date("2026-05-10T01:30:00Z");
    expect(getTodayInBrazil(date)).toEqual({ day: 9, month: 5 });
  });
});
