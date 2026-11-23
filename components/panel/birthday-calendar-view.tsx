"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Cake,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import type { DataScope } from "@/lib/types/database";
import {
  buildMonthCalendarGrid,
  buildMonthlySummary,
  MONTH_NAMES_PT_BR,
  WEEKDAY_SHORT_PT_BR,
  type BirthdayCalendarContact,
} from "@/lib/utils/birthday-calendar";

export function BirthdayCalendarView({
  contacts,
  initialMonth,
  initialYear,
  today,
  activeScope,
  canExportIcs,
}: {
  contacts: BirthdayCalendarContact[];
  initialMonth: number;
  initialYear: number;
  today: { day: number; month: number; year: number };
  activeScope: DataScope;
  canExportIcs: boolean;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [cityFilter, setCityFilter] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(
    initialMonth === today.month && initialYear === today.year ? today.day : 1
  );

  const cities = useMemo(() => {
    return Array.from(
      new Set(contacts.map((c) => c.city).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    if (!cityFilter) return contacts;
    return contacts.filter((c) => c.city === cityFilter);
  }, [contacts, cityFilter]);

  const monthlySummary = useMemo(
    () => buildMonthlySummary(filteredContacts),
    [filteredContacts]
  );

  const grid = useMemo(
    () => buildMonthCalendarGrid(year, month, filteredContacts, today),
    [year, month, filteredContacts, today]
  );

  const monthTotal = monthlySummary[month - 1]?.count ?? 0;

  const selectedCell = useMemo(() => {
    return (
      grid.find((c) => c.isCurrentMonth && c.day === selectedDay) ??
      grid.find((c) => c.isCurrentMonth && c.contacts.length > 0) ??
      grid.find((c) => c.isCurrentMonth) ??
      null
    );
  }, [grid, selectedDay]);

  function goToPrevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDay(1);
  }

  function goToNextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDay(1);
  }

  function goToToday() {
    setMonth(today.month);
    setYear(today.year);
    setSelectedDay(today.day);
  }

  const icsHref = `/painel/aniversariantes/calendario/ics?escopo=${activeScope}&mes=${month}&ano=${year}`;

  return (
    <div className="space-y-6">
      {/* Barra de controles do mês e filtro por município */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-white p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPrevMonth}
            aria-label="Mês anterior"
            className="rounded-xl border border-border-subtle p-2 text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="min-w-[160px] text-center">
            <p className="text-sm font-semibold text-ink-primary">
              {MONTH_NAMES_PT_BR[month - 1]} de {year}
            </p>
            <p className="text-[11px] text-ink-muted">
              {monthTotal}{" "}
              {monthTotal === 1
                ? "aniversariante no mês"
                : "aniversariantes no mês"}
            </p>
          </div>

          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Próximo mês"
            className="rounded-xl border border-border-subtle p-2 text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={goToToday}
            className="ml-1 rounded-xl border border-border-subtle px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary"
          >
            Hoje
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cities.length > 0 ? (
            <select
              aria-label="Filtrar por município"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="rounded-xl border border-border-subtle bg-white px-3 py-1.5 text-xs text-ink-primary"
            >
              <option value="">Todos os municípios</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : null}

          {canExportIcs ? (
            <a
              href={icsHref}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar agenda (.ics)
            </a>
          ) : null}
        </div>
      </div>

      {/* Resumo anual rápido (12 meses) */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
        {monthlySummary.map((item) => {
          const isActive = item.month === month;
          return (
            <button
              key={item.month}
              type="button"
              onClick={() => {
                setMonth(item.month);
                setSelectedDay(1);
              }}
              className={`rounded-xl border px-2 py-2 text-center transition-colors ${
                isActive
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-border-subtle bg-white text-ink-secondary hover:bg-surface-muted hover:text-ink-primary"
              }`}
            >
              <p className="text-[11px] font-medium">{item.shortLabel}</p>
              <p
                className={`mt-0.5 text-xs font-semibold tabular-nums ${
                  isActive ? "text-white" : "text-ink-primary"
                }`}
              >
                {item.count}
              </p>
            </button>
          );
        })}
      </div>

      {/* Grade mensal + painel de detalhes do dia */}
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-white lg:col-span-8">
          <div className="grid grid-cols-7 border-b border-border-subtle bg-canvas/70">
            {WEEKDAY_SHORT_PT_BR.map((label) => (
              <div
                key={label}
                className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-border-subtle/60">
            {grid.map((cell) => {
              const isSelected =
                cell.isCurrentMonth && selectedCell?.day === cell.day;
              const hasBirthdays = cell.contacts.length > 0;

              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={!cell.isCurrentMonth}
                  onClick={() => cell.isCurrentMonth && setSelectedDay(cell.day)}
                  className={`min-h-[76px] p-2 text-left transition-colors sm:min-h-[92px] ${
                    !cell.isCurrentMonth
                      ? "cursor-default bg-canvas/40 text-ink-muted/40"
                      : isSelected
                        ? "bg-brand-emerald-soft/60 ring-1 ring-inset ring-brand-emerald"
                        : "bg-white hover:bg-surface-muted/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium tabular-nums ${
                        cell.isToday
                          ? "bg-brand-navy text-white"
                          : cell.isCurrentMonth
                            ? "text-ink-primary"
                            : "text-ink-muted/50"
                      }`}
                    >
                      {cell.day}
                    </span>
                    {hasBirthdays ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-emerald-soft px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-brand-emerald">
                        <Cake className="h-2.5 w-2.5" />
                        {cell.contacts.length}
                      </span>
                    ) : null}
                  </div>

                  {hasBirthdays ? (
                    <div className="mt-1.5 hidden space-y-0.5 sm:block">
                      {cell.contacts.slice(0, 2).map((c) => (
                        <p
                          key={c.id}
                          className="truncate text-[11px] text-ink-secondary"
                        >
                          {c.fullName.split(" ")[0]}
                        </p>
                      ))}
                      {cell.contacts.length > 2 ? (
                        <p className="text-[10px] font-medium text-ink-muted">
                          +{cell.contacts.length - 2} mais
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalhes do dia selecionado */}
        <aside className="space-y-4 rounded-2xl border border-border-subtle bg-white p-5 lg:col-span-4">
          <div className="flex items-center justify-between gap-2 border-b border-border-subtle/70 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-emerald-soft text-brand-emerald">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink-primary">
                  {selectedCell
                    ? `${String(selectedCell.day).padStart(2, "0")} de ${MONTH_NAMES_PT_BR[month - 1]}`
                    : MONTH_NAMES_PT_BR[month - 1]}
                </h2>
                <p className="text-[11px] text-ink-muted">
                  {selectedCell?.contacts.length ?? 0}{" "}
                  {(selectedCell?.contacts.length ?? 0) === 1
                    ? "aniversariante"
                    : "aniversariantes"}
                </p>
              </div>
            </div>
          </div>

          {!selectedCell || selectedCell.contacts.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs font-medium text-ink-primary">
                Nenhum aniversário nesta data
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">
                Selecione um dia destacado no calendário para ver os contatos e enviar parabéns individuais.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle/70">
              {selectedCell.contacts.map((contact) => (
                <li key={contact.id} className="space-y-2.5 py-3 first:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-ink-primary">
                      {contact.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/painel/base/${contact.id}?escopo=${activeScope}`}
                        className="block truncate text-sm font-medium text-ink-primary hover:underline"
                      >
                        {contact.fullName}
                      </Link>
                      <p className="truncate text-[11px] text-ink-muted">
                        {[contact.neighborhood, contact.city]
                          .filter(Boolean)
                          .join(", ") || "Localidade não informada"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {contact.whatsappUrl ? (
                      <a
                        href={contact.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-emerald px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Enviar parabéns
                      </a>
                    ) : (
                      <span className="text-[11px] text-ink-muted">
                        Sem WhatsApp válido
                      </span>
                    )}
                    <Link
                      href={`/painel/base/${contact.id}?escopo=${activeScope}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary"
                    >
                      Ficha
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
