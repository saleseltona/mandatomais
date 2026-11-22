import { describe, expect, it } from "vitest";
import { buildSupportersCsv, escapeCsvCell } from "@/lib/utils/csv";
import {
  checkPublicRateLimit,
  hashClientIp,
  pruneExpiredRateLimits,
} from "@/lib/utils/security";
import {
  bootstrapTenantSchema,
  isValidDayMonth,
  publicRegistrationSchema,
} from "@/lib/validation/public-registration";

describe("Segurança LGPD (HMAC IP, Rate Limit) e validações de calendário", () => {
  it("gera hash HMAC-SHA256 determinístico e distinto por segredo", () => {
    const h1 = hashClientIp("203.0.113.10, 10.0.0.1", "segredo-a");
    const h2 = hashClientIp("203.0.113.10", "segredo-a");
    const h3 = hashClientIp("203.0.113.10", "segredo-b");

    expect(h1).not.toBeNull();
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(hashClientIp(null)).toBeNull();
  });

  it("limita requisições consecutivas na mesma janela", () => {
    const key = "teste-rate-limit-unico";
    const t0 = 1_700_000_000_000;

    for (let i = 0; i < 8; i += 1) {
      expect(checkPublicRateLimit(key, t0 + i * 100)).toBe(true);
    }
    expect(checkPublicRateLimit(key, t0 + 1000)).toBe(false);
    // Após 60 segundos, libera novamente
    expect(checkPublicRateLimit(key, t0 + 61_000)).toBe(true);
  });

  it("valida datas reais de aniversário (rejeita 31/02 e 31/04, aceita 29/02)", () => {
    expect(isValidDayMonth(31, 2)).toBe(false);
    expect(isValidDayMonth(31, 4)).toBe(false);
    expect(isValidDayMonth(29, 2)).toBe(true);
    expect(isValidDayMonth(30, 4)).toBe(true);

    const invalidDate = publicRegistrationSchema.safeParse({
      fullName: "Teste Calendário",
      whatsapp: "11999998888",
      email: "",
      city: "Imperatriz",
      neighborhood: "Centro",
      birthDay: 31,
      birthMonth: 2,
      interestIds: [],
      consentAccepted: true,
    });
    expect(invalidDate.success).toBe(false);
  });

  it("valida criação do primeiro mandato no onboarding", () => {
    const ok = bootstrapTenantSchema.safeParse({
      name: "Mandato Exemplo",
      slug: "mandato-exemplo",
      officeTitle: "Vereador",
      city: "Imperatriz",
      state: "ma",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.state).toBe("MA");
    }

    const badUf = bootstrapTenantSchema.safeParse({
      name: "Mandato Exemplo",
      slug: "mandato-exemplo",
      state: "MAR",
    });
    expect(badUf.success).toBe(false);
  });

  it("remove chaves expiradas do rate limit ao executar prune", () => {
    const key = "teste-prune-rate-limit";
    const t0 = 1_800_000_000_000;
    expect(checkPublicRateLimit(key, t0)).toBe(true);
    expect(pruneExpiredRateLimits(t0 + 65_000)).toBeGreaterThanOrEqual(1);
  });

  it("neutraliza CSV Formula Injection e gera CSV UTF-8 com BOM", () => {
    expect(escapeCsvCell("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(escapeCsvCell("Maria; Silva")).toBe('"Maria; Silva"');

    const csv = buildSupportersCsv([
      {
        full_name: "Maria Silva",
        whatsapp: "99988887777",
        email: "maria@exemplo.com",
        city: "Imperatriz",
        neighborhood: "Centro",
        birth_day: 5,
        birth_month: 4,
        consent_source: "link-publico:gabinete",
        consent_version: "1.0.0",
        consented_at: "2026-11-22T12:00:00Z",
        interests: ["Saúde", "Educação"],
      },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Maria Silva;99988887777;maria@exemplo.com");
    expect(csv).toContain("05/04");
  });
});
