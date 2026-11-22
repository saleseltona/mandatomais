import type { ConsentStatus } from "@/lib/types/database";

export interface BirthdayGreetingParams {
  fullName: string;
  whatsapp: string | null;
  consentStatus: ConsentStatus;
  tenantName: string;
  unsubscribeToken: string;
  appUrl: string;
}

/**
 * Normaliza telefone brasileiro para formato aceito pelo link oficial wa.me (somente dígitos com DDI 55).
 */
export function formatBrazilianWhatsAppE164(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) {
    return null;
  }

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return null;
}

/**
 * Gera link oficial do WhatsApp (wa.me) para parabéns individual e manual.
 * Regras obrigatórias:
 * - Nunca gera link para contato sem consentimento ativo ('granted').
 * - Sempre inclui link de descadastro fácil na mensagem.
 */
export function buildOfficialBirthdayWhatsAppUrl(
  params: BirthdayGreetingParams
): string | null {
  if (params.consentStatus !== "granted") {
    return null;
  }

  const phone = formatBrazilianWhatsAppE164(params.whatsapp);
  if (!phone) {
    return null;
  }

  const firstName = params.fullName.trim().split(/\s+/)[0] || "Olá";
  const cleanAppUrl = params.appUrl.replace(/\/+$/, "");
  const unsubscribeUrl = `${cleanAppUrl}/descadastro/${params.unsubscribeToken}`;

  const message = [
    `Olá, ${firstName}!`,
    `Passando para desejar um feliz aniversário, com muita saúde e realizações. Um abraço de ${params.tenantName}.`,
    "",
    `Caso não deseje mais receber nossas mensagens, você pode se descadastrar a qualquer momento em: ${unsubscribeUrl}`,
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Retorna dia e mês atuais no fuso horário oficial de Brasília (America/Sao_Paulo).
 */
export function getTodayInBrazil(now: Date = new Date()): {
  day: number;
  month: number;
} {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "numeric",
  }).formatToParts(now);

  const day = Number(parts.find((p) => p.type === "day")?.value ?? now.getDate());
  const month = Number(
    parts.find((p) => p.type === "month")?.value ?? now.getMonth() + 1
  );

  return { day, month };
}
