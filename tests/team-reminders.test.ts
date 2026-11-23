import { describe, expect, it } from "vitest";
import {
  buildDailyTeamDigestText,
  computePendingDemandReminders,
  computeUpcomingBirthdayReminders,
  manualReminderSchema,
  reminderSettingsSchema,
} from "@/lib/utils/team-reminders";

describe("Módulo 2 — Lembretes Antecipados para a Equipe", () => {
  const fixedNow = new Date("2026-11-22T15:00:00.000Z");

  it("filtra aniversariantes pelo horizonte configurado e ignora contatos sem consentimento ativo", () => {
    const reminders = computeUpcomingBirthdayReminders(
      [
        {
          id: "c1",
          full_name: "Maria Consentida Hoje",
          city: "Imperatriz",
          neighborhood: "Centro",
          birth_day: 22,
          birth_month: 11,
          consent_status: "granted",
        },
        {
          id: "c2",
          full_name: "João Revogado Hoje",
          city: "Imperatriz",
          neighborhood: "Centro",
          birth_day: 22,
          birth_month: 11,
          consent_status: "revoked",
        },
        {
          id: "c3",
          full_name: "Paula Daqui 3 Dias",
          city: "Imperatriz",
          neighborhood: "Bacuri",
          birth_day: 25,
          birth_month: 11,
          consent_status: "granted",
        },
        {
          id: "c4",
          full_name: "Lucas Daqui 12 Dias",
          city: "Imperatriz",
          neighborhood: null,
          birth_day: 4,
          birth_month: 12,
          consent_status: "granted",
        },
      ],
      [0, 1, 3, 7],
      fixedNow
    );

    expect(reminders.map((r) => r.contactId)).toEqual(["c1", "c3"]);
    expect(reminders[0]?.horizonLabel).toBe("Hoje");
    expect(reminders[1]?.horizonLabel).toBe("Em 3 dias");
  });

  it("identifica demandas abertas de alta prioridade ou abertas há 7+ dias", () => {
    const pending = computePendingDemandReminders(
      [
        {
          id: "d1",
          protocol: "DEM-2026-1001",
          title: "Iluminação na praça",
          city: "Imperatriz",
          neighborhood: "Centro",
          priority: "alta",
          status: "recebida",
          created_at: "2026-11-21T12:00:00.000Z",
        },
        {
          id: "d2",
          protocol: "DEM-2026-1002",
          title: "Tapa-buraco",
          city: "Imperatriz",
          neighborhood: "Bacuri",
          priority: "media",
          status: "em_analise",
          created_at: "2026-11-10T12:00:00.000Z",
        },
        {
          id: "d3",
          protocol: "DEM-2026-1003",
          title: "Demanda já concluída",
          city: "Imperatriz",
          neighborhood: null,
          priority: "alta",
          status: "concluida",
          created_at: "2026-11-01T12:00:00.000Z",
        },
      ],
      fixedNow
    );

    expect(pending.map((d) => d.demandId)).toEqual(["d1", "d2"]);
    expect(pending[1]?.daysOpen).toBeGreaterThanOrEqual(7);
  });

  it("gera resumo interno da equipe e valida schemas de configuração/lembrete", () => {
    const digest = buildDailyTeamDigestText(
      "Mandato Exemplo",
      [
        {
          contactId: "c1",
          fullName: "Maria Consentida",
          city: "Imperatriz",
          neighborhood: "Centro",
          birthDay: 22,
          birthMonth: 11,
          daysUntil: 0,
          horizonLabel: "Hoje",
          whatsappUrl: null,
        },
      ],
      []
    );

    expect(digest).toContain("Resumo interno da equipe — Mandato Exemplo");
    expect(digest).toContain("Maria Consentida");

    expect(
      reminderSettingsSchema.safeParse({
        enabled: true,
        daysAhead: [0, 1, 7],
        includeBirthdays: true,
        includeOpenDemands: true,
        digestHourBrt: 8,
        dataScope: "mandate",
      }).success
    ).toBe(true);

    expect(
      manualReminderSchema.safeParse({
        title: "Retornar liderança",
        targetDate: "2026-11-25",
        dataScope: "mandate",
      }).success
    ).toBe(true);
  });
});
