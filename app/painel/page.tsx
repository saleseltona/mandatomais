import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  Link2,
  Plus,
  Tag,
  User,
  UserPlus,
} from "lucide-react";
import { BirthdayGreetingButton } from "@/components/panel/birthday-greeting-button";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { ShareLinkButton } from "@/components/panel/share-link-button";
import {
  getInitials,
  getTenantDisplayName,
  loadPanelSummary,
} from "@/lib/supabase/panel-data";
import {
  buildOfficialBirthdayWhatsAppUrl,
  getTodayInBrazil,
} from "@/lib/utils/whatsapp";

export const metadata: Metadata = {
  title: "Início | Mandato+",
  description:
    "Visão geral da base de apoiadores, aniversariantes do dia e links de cadastro.",
};

function getBrazilGreeting(): string {
  const hourStr = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  const hour = Number(hourStr);

  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadPanelSummary(params.escopo);
  const { day: todayDay, month: todayMonth } = getTodayInBrazil();
  const greeting = getBrazilGreeting();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const activeLinks = ctx.links.filter((l) => l.is_active);
  const primaryLink = activeLinks[0] ?? ctx.links[0] ?? null;
  const scopeQuery = `?escopo=${ctx.activeScope}`;
  const scopeLabel = ctx.activeScope === "mandate" ? "Mandato" : "Campanha";
  const hasContacts = ctx.activeContactsCount > 0;

  const displayName = getTenantDisplayName(ctx.tenant);

  return (
    <PanelShell
      tenant={ctx.tenant}
      userEmail={ctx.userEmail}
      userProfile={ctx.userProfile}
      activeScope={ctx.activeScope}
      activeTab="inicio"
    >
      {!ctx.tenant ? (
        <OnboardingTenantForm />
      ) : (
        <div className="space-y-7">
          {/* 1. Cabeçalho compacto */}
          <header className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-ink-secondary">
                {greeting}
              </p>
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink-primary sm:text-2xl">
                {displayName}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Alternador discreto no mobile (desktop usa a sidebar) */}
              <div
                role="group"
                aria-label="Alternar base"
                className="grid grid-cols-2 rounded-lg bg-surface-muted p-0.5 text-xs lg:hidden"
              >
                <Link
                  href="/painel?escopo=mandate"
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    ctx.activeScope === "mandate"
                      ? "bg-white text-brand-navy shadow-2xs"
                      : "text-ink-secondary"
                  }`}
                >
                  Mandato
                </Link>
                <Link
                  href="/painel?escopo=campaign"
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    ctx.activeScope === "campaign"
                      ? "bg-white text-brand-navy shadow-2xs"
                      : "text-ink-secondary"
                  }`}
                >
                  Campanha
                </Link>
              </div>

              <Link
                href={`/painel/perfil${scopeQuery}`}
                aria-label="Abrir meu perfil"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-white text-ink-secondary transition-colors hover:text-ink-primary lg:hidden"
              >
                <User className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
          </header>

          {/* Composição Desktop 12 colunas (7 + 5) / Mobile empilhado com intenção */}
          <div className="grid gap-7 lg:grid-cols-12 lg:items-start">
            <div className="space-y-7 lg:col-span-7">
              {/* 2. Bloco principal (referência visual limpa, número protagonista) */}
              <section
                aria-label="Resumo da base"
                className="rounded-2xl bg-brand-navy p-6 text-white sm:p-7"
              >
                <div className="flex items-center justify-between gap-3 text-xs text-white/70">
                  <span>{scopeLabel}</span>
                  {activeLinks.length > 0 ? (
                    <span className="tabular-nums">
                      {activeLinks.length}{" "}
                      {activeLinks.length === 1 ? "link ativo" : "links ativos"}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4">
                  <p className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
                    {ctx.activeContactsCount.toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    {ctx.activeContactsCount === 1
                      ? "apoiador na base"
                      : "apoiadores na base"}
                    {ctx.todaysBirthdays.length > 0
                      ? ` · ${ctx.todaysBirthdays.length} ${
                          ctx.todaysBirthdays.length === 1
                            ? "aniversariante hoje"
                            : "aniversariantes hoje"
                        }`
                      : ""}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2.5">
                  <Link
                    href={`/painel/base/novo${scopeQuery}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-emerald px-4 text-sm font-medium text-white transition-colors hover:bg-brand-emerald-hover active:scale-[0.99]"
                  >
                    <UserPlus
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <span>Novo apoiador</span>
                  </Link>

                  {primaryLink ? (
                    <ShareLinkButton
                      path={`/cadastro/${primaryLink.slug}`}
                      tenantName={ctx.tenant.name}
                      variant="hero"
                      label="Compartilhar link"
                      className="w-full"
                    />
                  ) : (
                    <Link
                      href={`/painel/links${scopeQuery}`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/12 px-4 text-sm font-medium text-white transition-colors hover:bg-white/18 active:scale-[0.99]"
                    >
                      <Plus
                        className="h-4 w-4"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>Criar link</span>
                    </Link>
                  )}
                </div>
              </section>

              {/* Estado vazio intencional quando não há apoiadores */}
              {!hasContacts ? (
                <section className="rounded-2xl border border-border-subtle bg-white p-6">
                  <h2 className="text-base font-semibold text-ink-primary">
                    Sua base começa aqui.
                  </h2>
                  <p className="mt-1 text-sm text-ink-secondary">
                    {primaryLink
                      ? "Compartilhe seu link de cadastro para receber os primeiros apoiadores."
                      : "Crie um link para receber os primeiros cadastros."}
                  </p>
                  <div className="mt-4">
                    {primaryLink ? (
                      <ShareLinkButton
                        path={`/cadastro/${primaryLink.slug}`}
                        tenantName={ctx.tenant.name}
                        variant="light"
                        label="Compartilhar link"
                      />
                    ) : (
                      <Link
                        href={`/painel/links${scopeQuery}`}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-navy px-4 text-sm font-medium text-white transition-colors hover:bg-brand-navy-hover"
                      >
                        Criar link
                      </Link>
                    )}
                  </div>
                </section>
              ) : null}

              {/* 5. Acessos secundários em lista compacta */}
              <section aria-labelledby="acessos-heading" className="space-y-2.5">
                <h2
                  id="acessos-heading"
                  className="px-1 text-sm font-semibold text-ink-primary"
                >
                  Atalhos
                </h2>

                <div className="divide-y divide-border-subtle/70 rounded-2xl border border-border-subtle bg-white">
                  <Link
                    href={`/painel/links${scopeQuery}`}
                    className="flex min-h-[56px] items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-canvas first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <Link2
                        className="h-[18px] w-[18px] text-ink-secondary"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-medium text-ink-primary">
                          Links públicos
                        </p>
                        <p className="text-xs text-ink-muted">
                          {primaryLink
                            ? `/cadastro/${primaryLink.slug}`
                            : "Nenhum link criado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ink-secondary">
                      <span className="tabular-nums">{ctx.links.length}</span>
                      <ChevronRight
                        className="h-4 w-4 text-ink-muted"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </div>
                  </Link>

                  <Link
                    href={`/painel/links${scopeQuery}#temas`}
                    className="flex min-h-[56px] items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-canvas first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <Tag
                        className="h-[18px] w-[18px] text-ink-secondary"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-medium text-ink-primary">
                          Temas de interesse
                        </p>
                        <p className="text-xs text-ink-muted">
                          Organização da base por pauta
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ink-secondary">
                      <span className="tabular-nums">
                        {ctx.interests.length}
                      </span>
                      <ChevronRight
                        className="h-4 w-4 text-ink-muted"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </div>
              </section>
            </div>

            {/* 3. Aniversariantes de hoje (coluna lateral no Desktop / logo abaixo no Mobile) */}
            <section
              id="aniversariantes"
              aria-labelledby="aniversariantes-heading"
              className="space-y-2.5 lg:col-span-5"
            >
              <div className="flex items-baseline justify-between px-1">
                <h2
                  id="aniversariantes-heading"
                  className="text-sm font-semibold text-ink-primary"
                >
                  Aniversariantes de hoje
                </h2>
                <span className="text-xs text-ink-muted tabular-nums">
                  {String(todayDay).padStart(2, "0")}/
                  {String(todayMonth).padStart(2, "0")}
                </span>
              </div>

              {ctx.todaysBirthdays.length === 0 ? (
                <div className="rounded-2xl border border-border-subtle bg-white px-5 py-6">
                  <p className="text-sm text-ink-secondary">
                    Nenhum aniversariante hoje.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border-subtle/70 rounded-2xl border border-border-subtle bg-white">
                  {ctx.todaysBirthdays.map((person) => {
                    const waUrl = buildOfficialBirthdayWhatsAppUrl({
                      fullName: person.full_name,
                      whatsapp: person.whatsapp,
                      consentStatus: person.consent_status,
                      tenantName: ctx.tenant!.name,
                      unsubscribeToken: person.unsubscribe_token,
                      appUrl,
                    });
                    const firstName =
                      person.full_name.trim().split(/\s+/)[0] ??
                      person.full_name;

                    return (
                      <li
                        key={person.id}
                        className="flex items-center justify-between gap-3 px-4 py-3.5"
                      >
                        <Link
                          href={`/painel/base/${person.id}`}
                          className="flex min-w-0 items-center gap-3"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-brand-navy">
                            {getInitials(person.full_name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink-primary hover:underline">
                              {person.full_name}
                            </p>
                            <p className="truncate text-xs text-ink-muted">
                              {person.neighborhood
                                ? `${person.neighborhood}, ${person.city}`
                                : person.city}
                            </p>
                          </div>
                        </Link>

                        {waUrl ? (
                          <BirthdayGreetingButton
                            contactId={person.id}
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

              {hasContacts ? (
                <div className="px-1 pt-1">
                  <Link
                    href={`/painel/base${scopeQuery}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-ink-secondary transition-colors hover:text-brand-navy"
                  >
                    <span>Ver todos os apoiadores</span>
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      )}
    </PanelShell>
  );
}
