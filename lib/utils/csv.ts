export interface ExportableSupporterRow {
  full_name: string;
  whatsapp: string | null;
  email: string | null;
  city: string;
  neighborhood: string | null;
  birth_day: number | null;
  birth_month: number | null;
  consent_source: string;
  consent_version: string;
  consented_at: string;
  interests: string[];
}

/**
 * Escapa célula CSV segundo RFC-4180 e neutraliza CSV Formula Injection (=, +, -, @).
 */
export function escapeCsvCell(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  let value = String(raw);

  if (/^[=+\-@\t\r]/.test(value)) {
    value = `'${value}`;
  }

  if (/[;"\r\n,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Gera CSV com BOM UTF-8 e separador ponto-e-vírgula (padrão Excel PT-BR).
 */
export function buildSupportersCsv(rows: ExportableSupporterRow[]): string {
  const headers = [
    "Nome",
    "WhatsApp",
    "E-mail",
    "Cidade",
    "Bairro",
    "Aniversário",
    "Interesses",
    "Origem do Consentimento",
    "Versão do Termo",
    "Data do Consentimento",
  ];

  const lines = [headers.map(escapeCsvCell).join(";")];

  for (const row of rows) {
    const birthday =
      row.birth_day && row.birth_month
        ? `${String(row.birth_day).padStart(2, "0")}/${String(
            row.birth_month
          ).padStart(2, "0")}`
        : "";

    const cols = [
      row.full_name,
      row.whatsapp ?? "",
      row.email ?? "",
      row.city,
      row.neighborhood ?? "",
      birthday,
      row.interests.join(", "),
      row.consent_source,
      row.consent_version,
      row.consented_at,
    ];

    lines.push(cols.map(escapeCsvCell).join(";"));
  }

  return `\uFEFF${lines.join("\r\n")}`;
}
