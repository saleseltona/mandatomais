import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BirthdayCalendarView } from "@/components/panel/birthday-calendar-view";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  getInitials,
  getTenantDisplayName,
  loadAuthenticatedMembership,
} from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types/database";
import type { BirthdayCalendarContact } from "@/lib/utils/birthday-calendar";
import {
  buildOfficialBirthdayWhatsAppUrl,
  getTodayInBrazil,
} from "@/lib/utils/whatsapp";

export const metadata: Metadata = {
  title: "Calendário de Aniversários | Mandato+",
  description:
    "Visão mensal de aniversariantes com consentimento ativo e envio individual pelo WhatsApp oficial.",
};

export default async function CalendarioAniversariosPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string; mes?: string; ano?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadAuthenticatedMembership(params.escopo);
  const { day: todayDay, month: todayMonth } = getTodayInBrazil();
  const todayYear = new Date().getUTCFullYear();

  const parsedMonth = Number(params.mes);
  const initialMonth =
    Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : todayMonth;

  const parsedYear = Number(params.ano);
  const initialYear =
    Number.isInteger(parsedYear) && parsedYear >= 2020 && parsedYear <= 2100
      ? parsedYear
      : todayYear;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const displayName = getTenantDisplayName(ctx.tenant);

  let calendarContacts: BirthdayCalendarContact[] = [];

  if (ctx.tenant) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("contacts")
      .select(
        "id, full_name, city, neighborhood, birth_day, birth_month, whatsapp, consent_status, unsubscribe_token"
      )
      .eq("tenant_id", ctx.tenant.id)
      .eq("data_scope", ctx.activeScope)
      .eq("consent_status", "granted")
      .not("birth_day", "is", null)
      .not("birth_month", "is", null);

    const rows = (data as Contact[] | null) ?? [];
    calendarContacts = rows
      .filter(
        (c): c is Contact & { birth_day: number; birth_month: number } =>
          c.birth_day !== null && c.birth_month !== null
      )
      .map((c) => ({
        id: c.id,
        fullName: c.full_name,
        initials: getInitials(c.full_name),
        city: c.city,
        neighborhood: c.neighborhood,
        birthDay: c.birth_day,
        birthMonth: c.birth_month,
        whatsappUrl: buildOfficialBirthdayWhatsAppUrl({
          fullName: c.full_name,
          whatsapp: c.whatsapp,
          consentStatus: c.consent_status,
          tenantName: displayName,
          unsubscribeToken: c.unsubscribe_token,
          appUrl,
        }),
      }));
  }

  return (
    <PanelShell
      tenant={ctx.tenant}
      allMemberships={ctx.allMemberships}
      userEmail={ctx.userEmail}
      userProfile={ctx.userProfile}
      activeScope={ctx.activeScope}
      activeTab="aniversariantes"
    >
      {!ctx.tenant ? (
        <OnboardingTenantForm />
      ) : (
        <div className="space-y-6">
          <header className="space-y-2">
            <Link
              href={`/painel/aniversariantes?escopo=${ctx.activeScope}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary transition-colors hover:text-ink-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para lista de aniversariantes
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
                Calendário de Aniversários
              </h1>
              <p className="mt-0.5 text-sm text-ink-secondary">
                Planeje cumprimentos individuais mês a mês · apenas contatos com consentimento ativo
              </p>
            </div>
          </header>

          <BirthdayCalendarView
            contacts={calendarContacts}
            initialMonth={initialMonth}
            initialYear={initialYear}
            today={{ day: todayDay, month: todayMonth, year: todayYear }}
            activeScope={ctx.activeScope}
            canExportIcs={ctx.canExportData}
          />
        </div>
      )}
    </PanelShell>
  );
}
