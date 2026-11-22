import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { BirthdayGreetingButton } from "@/components/panel/birthday-greeting-button";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { getInitials, loadPaginatedBase } from "@/lib/supabase/panel-data";
import {
  buildOfficialBirthdayWhatsAppUrl,
  getTodayInBrazil,
} from "@/lib/utils/whatsapp";

export const metadata: Metadata = {
  title: "Base | Mandato+",
  description:
    "Lista de apoiadores organizada por cidade, bairro e tema de interesse.",
};

interface BaseSearchParams {
  escopo?: string;
  cidade?: string;
  bairro?: string;
  interesse?: string;
  busca?: string;
  pagina?: string;
}

function buildBaseUrl(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const str = qs.toString();
  return str ? `/painel/base?${str}` : "/painel/base";
}

export default async function BaseApoiadoresPage({
  searchParams,
}: {
  searchParams: Promise<BaseSearchParams>;
}) {
  const params = await searchParams;
  const ctx = await loadPaginatedBase(params);
  const { day: todayDay, month: todayMonth } = getTodayInBrazil();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const selectedCity = params.cidade?.trim() ?? "";
  const selectedNeighborhood = params.bairro?.trim() ?? "";
  const selectedInterest = params.interesse?.trim() ?? "";
  const searchQuery = params.busca?.trim() ?? "";
  const scopeQuery = `?escopo=${ctx.activeScope}`;

  const hasFilters = Boolean(
    selectedCity || selectedNeighborhood || selectedInterest || searchQuery
  );

  return (
    <PanelShell
      tenant={ctx.tenant}
      userEmail={ctx.userEmail}
      activeScope={ctx.activeScope}
      activeTab="base"
    >
      {!ctx.tenant ? (
        <OnboardingTenantForm />
      ) : (
        <div className="space-y-6">
          {/* Cabeçalho limpo */}
          <header className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
                Base
              </h1>
              <p className="mt-0.5 text-sm text-ink-secondary tabular-nums">
                {ctx.activeContactsCount.toLocaleString("pt-BR")}{" "}
                {ctx.activeContactsCount === 1
                  ? "apoiador ativo"
                  : "apoiadores ativos"}
                {" · "}
                {ctx.activeScope === "mandate" ? "Mandato" : "Campanha"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {ctx.canManageLinks && ctx.activeContactsCount > 0 ? (
                <a
                  href={`/painel/base/exportar${scopeQuery}`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
                >
                  <Download
                    className="h-3.5 w-3.5 text-ink-secondary"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">Exportar CSV</span>
                </a>
              ) : null}

              <Link
                href={`/painel/base/novo${scopeQuery}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-emerald px-3.5 text-xs font-medium text-white transition-colors hover:bg-brand-emerald-hover"
              >
                <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Novo apoiador</span>
              </Link>
            </div>
          </header>

          {/* Busca e filtros discretos (exibidos quando há registros ou filtros ativos) */}
          {ctx.totalScopeContacts > 0 || hasFilters ? (
            <div className="space-y-3">
              <form
                method="GET"
                action="/painel/base"
                className="grid gap-2.5 sm:grid-cols-12"
              >
                <input type="hidden" name="escopo" value={ctx.activeScope} />
                {selectedCity ? (
                  <input type="hidden" name="cidade" value={selectedCity} />
                ) : null}

                <div className="relative sm:col-span-5">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-muted"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    name="busca"
                    defaultValue={searchQuery}
                    placeholder="Buscar nome, bairro ou WhatsApp"
                    aria-label="Buscar nome, bairro ou WhatsApp"
                    className="h-11 w-full rounded-xl border border-border-subtle bg-white pr-3.5 pl-10 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
                  />
                </div>

                <select
                  name="bairro"
                  defaultValue={selectedNeighborhood}
                  aria-label="Filtrar por bairro"
                  className="h-11 rounded-xl border border-border-subtle bg-white px-3 text-sm text-ink-primary focus:border-brand-navy focus:outline-none sm:col-span-3"
                >
                  <option value="">Bairro</option>
                  {ctx.neighborhoods.map((neighborhood) => (
                    <option key={neighborhood} value={neighborhood}>
                      {neighborhood}
                    </option>
                  ))}
                </select>

                <select
                  name="interesse"
                  defaultValue={selectedInterest}
                  aria-label="Filtrar por interesse"
                  className="h-11 rounded-xl border border-border-subtle bg-white px-3 text-sm text-ink-primary focus:border-brand-navy focus:outline-none sm:col-span-2"
                >
                  <option value="">Interesse</option>
                  {ctx.interests.map((interest) => (
                    <option key={interest.id} value={interest.id}>
                      {interest.name}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    className="h-11 flex-1 rounded-xl bg-brand-navy px-3 text-xs font-medium text-white transition-colors hover:bg-brand-navy-hover"
                  >
                    Filtrar
                  </button>
                  {hasFilters ? (
                    <Link
                      href={`/painel/base${scopeQuery}`}
                      aria-label="Limpar filtros"
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-white text-ink-secondary hover:bg-surface-muted"
                    >
                      <RotateCcw
                        className="h-4 w-4"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </Link>
                  ) : null}
                </div>
              </form>

              {/* Chips horizontais de cidades */}
              {ctx.cityCounts.length > 1 ? (
                <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5">
                  <Link
                    href={buildBaseUrl({ escopo: ctx.activeScope })}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      !selectedCity
                        ? "bg-brand-navy text-white"
                        : "border border-border-subtle bg-white text-ink-secondary hover:text-ink-primary"
                    }`}
                  >
                    <span>Todas</span>
                    <span className="tabular-nums opacity-75">
                      {ctx.totalScopeContacts}
                    </span>
                  </Link>

                  {ctx.cityCounts.map(([city, count]) => {
                    const isSelected = selectedCity === city;
                    return (
                      <Link
                        key={city}
                        href={buildBaseUrl({
                          escopo: ctx.activeScope,
                          cidade: city,
                        })}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? "bg-brand-navy text-white"
                            : "border border-border-subtle bg-white text-ink-secondary hover:text-ink-primary"
                        }`}
                      >
                        <span>{city}</span>
                        <span className="tabular-nums opacity-75">{count}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Lista compacta e legível (em vez de cartões pesados) */}
          {ctx.totalScopeContacts === 0 && !hasFilters ? (
            <section className="rounded-2xl border border-border-subtle bg-white p-7">
              <h2 className="text-base font-semibold text-ink-primary">
                Sua base começa aqui.
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                Crie um link para receber os primeiros cadastros.
              </p>
              <div className="mt-4">
                <Link
                  href={`/painel/links${scopeQuery}`}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-emerald px-4 text-sm font-medium text-white transition-colors hover:bg-brand-emerald-hover"
                >
                  Criar link
                </Link>
              </div>
            </section>
          ) : ctx.contacts.length === 0 ? (
            <div className="rounded-2xl border border-border-subtle bg-white p-7 text-center">
              <p className="text-sm font-medium text-ink-primary">
                Nenhum apoiador encontrado.
              </p>
              <p className="mt-1 text-xs text-ink-secondary">
                Ajuste ou limpe os filtros para ver outros registros.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border-subtle bg-white">
              {/* Cabeçalho de colunas no desktop */}
              <div className="hidden grid-cols-12 gap-4 border-b border-border-subtle bg-canvas/70 px-5 py-2.5 text-xs font-medium text-ink-muted md:grid">
                <span className="col-span-4">Apoiador</span>
                <span className="col-span-3">Localização</span>
                <span className="col-span-3">Contato</span>
                <span className="col-span-2 text-right">Ação</span>
              </div>

              <ul className="divide-y divide-border-subtle/70">
                {ctx.contacts.map((contact) => {
                  const isBirthdayToday =
                    contact.consent_status === "granted" &&
                    contact.birth_day === todayDay &&
                    contact.birth_month === todayMonth;

                  const contactInterests = (contact.contact_interests ?? [])
                    .map((ci) => ci.interests?.name)
                    .filter((name): name is string => Boolean(name));

                  const waBirthdayUrl = isBirthdayToday
                    ? buildOfficialBirthdayWhatsAppUrl({
                        fullName: contact.full_name,
                        whatsapp: contact.whatsapp,
                        consentStatus: contact.consent_status,
                        tenantName: ctx.tenant!.name,
                        unsubscribeToken: contact.unsubscribe_token,
                        appUrl,
                      })
                    : null;

                  const firstName =
                    contact.full_name.trim().split(/\s+/)[0] ??
                    contact.full_name;

                  return (
                    <li
                      key={contact.id}
                      className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-canvas/60 md:grid md:grid-cols-12 md:items-center md:gap-4 md:px-5"
                    >
                      {/* Nome + avatar + status discreto */}
                      <Link
                        href={`/painel/base/${contact.id}`}
                        className="flex min-w-0 items-center gap-3 md:col-span-4"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-brand-navy">
                          {getInitials(contact.full_name)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-ink-primary">
                              {contact.full_name}
                            </p>
                            {isBirthdayToday ? (
                              <span className="shrink-0 rounded-full bg-brand-emerald-soft px-2 py-0.5 text-[11px] font-medium text-brand-emerald">
                                Aniversário
                              </span>
                            ) : null}
                            {contact.consent_status === "pending" ? (
                              <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
                                Importado
                              </span>
                            ) : null}
                            {contact.consent_status === "revoked" ? (
                              <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                                Revogado
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-ink-muted md:hidden">
                            {contact.neighborhood
                              ? `${contact.neighborhood}, ${contact.city}`
                              : contact.city}
                            {contactInterests.length > 0
                              ? ` · ${contactInterests.slice(0, 2).join(", ")}`
                              : ""}
                          </p>
                          {contactInterests.length > 0 ? (
                            <p className="hidden truncate text-xs text-ink-muted md:block">
                              {contactInterests.slice(0, 3).join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </Link>

                      {/* Localização (desktop) */}
                      <div className="hidden min-w-0 md:col-span-3 md:block">
                        <p className="truncate text-sm text-ink-primary">
                          {contact.city}
                        </p>
                        {contact.neighborhood ? (
                          <p className="truncate text-xs text-ink-muted">
                            {contact.neighborhood}
                          </p>
                        ) : null}
                      </div>

                      {/* Contato (desktop) */}
                      <div className="hidden min-w-0 md:col-span-3 md:block">
                        <p className="truncate text-sm text-ink-secondary tabular-nums">
                          {contact.whatsapp ?? contact.email ?? "—"}
                        </p>
                      </div>

                      {/* Ação */}
                      <div className="flex items-center justify-between gap-2 md:col-span-2 md:justify-end">
                        <span className="text-xs text-ink-muted tabular-nums md:hidden">
                          {contact.whatsapp ?? contact.email ?? ""}
                        </span>

                        <div className="flex items-center gap-2">
                          {waBirthdayUrl ? (
                            <BirthdayGreetingButton
                              contactId={contact.id}
                              firstName={firstName}
                              whatsappUrl={waBirthdayUrl}
                              variant="compact"
                            />
                          ) : null}
                          <Link
                            href={`/painel/base/${contact.id}`}
                            aria-label={`Abrir ficha de ${contact.full_name}`}
                            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary"
                          >
                            <span>Ficha</span>
                            <ChevronRight
                              className="h-3.5 w-3.5"
                              strokeWidth={1.75}
                              aria-hidden="true"
                            />
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Paginação enxuta */}
          {ctx.totalPages > 1 ? (
            <nav
              aria-label="Paginação"
              className="flex items-center justify-between pt-1 text-xs text-ink-secondary"
            >
              <span className="tabular-nums">
                Página {ctx.page} de {ctx.totalPages} ({ctx.totalFiltered})
              </span>
              <div className="flex items-center gap-1.5">
                {ctx.page > 1 ? (
                  <Link
                    href={buildBaseUrl({
                      escopo: ctx.activeScope,
                      cidade: selectedCity || undefined,
                      bairro: selectedNeighborhood || undefined,
                      interesse: selectedInterest || undefined,
                      busca: searchQuery || undefined,
                      pagina: String(ctx.page - 1),
                    })}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-border-subtle bg-white px-3 font-medium text-ink-primary hover:bg-surface-muted"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Anterior
                  </Link>
                ) : null}

                {ctx.page < ctx.totalPages ? (
                  <Link
                    href={buildBaseUrl({
                      escopo: ctx.activeScope,
                      cidade: selectedCity || undefined,
                      bairro: selectedNeighborhood || undefined,
                      interesse: selectedInterest || undefined,
                      busca: searchQuery || undefined,
                      pagina: String(ctx.page + 1),
                    })}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-border-subtle bg-white px-3 font-medium text-ink-primary hover:bg-surface-muted"
                  >
                    Próxima
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}
        </div>
      )}
    </PanelShell>
  );
}
