import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  Cake,
  Calendar,
  CheckCheck,
  ClipboardList,
  MessageCircle,
  Trash2,
} from "lucide-react";
import {
  deleteNotificationAction,
  markNotificationReadAction,
} from "@/app/painel/notificacoes/actions";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  CopyDigestButton,
  ManualReminderForm,
  ReminderSettingsForm,
} from "@/components/panel/team-reminders-client";
import {
  getTenantDisplayName,
  loadAuthenticatedMembership,
} from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Demand } from "@/lib/types/database";
import {
  buildDailyTeamDigestText,
  computePendingDemandReminders,
  computeUpcomingBirthdayReminders,
  DEFAULT_REMINDER_SETTINGS,
  type TeamNotificationRecord,
  type TeamReminderSettingsRecord,
} from "@/lib/utils/team-reminders";
import { buildOfficialBirthdayWhatsAppUrl } from "@/lib/utils/whatsapp";

export const metadata: Metadata = {
  title: "Lembretes da Equipe | Mandato+",
  description:
    "Central de lembretes antecipados de aniversários consentidos, demandas prioritárias e avisos internos do gabinete.",
};

export default async function NotificacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadAuthenticatedMembership(params.escopo);
  const scopeLabel = ctx.activeScope === "mandate" ? "Mandato" : "Campanha";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const displayName = getTenantDisplayName(ctx.tenant);

  let settings = DEFAULT_REMINDER_SETTINGS;
  let notifications: TeamNotificationRecord[] = [];
  let contactsWithBirthday: Contact[] = [];
  let openDemands: Demand[] = [];

  if (ctx.tenant) {
    const supabase = await createClient();
    const [
      { data: settingsRow },
      { data: notificationRows },
      { data: contactRows },
      { data: demandRows },
    ] = await Promise.all([
      supabase
        .from("team_reminder_settings")
        .select("*")
        .eq("tenant_id", ctx.tenant.id)
        .eq("data_scope", ctx.activeScope)
        .maybeSingle(),
      supabase
        .from("team_notifications")
        .select("*")
        .eq("tenant_id", ctx.tenant.id)
        .eq("data_scope", ctx.activeScope)
        .order("is_read", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("contacts")
        .select(
          "id, full_name, city, neighborhood, birth_day, birth_month, whatsapp, consent_status, unsubscribe_token"
        )
        .eq("tenant_id", ctx.tenant.id)
        .eq("data_scope", ctx.activeScope)
        .eq("consent_status", "granted")
        .not("birth_day", "is", null)
        .not("birth_month", "is", null),
      supabase
        .from("demands")
        .select(
          "id, protocol, title, city, neighborhood, priority, status, created_at"
        )
        .eq("tenant_id", ctx.tenant.id)
        .eq("data_scope", ctx.activeScope)
        .in("status", ["recebida", "em_analise", "em_andamento"])
        .order("created_at", { ascending: true })
        .limit(50),
    ]);

    if (settingsRow) {
      const typed = settingsRow as TeamReminderSettingsRecord;
      settings = {
        enabled: typed.enabled,
        days_ahead: typed.days_ahead,
        include_birthdays: typed.include_birthdays,
        include_open_demands: typed.include_open_demands,
        digest_hour_brt: typed.digest_hour_brt,
      };
    }

    notifications = (notificationRows ?? []) as TeamNotificationRecord[];
    contactsWithBirthday = (contactRows ?? []) as Contact[];
    openDemands = (demandRows ?? []) as Demand[];
  }

  const upcomingBirthdays =
    settings.enabled && settings.include_birthdays
      ? computeUpcomingBirthdayReminders(
          contactsWithBirthday.map((c) => ({
            ...c,
            whatsappUrl: buildOfficialBirthdayWhatsAppUrl({
              fullName: c.full_name,
              whatsapp: c.whatsapp,
              consentStatus: c.consent_status,
              tenantName: displayName,
              unsubscribeToken: c.unsubscribe_token,
              appUrl,
            }),
          })),
          settings.days_ahead
        )
      : [];

  const pendingDemands =
    settings.enabled && settings.include_open_demands
      ? computePendingDemandReminders(openDemands)
      : [];

  const digestText = buildDailyTeamDigestText(
    displayName,
    upcomingBirthdays,
    pendingDemands
  );

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
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
                Lembretes da Equipe
              </h1>
              <p className="mt-0.5 text-sm text-ink-secondary">
                Avisos antecipados internos para organização do gabinete · {scopeLabel}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CopyDigestButton text={digestText} />
              <Link
                href={`/painel/aniversariantes/calendario?escopo=${ctx.activeScope}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3.5 py-2 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
              >
                <Calendar className="h-3.5 w-3.5" />
                Calendário de aniversários
              </Link>
            </div>
          </header>

          {/* Resumo dos alertas ativos */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border-subtle bg-white p-5">
              <p className="text-xs text-ink-muted">Aniversariantes no horizonte</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-primary">
                {upcomingBirthdays.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white p-5">
              <p className="text-xs text-ink-muted">Demandas para revisar</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-primary">
                {pendingDemands.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white p-5">
              <p className="text-xs text-ink-muted">Lembretes manuais não lidos</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-emerald">
                {notifications.filter((n) => !n.is_read).length}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
            {/* Coluna principal: alertas automáticos + lembretes manuais */}
            <div className="space-y-6 lg:col-span-7">
              {/* Aniversariantes próximos */}
              <section className="space-y-3 rounded-2xl border border-border-subtle bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-brand-emerald" />
                    <h2 className="text-sm font-semibold text-ink-primary">
                      Aniversariantes próximos (consentimento ativo)
                    </h2>
                  </div>
                  <span className="text-[11px] text-ink-muted">
                    Até {Math.max(...settings.days_ahead, 0)} dias
                  </span>
                </div>

                {upcomingBirthdays.length === 0 ? (
                  <p className="text-xs text-ink-muted">
                    Nenhum aniversário previsto no horizonte configurado.
                  </p>
                ) : (
                  <ul className="divide-y divide-border-subtle/70">
                    {upcomingBirthdays.slice(0, 12).map((item) => (
                      <li
                        key={item.contactId}
                        className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/painel/base/${item.contactId}?escopo=${ctx.activeScope}`}
                              className="truncate font-medium text-ink-primary hover:underline"
                            >
                              {item.fullName}
                            </Link>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                item.daysUntil === 0
                                  ? "bg-brand-emerald-soft text-brand-emerald"
                                  : "bg-surface-muted text-ink-secondary"
                              }`}
                            >
                              {item.horizonLabel} ·{" "}
                              {String(item.birthDay).padStart(2, "0")}/
                              {String(item.birthMonth).padStart(2, "0")}
                            </span>
                          </div>
                          {item.neighborhood || item.city ? (
                            <p className="text-[11px] text-ink-muted">
                              {[item.neighborhood, item.city]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          ) : null}
                        </div>

                        {item.whatsappUrl ? (
                          <a
                            href={item.whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-xl bg-brand-emerald px-2.5 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
                          >
                            <MessageCircle className="h-3 w-3" />
                            Parabéns
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Demandas prioritárias ou pendentes */}
              <section className="space-y-3 rounded-2xl border border-border-subtle bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-brand-navy" />
                    <h2 className="text-sm font-semibold text-ink-primary">
                      Demandas prioritárias ou abertas há 7+ dias
                    </h2>
                  </div>
                  <Link
                    href={`/painel/demandas?escopo=${ctx.activeScope}`}
                    className="text-xs font-medium text-brand-navy hover:underline"
                  >
                    Abrir demandas
                  </Link>
                </div>

                {pendingDemands.length === 0 ? (
                  <p className="text-xs text-ink-muted">
                    Nenhuma demanda urgente ou atrasada no momento.
                  </p>
                ) : (
                  <ul className="divide-y divide-border-subtle/70">
                    {pendingDemands.slice(0, 10).map((d) => (
                      <li
                        key={d.demandId}
                        className="flex items-start justify-between gap-3 py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-primary">
                            {d.title}
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            {d.protocol} ·{" "}
                            {[d.neighborhood, d.city].filter(Boolean).join(", ")}{" "}
                            · aberta há {d.daysOpen}{" "}
                            {d.daysOpen === 1 ? "dia" : "dias"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            d.priority === "alta"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {d.priority === "alta" ? "Alta" : "Atenção"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Lembretes manuais salvos */}
              <section className="space-y-3 rounded-2xl border border-border-subtle bg-white p-5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-ink-secondary" />
                  <h2 className="text-sm font-semibold text-ink-primary">
                    Lembretes internos da equipe
                  </h2>
                </div>

                {notifications.length === 0 ? (
                  <p className="text-xs text-ink-muted">
                    Nenhum lembrete manual registrado ainda.
                  </p>
                ) : (
                  <ul className="divide-y divide-border-subtle/70">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`flex items-start justify-between gap-3 py-3 text-xs ${
                          n.is_read ? "opacity-60" : ""
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-medium text-ink-primary">
                            {n.title}
                          </p>
                          {n.body ? (
                            <p className="text-ink-secondary">{n.body}</p>
                          ) : null}
                          <p className="text-[11px] text-ink-muted">
                            {n.target_date
                              ? `Data alvo: ${n.target_date.split("-").reverse().join("/")}`
                              : "Sem data alvo"}{" "}
                            ·{" "}
                            {n.is_read ? "Concluído / Lido" : "Pendente"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          {ctx.canEditContacts && !n.is_read ? (
                            <form action={markNotificationReadAction}>
                              <input
                                type="hidden"
                                name="notificationId"
                                value={n.id}
                              />
                              <input
                                type="hidden"
                                name="dataScope"
                                value={ctx.activeScope}
                              />
                              <button
                                type="submit"
                                title="Marcar como concluído"
                                className="rounded-lg p-1.5 text-brand-emerald transition-colors hover:bg-brand-emerald-soft"
                              >
                                <CheckCheck className="h-4 w-4" />
                              </button>
                            </form>
                          ) : null}

                          {ctx.canDeleteContacts ? (
                            <form action={deleteNotificationAction}>
                              <input
                                type="hidden"
                                name="notificationId"
                                value={n.id}
                              />
                              <input
                                type="hidden"
                                name="dataScope"
                                value={ctx.activeScope}
                              />
                              <button
                                type="submit"
                                title="Excluir lembrete"
                                className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Coluna lateral: criar lembrete manual + configurações */}
            <div className="space-y-6 lg:col-span-5">
              {ctx.canEditContacts ? (
                <ManualReminderForm activeScope={ctx.activeScope} />
              ) : null}

              {ctx.canManageLinks ? (
                <ReminderSettingsForm
                  activeScope={ctx.activeScope}
                  initialEnabled={settings.enabled}
                  initialDaysAhead={settings.days_ahead}
                  initialIncludeBirthdays={settings.include_birthdays}
                  initialIncludeOpenDemands={settings.include_open_demands}
                  initialDigestHour={settings.digest_hour_brt}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </PanelShell>
  );
}
