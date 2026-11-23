export const MONTH_NAMES_PT_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const WEEKDAY_SHORT_PT_BR = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;

export interface BirthdayCalendarContact {
  id: string;
  fullName: string;
  initials: string;
  city: string | null;
  neighborhood: string | null;
  birthDay: number;
  birthMonth: number;
  whatsappUrl: string | null;
}

export interface CalendarDayCell {
  key: string;
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  contacts: BirthdayCalendarContact[];
}

export interface MonthlyBirthdayCount {
  month: number;
  label: string;
  shortLabel: string;
  count: number;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Monta a grade mensal (domingo a sábado) de aniversariantes com consentimento ativo.
 * Em anos não bissextos, aniversariantes de 29/02 aparecem em 28/02 para não passarem despercebidos.
 */
export function buildMonthCalendarGrid(
  year: number,
  month: number, // 1..12
  contacts: BirthdayCalendarContact[],
  today: { day: number; month: number; year: number }
): CalendarDayCell[] {
  const safeMonth = Math.min(12, Math.max(1, Math.trunc(month)));
  const firstDayOfMonth = new Date(Date.UTC(year, safeMonth - 1, 1));
  const startWeekday = firstDayOfMonth.getUTCDay(); // 0 = Dom
  const daysInMonth = new Date(Date.UTC(year, safeMonth, 0)).getUTCDate();
  const daysInPrevMonth = new Date(
    Date.UTC(year, safeMonth - 1, 0)
  ).getUTCDate();

  const contactsByDay = new Map<number, BirthdayCalendarContact[]>();
  const leap = isLeapYear(year);

  for (const contact of contacts) {
    if (contact.birthMonth !== safeMonth) continue;
    const effectiveDay =
      safeMonth === 2 && contact.birthDay === 29 && !leap
        ? 28
        : contact.birthDay;
    if (effectiveDay < 1 || effectiveDay > daysInMonth) continue;
    const list = contactsByDay.get(effectiveDay) ?? [];
    list.push(contact);
    contactsByDay.set(effectiveDay, list);
  }

  for (const [, list] of contactsByDay) {
    list.sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
  }

  const cells: CalendarDayCell[] = [];

  // Dias finais do mês anterior para completar a primeira semana
  const prevMonth = safeMonth === 1 ? 12 : safeMonth - 1;
  const prevYear = safeMonth === 1 ? year - 1 : year;
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    cells.push({
      key: `${prevYear}-${prevMonth}-${day}`,
      day,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
      isToday: false,
      contacts: [],
    });
  }

  // Dias do mês selecionado
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      key: `${year}-${safeMonth}-${day}`,
      day,
      month: safeMonth,
      year,
      isCurrentMonth: true,
      isToday:
        today.day === day && today.month === safeMonth && today.year === year,
      contacts: contactsByDay.get(day) ?? [],
    });
  }

  // Dias iniciais do próximo mês para fechar a última semana (múltiplo de 7)
  const nextMonth = safeMonth === 12 ? 1 : safeMonth + 1;
  const nextYear = safeMonth === 12 ? year + 1 : year;
  const remainder = cells.length % 7;
  if (remainder > 0) {
    const trailing = 7 - remainder;
    for (let day = 1; day <= trailing; day++) {
      cells.push({
        key: `${nextYear}-${nextMonth}-${day}`,
        day,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
        isToday: false,
        contacts: [],
      });
    }
  }

  return cells;
}

/**
 * Resume o total de aniversariantes consentidos em cada um dos 12 meses.
 */
export function buildMonthlySummary(
  contacts: BirthdayCalendarContact[]
): MonthlyBirthdayCount[] {
  const counts = new Array<number>(12).fill(0);
  for (const c of contacts) {
    if (c.birthMonth >= 1 && c.birthMonth <= 12) {
      counts[c.birthMonth - 1] += 1;
    }
  }

  return MONTH_NAMES_PT_BR.map((label, index) => ({
    month: index + 1,
    label,
    shortLabel: label.slice(0, 3),
    count: counts[index] ?? 0,
  }));
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Gera arquivo iCalendar (.ics) com os aniversários consentidos do mês/ano selecionado.
 * Privacidade LGPD: inclui apenas nome e município/bairro, nunca telefone ou e-mail.
 */
export function buildBirthdayCalendarIcs(
  contacts: BirthdayCalendarContact[],
  year: number,
  tenantName: string
): string {
  const leap = isLeapYear(year);
  const dtStamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mandato+//Calendario de Aniversarios//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(`Aniversariantes — ${tenantName}`)}`,
  ];

  for (const contact of contacts) {
    const effectiveDay =
      contact.birthMonth === 2 && contact.birthDay === 29 && !leap
        ? 28
        : contact.birthDay;
    const mm = String(contact.birthMonth).padStart(2, "0");
    const dd = String(effectiveDay).padStart(2, "0");
    const dtStart = `${year}${mm}${dd}`;

    const nextDate = new Date(
      Date.UTC(year, contact.birthMonth - 1, effectiveDay + 1)
    );
    const dtEnd = `${nextDate.getUTCFullYear()}${String(
      nextDate.getUTCMonth() + 1
    ).padStart(2, "0")}${String(nextDate.getUTCDate()).padStart(2, "0")}`;

    const location = [contact.neighborhood, contact.city]
      .filter(Boolean)
      .join(", ");

    lines.push(
      "BEGIN:VEVENT",
      `UID:birthday-${contact.id}-${year}@mandatomais`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${escapeIcsText(`Aniversário: ${contact.fullName}`)}`,
      `DESCRIPTION:${escapeIcsText(
        `Contato com consentimento ativo em ${tenantName}.${location ? ` Localidade: ${location}.` : ""} Envio manual recomendado pelo painel do Mandato+.`
      )}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
