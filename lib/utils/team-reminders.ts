import { z } from "zod";
import type { Contact, DataScope, Demand } from "@/lib/types/database";
import { daysUntilBirthday } from "@/lib/utils/whatsapp";

export const ALLOWED_REMINDER_HORIZONS = [0, 1, 3, 7, 15] as const;

export interface TeamReminderSettingsRecord {
  id: string;
  tenant_id: string;
  data_scope: DataScope;
  enabled: boolean;
  days_ahead: number[];
  include_birthdays: boolean;
  include_open_demands: boolean;
  digest_hour_brt: number;
  updated_at: string;
}

export type TeamNotificationKind =
  | "birthday_upcoming"
  | "demand_pending"
  | "survey_alert"
  | "manual";

export interface TeamNotificationRecord {
  id: string;
  tenant_id: string;
  data_scope: DataScope;
  kind: TeamNotificationKind;
  title: string;
  body: string | null;
  target_date: string | null;
  reference_entity_type: string | null;
  reference_entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface UpcomingBirthdayReminder {
  contactId: string;
  fullName: string;
  city: string | null;
  neighborhood: string | null;
  birthDay: number;
  birthMonth: number;
  daysUntil: number;
  horizonLabel: string;
  whatsappUrl: string | null;
}

export interface PendingDemandReminder {
  demandId: string;
  protocol: string;
  title: string;
  city: string;
  neighborhood: string | null;
  priority: "baixa" | "media" | "alta";
  status: string;
  daysOpen: number;
}

export const DEFAULT_REMINDER_SETTINGS = {
  enabled: true,
  days_ahead: [0, 1, 3, 7],
  include_birthdays: true,
  include_open_demands: true,
  digest_hour_brt: 8,
};

export const reminderSettingsSchema = z.object({
  enabled: z.boolean(),
  daysAhead: z
    .array(z.number().int().min(0).max(30))
    .min(1, "Selecione ao menos uma antecedência de lembrete.")
    .max(5),
  includeBirthdays: z.boolean(),
  includeOpenDemands: z.boolean(),
  digestHourBrt: z.coerce.number().int().min(6).max(21).default(8),
  dataScope: z.enum(["mandate", "campaign"]).default("mandate"),
});

export const manualReminderSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Informe um título para o lembrete (mín. 3 caracteres).")
    .max(140),
  body: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null),
  targetDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)),
  dataScope: z.enum(["mandate", "campaign"]).default("mandate"),
});

export function formatHorizonLabel(daysUntil: number): string {
  if (daysUntil === 0) return "Hoje";
  if (daysUntil === 1) return "Amanhã";
  return `Em ${daysUntil} dias`;
}

/**
 * Calcula lembretes antecipados de aniversários APENAS para contatos com consentimento ativo ('granted').
 */
export function computeUpcomingBirthdayReminders(
  contacts: Array<
    Pick<
      Contact,
      | "id"
      | "full_name"
      | "city"
      | "neighborhood"
      | "birth_day"
      | "birth_month"
      | "consent_status"
    > & { whatsappUrl?: string | null }
  >,
  daysAhead: number[],
  now: Date = new Date()
): UpcomingBirthdayReminder[] {
  const maxDays = daysAhead.length > 0 ? Math.max(...daysAhead) : 7;
  const results: UpcomingBirthdayReminder[] = [];

  for (const c of contacts) {
    if (c.consent_status !== "granted") continue;
    if (c.birth_day === null || c.birth_month === null) continue;

    const daysUntil = daysUntilBirthday(c.birth_day, c.birth_month, now);
    if (daysUntil < 0 || daysUntil > maxDays) continue;

    results.push({
      contactId: c.id,
      fullName: c.full_name,
      city: c.city,
      neighborhood: c.neighborhood,
      birthDay: c.birth_day,
      birthMonth: c.birth_month,
      daysUntil,
      horizonLabel: formatHorizonLabel(daysUntil),
      whatsappUrl: c.whatsappUrl ?? null,
    });
  }

  return results.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return a.fullName.localeCompare(b.fullName, "pt-BR");
  });
}

/**
 * Identifica demandas abertas prioritárias ou sem conclusão há mais de 7 dias para revisão da equipe.
 */
export function computePendingDemandReminders(
  demands: Array<
    Pick<
      Demand,
      | "id"
      | "protocol"
      | "title"
      | "city"
      | "neighborhood"
      | "priority"
      | "status"
      | "created_at"
    >
  >,
  now: Date = new Date()
): PendingDemandReminder[] {
  const openStatuses = new Set(["recebida", "em_analise", "em_andamento"]);
  const nowMs = now.getTime();
  const list: PendingDemandReminder[] = [];

  for (const d of demands) {
    if (!openStatuses.has(d.status)) continue;
    const createdMs = new Date(d.created_at).getTime();
    const daysOpen = Math.max(0, Math.floor((nowMs - createdMs) / 86_400_000));

    if (d.priority === "alta" || daysOpen >= 7) {
      list.push({
        demandId: d.id,
        protocol: d.protocol,
        title: d.title,
        city: d.city,
        neighborhood: d.neighborhood,
        priority: d.priority,
        status: d.status,
        daysOpen,
      });
    }
  }

  return list.sort((a, b) => {
    const pOrder = { alta: 0, media: 1, baixa: 2 };
    if (pOrder[a.priority] !== pOrder[b.priority]) {
      return pOrder[a.priority] - pOrder[b.priority];
    }
    return b.daysOpen - a.daysOpen;
  });
}

/**
 * Gera resumo diário interno (para a equipe copiar e alinhar no grupo interno do gabinete).
 */
export function buildDailyTeamDigestText(
  tenantName: string,
  birthdays: UpcomingBirthdayReminder[],
  demands: PendingDemandReminder[]
): string {
  const lines: string[] = [
    `Resumo interno da equipe — ${tenantName}`,
    "",
  ];

  if (birthdays.length > 0) {
    lines.push(`Aniversariantes próximos (${birthdays.length}):`);
    for (const b of birthdays.slice(0, 10)) {
      const dateStr = `${String(b.birthDay).padStart(2, "0")}/${String(b.birthMonth).padStart(2, "0")}`;
      lines.push(`• ${b.horizonLabel} (${dateStr}): ${b.fullName}`);
    }
    if (birthdays.length > 10) {
      lines.push(`• ... e mais ${birthdays.length - 10} no painel.`);
    }
    lines.push("");
  } else {
    lines.push("Nenhum aniversário próximo no horizonte configurado.", "");
  }

  if (demands.length > 0) {
    lines.push(`Demandas para acompanhamento (${demands.length}):`);
    for (const d of demands.slice(0, 8)) {
      lines.push(
        `• [${d.protocol}] ${d.title} (${d.priority === "alta" ? "Alta prioridade" : `${d.daysOpen}d aberta`})`
      );
    }
    lines.push("");
  }

  lines.push("Acesse o painel do Mandato+ para envios individuais e atualizações.");
  return lines.join("\n");
}
