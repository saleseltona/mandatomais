import { normalizeWhatsapp } from "@/lib/validation/public-registration";
import type { ImportMatchType } from "@/lib/types/database";

export interface ParsedTabularFile {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ColumnMapping {
  fullName: string;
  whatsapp: string;
  email: string;
  city: string;
  neighborhood: string;
  instagram: string;
  originalOrigin: string;
  originalRegisteredAt: string;
}

export interface NormalizedImportCandidate {
  rowNumber: number;
  rawData: Record<string, string>;
  fullName: string;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  neighborhood: string | null;
  instagramRaw: string | null;
  instagramNormalized: string | null;
  originalOrigin: string | null;
  originalRegisteredAt: string | null;
  validationError: string | null;
}

export interface ExistingContactIndexEntry {
  id: string;
  full_name: string;
  city: string;
  whatsapp: string | null;
  email: string | null;
  instagram_handle_normalized: string | null;
}

export interface ReconciliationMatch {
  matchType: ImportMatchType;
  matchedContactId: string | null;
  matchFields: string[];
}

export function normalizeInstagramHandle(raw: string | null | undefined): {
  raw: string | null;
  normalized: string | null;
} {
  if (!raw) return { raw: null, normalized: null };
  const trimmed = raw.trim();
  if (!trimmed) return { raw: null, normalized: null };

  let cleaned = trimmed
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .split(/[/?#]/)[0]
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();

  if (!cleaned || !/^[a-z0-9._]{1,30}$/.test(cleaned)) {
    cleaned = "";
  }

  return {
    raw: trimmed,
    normalized: cleaned || null,
  };
}

function normalizeComparableName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Parser CSV compatível com RFC-4180, BOM UTF-8 e detecção automática de ';' ou ','.
 */
export function parseCsvText(input: string): ParsedTabularFile {
  const text = input.replace(/^\uFEFF/, "").trim();
  if (!text) return { headers: [], rows: [] };

  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const delimiter = semicolonCount >= commaCount ? ";" : ",";

  const matrix: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i += 1;
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        matrix.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += ch;
    }
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((c) => c.length > 0)) {
    matrix.push(currentRow);
  }

  if (matrix.length === 0) return { headers: [], rows: [] };

  const headers = matrix[0].map((h, idx) => h || `Coluna ${idx + 1}`);
  const rows = matrix.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = cells[idx] ?? "";
    });
    return record;
  });

  return { headers, rows };
}

export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const find = (patterns: RegExp[]) =>
    headers.find((h) => patterns.some((p) => p.test(h.toLowerCase()))) ?? "";

  return {
    fullName: find([/^nome/, /name/, /contato/, /apoiador/, /pessoa/]),
    whatsapp: find([/whats/, /telef/, /cel/, /fone/, /phone/]),
    email: find([/e-?mail/, /correio/]),
    city: find([/cidade/, /munic/, /city/]),
    neighborhood: find([/bairro/, /setor/, /regi/, /neighborhood/]),
    instagram: find([/insta/, /@/, /username/, /usuario/, /usuário/, /handle/]),
    originalOrigin: find([/origem/, /fonte/, /canal/, /source/]),
    originalRegisteredAt: find([/data/, /cadastro/, /created/, /date/]),
  };
}

export function normalizeImportRow(
  row: Record<string, string>,
  rowNumber: number,
  mapping: ColumnMapping
): NormalizedImportCandidate {
  const fullName = (mapping.fullName ? row[mapping.fullName] : "")?.trim() ?? "";
  const rawPhone = (mapping.whatsapp ? row[mapping.whatsapp] : "")?.trim() ?? "";
  const cleanPhone = rawPhone ? normalizeWhatsapp(rawPhone) : "";
  const whatsapp =
    cleanPhone.length >= 10 && cleanPhone.length <= 13 ? cleanPhone : null;

  const rawEmail = (mapping.email ? row[mapping.email] : "")?.trim().toLowerCase() ?? "";
  const email =
    rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null;

  const city = (mapping.city ? row[mapping.city] : "")?.trim() || null;
  const neighborhood =
    (mapping.neighborhood ? row[mapping.neighborhood] : "")?.trim() || null;

  const rawIg = mapping.instagram ? row[mapping.instagram] : "";
  const { raw: instagramRaw, normalized: instagramNormalized } =
    normalizeInstagramHandle(rawIg);

  const originalOrigin =
    (mapping.originalOrigin ? row[mapping.originalOrigin] : "")?.trim() || null;

  const rawDate =
    (mapping.originalRegisteredAt ? row[mapping.originalRegisteredAt] : "")?.trim() ||
    null;
  let originalRegisteredAt: string | null = null;
  if (rawDate) {
    const parsedDate = Date.parse(rawDate);
    if (!Number.isNaN(parsedDate)) {
      originalRegisteredAt = new Date(parsedDate).toISOString();
    }
  }

  let validationError: string | null = null;
  if (fullName.length < 2 && !instagramNormalized) {
    validationError = "Informe pelo menos um nome válido ou @Instagram.";
  } else if (!whatsapp && !email && !instagramNormalized) {
    validationError =
      "Linha sem identificador válido (telefone, e-mail ou @Instagram).";
  }

  return {
    rowNumber,
    rawData: row,
    fullName: fullName || (instagramNormalized ? `@${instagramNormalized}` : ""),
    whatsapp,
    email,
    city,
    neighborhood,
    instagramRaw,
    instagramNormalized,
    originalOrigin,
    originalRegisteredAt,
    validationError,
  };
}

/**
 * Classifica correspondência cadastral respeitando as regras:
 * - Exata por @Instagram, e-mail ou telefone (mostra quais campos fundamentaram).
 * - Nome parecido + mesma cidade gera apenas 'possible_duplicate' para revisão manual.
 * - Nome parecido sozinho NUNCA confirma identidade.
 */
export function matchCandidateAgainstExisting(
  candidate: NormalizedImportCandidate,
  existing: ExistingContactIndexEntry[]
): ReconciliationMatch {
  if (candidate.instagramNormalized) {
    const igMatch = existing.find(
      (c) => c.instagram_handle_normalized === candidate.instagramNormalized
    );
    if (igMatch) {
      return {
        matchType: "exact_instagram",
        matchedContactId: igMatch.id,
        matchFields: ["instagram"],
      };
    }
  }

  if (candidate.email) {
    const emailMatch = existing.find(
      (c) => c.email && c.email.toLowerCase() === candidate.email
    );
    if (emailMatch) {
      return {
        matchType: "exact_email",
        matchedContactId: emailMatch.id,
        matchFields: ["email"],
      };
    }
  }

  if (candidate.whatsapp) {
    const phoneMatch = existing.find((c) => c.whatsapp === candidate.whatsapp);
    if (phoneMatch) {
      return {
        matchType: "exact_phone",
        matchedContactId: phoneMatch.id,
        matchFields: ["whatsapp"],
      };
    }
  }

  // Possível duplicidade apenas quando nome completo normalizado E cidade coincidem
  if (candidate.fullName.length >= 4 && candidate.city) {
    const targetName = normalizeComparableName(candidate.fullName);
    const targetCity = normalizeComparableName(candidate.city);

    const possible = existing.find(
      (c) =>
        normalizeComparableName(c.full_name) === targetName &&
        normalizeComparableName(c.city) === targetCity
    );

    if (possible) {
      return {
        matchType: "possible_duplicate",
        matchedContactId: possible.id,
        matchFields: ["full_name", "city"],
      };
    }
  }

  return {
    matchType: "no_match",
    matchedContactId: null,
    matchFields: [],
  };
}
