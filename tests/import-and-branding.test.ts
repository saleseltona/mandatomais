import { describe, expect, it } from "vitest";
import { hasPermission } from "@/lib/auth/permissions";
import {
  buildTenantThemeStyle,
  evaluateColorAccessibility,
} from "@/lib/utils/branding";
import {
  matchCandidateAgainstExisting,
  normalizeImportRow,
  normalizeInstagramHandle,
  parseCsvText,
  suggestColumnMapping,
} from "@/lib/utils/import-parser";

describe("Permissões por papel (backend RBAC)", () => {
  it("restringe papel somente leitura (viewer) apenas à visualização", () => {
    expect(hasPermission("viewer", "contacts:view")).toBe(true);
    expect(hasPermission("viewer", "contacts:edit")).toBe(false);
    expect(hasPermission("viewer", "imports:manage")).toBe(false);
    expect(hasPermission("viewer", "branding:manage")).toBe(false);
    expect(hasPermission("viewer", "team:manage")).toBe(false);
  });

  it("permite assessores editar contatos, mas bloqueia equipe, importação e identidade visual", () => {
    expect(hasPermission("advisor", "contacts:edit")).toBe(true);
    expect(hasPermission("advisor", "contacts:delete")).toBe(false);
    expect(hasPermission("advisor", "imports:manage")).toBe(false);
    expect(hasPermission("advisor", "branding:manage")).toBe(false);
    expect(hasPermission("advisor", "team:manage")).toBe(false);
  });

  it("concede controle administrativo a owner e admin", () => {
    expect(hasPermission("owner", "team:manage")).toBe(true);
    expect(hasPermission("admin", "branding:manage")).toBe(true);
    expect(hasPermission("admin", "imports:manage")).toBe(true);
  });
});

describe("Identidade visual e contraste WCAG", () => {
  it("escolhe texto branco para azul-marinho escuro e texto escuro para cores claras", () => {
    const dark = evaluateColorAccessibility("#0B1E36");
    expect(dark.textColor).toBe("#FFFFFF");
    expect(dark.meetsAA).toBe(true);

    const light = evaluateColorAccessibility("#FACC15");
    expect(light.textColor).toBe("#111827");
    expect(light.meetsAA).toBe(true);
  });

  it("gera tokens CSS válidos com fallback seguro", () => {
    const style = buildTenantThemeStyle("cor-invalida", "#0E7C55");
    expect(style["--color-brand-navy"]).toBe("#0B1E36");
    expect(style["--color-brand-emerald"]).toBe("#0E7C55");
  });
});

describe("Importação CSV e conciliação de cadastros", () => {
  it("normaliza @Instagram preservando o valor original", () => {
    const res = normalizeInstagramHandle("https://instagram.com/Maria.Silva/");
    expect(res.raw).toBe("https://instagram.com/Maria.Silva/");
    expect(res.normalized).toBe("maria.silva");
  });

  it("interpreta CSV com ponto-e-vírgula e sugere mapeamento de colunas", () => {
    const csv = [
      "Nome;WhatsApp;E-mail;Cidade;Instagram",
      "João Pedro;(99) 98888-1111;joao@exemplo.com;Imperatriz;@joaopedro",
    ].join("\n");

    const parsed = parseCsvText(csv);
    expect(parsed.headers).toHaveLength(5);
    expect(parsed.rows).toHaveLength(1);

    const mapping = suggestColumnMapping(parsed.headers);
    expect(mapping.fullName).toBe("Nome");
    expect(mapping.instagram).toBe("Instagram");

    const norm = normalizeImportRow(parsed.rows[0], 2, mapping);
    expect(norm.validationError).toBeNull();
    expect(norm.whatsapp).toBe("99988881111");
    expect(norm.instagramNormalized).toBe("joaopedro");
  });

  it("identifica correspondência exata por @Instagram e não confirma identidade apenas por nome parecido", () => {
    const existing = [
      {
        id: "c-1",
        full_name: "Maria Silva",
        city: "Imperatriz",
        whatsapp: "99988887777",
        email: "maria@exemplo.com",
        instagram_handle_normalized: "mariasilva",
      },
    ];

    const exactIg = matchCandidateAgainstExisting(
      {
        rowNumber: 2,
        rawData: {},
        fullName: "Outro Nome",
        whatsapp: null,
        email: null,
        city: null,
        neighborhood: null,
        instagramRaw: "@MariaSilva",
        instagramNormalized: "mariasilva",
        originalOrigin: null,
        originalRegisteredAt: null,
        validationError: null,
      },
      existing
    );
    expect(exactIg.matchType).toBe("exact_instagram");
    expect(exactIg.matchFields).toEqual(["instagram"]);

    const nameOnlyDifferentCity = matchCandidateAgainstExisting(
      {
        rowNumber: 3,
        rawData: {},
        fullName: "Maria Silva",
        whatsapp: "11999990000",
        email: null,
        city: "São Paulo",
        neighborhood: null,
        instagramRaw: null,
        instagramNormalized: null,
        originalOrigin: null,
        originalRegisteredAt: null,
        validationError: null,
      },
      existing
    );
    expect(nameOnlyDifferentCity.matchType).toBe("no_match");
  });
});
