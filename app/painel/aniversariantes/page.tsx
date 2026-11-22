import type { Metadata } from "next";
import Link from "next/link";
import { BirthdayGreetingButton } from "@/components/panel/birthday-greeting-button";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  getInitials,
  getTenantDisplayName,
  loadAuthenticatedMembership,
} from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types/database";
import {
  buildOfficialBirthdayWhatsAppUrl,
  daysUntilBirthday,
  getTodayInBrazil,
} from "@/lib/utils/whatsapp";

export const metadata: Metadata = {
  title: "Aniversariantes | Mandato+",
  description:
    "Agenda de aniversariantes de hoje, dos próximos 7 dias e do mês com consentimento ativo.",
};

export default async function AniversariantesPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string; periodo?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadAuthenticatedMembership(params.escopo);
  const periodo =
    params.periodo === "semana" || params.periodo === "mes"
      ? params.periodo
      : "hoje";

  const { day: todayDay, month: todayMonth } = getTodayInBrazil();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const scopeQuery = `?escopo=${ctx.activeScope}`;

  let contactsWithBirthday: Contact[] = [];
  if (ctx.tenant) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("data_scope", ctx.activeScope)
      .eq("consent_status", "granted")
      .not("birth_day", "is", null)
      .not("birth_month", "is", null);

    contactsWithBirthday = (data as Contact[] | null) ?? [];
  }

  const enriched = contactsWithBirthday
    .filter(
      (c): c is Contact & { birth_day: number; birth_month: number } =>
        c.birth_day !== null && c.birth_month !== null
    )
    .map((c) => ({
      contact: c,
      daysUntil: daysUntilBirthday(c.birth_day, c.birth_month),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const filtered = enriched.filter(({ contact, daysUntil }) => {
    if (periodo === "hoje") return daysUntil === 0;
    if (periodo === "semana") return daysUntil >= 0 && daysUntil <= 7;
    return contact.birth_month === todayMonth;
  });

  const displayName = getTenantDisplayName(ctx.tenant);

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
          <header>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
              Aniversariantes
            </h1>
            <p className="mt-0.5 text-sm text-ink-secondary">
              Apenas contatos com consentimento ativo · envio individual pelo
              WhatsApp oficial
            </p>
          </header>

          {/* Abas de período */}
          <div className="flex items-center gap-2">
            {[
              { id: "hoje", label: `Hoje (${String(todayDay).padStart(2, "0")}/${String(todayMonth).padStart(2, "0")})` },
              { id: "semana", label: "Próximos 7 dias" },
              { id: "mes", label: "Este mês" },
            ].map((tab) => {
              const active = periodo === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={`/painel/aniversariantes${scopeQuery}&periodo=${tab.id}`}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-brand-navy text-white"
                      : "border border-border-subtle bg-white text-ink-secondary hover:text-ink-primary"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-border-subtle bg-white p-6">
              <p className="text-sm text-ink-secondary">
                Nenhum aniversariante encontrado neste período.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle/70 rounded-2xl border border-border-subtle bg-white">
              {filtered.map(({ contact, daysUntil }) => {
                const waUrl = buildOfficialBirthdayWhatsAppUrl({
                  fullName: contact.full_name,
                  whatsapp: contact.whatsapp,
                  consentStatus: contact.consent_status,
                  tenantName: displayName,
                  unsubscribeToken: contact.unsubscribe_token,
                  appUrl,
                });
                const firstName =
                  contact.full_name.trim().split(/\s+/)[0] ?? contact.full_name;
                const dateTag = `${String(contact.birth_day).padStart(
                  2,
                  "0"
                )}/${String(contact.birth_month).padStart(2, "0")}`;

                return (
                  <li
                    key={contact.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
                  >
                    <Link
                      href={`/painel/base/${contact.id}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-brand-navy">
                        {getInitials(contact.full_name)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-ink-primary hover:underline">
                            {contact.full_name}
                          </p>
                          <span className="shrink-0 text-xs font-medium text-ink-muted tabular-nums">
                            {daysUntil === 0 ? "Hoje" : dateTag}
                          </span>
                        </div>
                        <p className="truncate text-xs text-ink-muted">
                          {contact.neighborhood
                            ? `${contact.neighborhood}, ${contact.city}`
                            : contact.city}
                        </p>
                      </div>
                    </Link>

                    {waUrl ? (
                      <BirthdayGreetingButton
                        contactId={contact.id}
                        firstName={firstName}
                        whatsappUrl={waUrl}
                        variant="compact"
                      />
                    ) : (
                      <span className="text-xs text-ink-muted">
                        Sem WhatsApp
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </PanelShell>
  );
}
