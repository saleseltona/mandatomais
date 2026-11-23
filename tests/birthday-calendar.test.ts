import { describe, expect, it } from "vitest";
import {
  buildBirthdayCalendarIcs,
  buildMonthCalendarGrid,
  buildMonthlySummary,
  isLeapYear,
  type BirthdayCalendarContact,
} from "@/lib/utils/birthday-calendar";

const sampleContacts: BirthdayCalendarContact[] = [
  {
    id: "c1",
    fullName: "Carlos Souza",
    initials: "CS",
    city: "Imperatriz",
    neighborhood: "Centro",
    birthDay: 15,
    birthMonth: 11,
    whatsappUrl: "https://wa.me/5599999991111?text=Oi",
  },
  {
    id: "c2",
    fullName: "Ana Paula Lima",
    initials: "AL",
    city: "Imperatriz",
    neighborhood: "Bacuri",
    birthDay: 15,
    birthMonth: 11,
    whatsappUrl: "https://wa.me/5599999992222?text=Oi",
  },
  {
    id: "c3",
    fullName: "Bruno Bissexto",
    initials: "BB",
    city: "São Luís",
    neighborhood: null,
    birthDay: 29,
    birthMonth: 2,
    whatsappUrl: null,
  },
];

describe("Módulo 1 — Calendário de Aniversários", () => {
  it("monta grade mensal alinhada (múltiplo de 7) com ordenação alfabética no dia e marcação de hoje", () => {
    const grid = buildMonthCalendarGrid(2026, 11, sampleContacts, {
      day: 15,
      month: 11,
      year: 2026,
    });

    expect(grid.length % 7).toBe(0);
    const day15 = grid.find((c) => c.isCurrentMonth && c.day === 15);
    expect(day15).toBeDefined();
    expect(day15?.isToday).toBe(true);
    expect(day15?.contacts.map((c) => c.fullName)).toEqual([
      "Ana Paula Lima",
      "Carlos Souza",
    ]);
  });

  it("trata aniversariantes de 29/02 corretamente em anos não bissextos e bissextos", () => {
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2028)).toBe(true);

    const feb2026 = buildMonthCalendarGrid(2026, 2, sampleContacts, {
      day: 1,
      month: 2,
      year: 2026,
    });
    const day28In2026 = feb2026.find((c) => c.isCurrentMonth && c.day === 28);
    expect(day28In2026?.contacts.map((c) => c.id)).toEqual(["c3"]);

    const feb2028 = buildMonthCalendarGrid(2028, 2, sampleContacts, {
      day: 1,
      month: 2,
      year: 2028,
    });
    const day29In2028 = feb2028.find((c) => c.isCurrentMonth && c.day === 29);
    expect(day29In2028?.contacts.map((c) => c.id)).toEqual(["c3"]);
  });

  it("gera resumo mensal para todos os 12 meses", () => {
    const summary = buildMonthlySummary(sampleContacts);
    expect(summary).toHaveLength(12);
    expect(summary[1]).toMatchObject({ month: 2, label: "Fevereiro", count: 1 });
    expect(summary[10]).toMatchObject({ month: 11, label: "Novembro", count: 2 });
    expect(summary[0]?.count).toBe(0);
  });

  it("gera arquivo .ics válido sem vazar telefone ou e-mail", () => {
    const ics = buildBirthdayCalendarIcs(
      sampleContacts,
      2026,
      "Mandato Exemplo"
    );

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("SUMMARY:Aniversário: Ana Paula Lima");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261115");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260228");
    expect(ics).not.toContain("5599999991111");
    expect(ics).not.toContain("wa.me");
  });
});
