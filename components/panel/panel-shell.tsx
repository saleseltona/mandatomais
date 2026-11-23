import type * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  Cake,
  ClipboardList,
  Home,
  Link2,
  LogOut,
  Megaphone,
  Settings,
  User,
  Users,
} from "lucide-react";
import { signOutAction, switchTenantAction } from "@/app/painel/actions";
import {
  getTenantDisplayName,
  type UserTenantSummary,
} from "@/lib/supabase/panel-data";
import type { DataScope, Tenant, UserProfile } from "@/lib/types/database";
import { buildTenantThemeStyle } from "@/lib/utils/branding";

type ActiveTab =
  | "inicio"
  | "base"
  | "demandas"
  | "aniversariantes"
  | "transparencia"
  | "links"
  | "pesquisas"
  | "configuracoes"
  | "perfil";

export function PanelShell({
  tenant,
  allMemberships = [],
  userEmail,
  userProfile,
  activeScope,
  activeTab,
  children,
}: {
  tenant: Tenant | null;
  allMemberships?: UserTenantSummary[];
  userEmail: string;
  userProfile?: UserProfile | null;
  activeScope: DataScope;
  activeTab: ActiveTab;
  children: React.ReactNode;
}) {
  const scopeQuery = `?escopo=${activeScope}`;
  const themeStyle = buildTenantThemeStyle(
    tenant?.primary_color,
    tenant?.accent_color
  );
  const displayName = getTenantDisplayName(tenant);
  const personalName = userProfile?.full_name?.trim() || userEmail;

  const sidebarItems = [
    {
      id: "inicio" as const,
      label: "Início",
      href: `/painel${scopeQuery}`,
      icon: Home,
    },
    {
      id: "base" as const,
      label: "Base",
      href: `/painel/base${scopeQuery}`,
      icon: Users,
    },
    {
      id: "demandas" as const,
      label: "Demandas",
      href: `/painel/demandas${scopeQuery}`,
      icon: ClipboardList,
    },
    {
      id: "aniversariantes" as const,
      label: "Aniversariantes",
      href: `/painel/aniversariantes${scopeQuery}`,
      icon: Cake,
    },
    {
      id: "transparencia" as const,
      label: "Transparência",
      href: `/painel/transparencia${scopeQuery}`,
      icon: Megaphone,
    },
    {
      id: "links" as const,
      label: "Links",
      href: `/painel/links${scopeQuery}`,
      icon: Link2,
    },
    {
      id: "pesquisas" as const,
      label: "Pesquisas",
      href: `/painel/pesquisas${scopeQuery}`,
      icon: BarChart3,
    },
    {
      id: "configuracoes" as const,
      label: "Configurações",
      href: `/painel/configuracoes${scopeQuery}`,
      icon: Settings,
    },
  ];

  const mobileItems = [
    {
      id: "inicio" as const,
      label: "Início",
      href: `/painel${scopeQuery}`,
      icon: Home,
    },
    {
      id: "base" as const,
      label: "Base",
      href: `/painel/base${scopeQuery}`,
      icon: Users,
    },
    {
      id: "demandas" as const,
      label: "Demandas",
      href: `/painel/demandas${scopeQuery}`,
      icon: ClipboardList,
    },
    {
      id: "configuracoes" as const,
      label: "Ajustes",
      href: `/painel/configuracoes${scopeQuery}`,
      icon: Settings,
    },
  ];

  const basePathForScope =
    activeTab === "base"
      ? "/painel/base"
      : activeTab === "demandas"
        ? "/painel/demandas"
        : activeTab === "aniversariantes"
          ? "/painel/aniversariantes"
          : activeTab === "transparencia"
            ? "/painel/transparencia"
            : activeTab === "links"
              ? "/painel/links"
              : activeTab === "configuracoes"
                ? "/painel/configuracoes"
                : "/painel";

  return (
    <div
      style={themeStyle as React.CSSProperties}
      className="min-h-screen bg-canvas text-ink-primary lg:flex"
    >
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-border-subtle lg:bg-white">
        <div className="flex h-16 items-center gap-2.5 px-6">
          <Link
            href={`/painel${scopeQuery}`}
            className="truncate text-base font-semibold tracking-tight text-brand-navy"
          >
            {tenant ? (
              displayName
            ) : (
              <>
                Mandato<span className="text-brand-emerald">+</span>
              </>
            )}
          </Link>
        </div>

        {/* Seletor multi-mandato (exibido somente quando o usuário participa de 2+ ambientes) */}
        {allMemberships.length > 1 && tenant ? (
          <div className="border-b border-border-subtle px-4 pb-3">
            <form action={switchTenantAction} className="flex items-center gap-1.5">
              <select
                name="tenantId"
                defaultValue={tenant.id}
                aria-label="Alternar mandato ativo"
                className="h-8 min-w-0 flex-1 rounded-lg border border-border-subtle bg-canvas px-2 text-xs font-medium text-ink-primary"
              >
                {allMemberships.map((m) => (
                  <option key={m.tenant_id} value={m.tenant_id}>
                    {getTenantDisplayName(m.tenant)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-8 rounded-lg border border-border-subtle bg-white px-2 text-[11px] font-medium text-ink-secondary hover:text-ink-primary"
              >
                Trocar
              </button>
            </form>
          </div>
        ) : null}

        <nav
          aria-label="Navegação principal"
          className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2"
        >
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-surface-muted font-semibold text-brand-navy"
                    : "font-medium text-ink-secondary hover:bg-canvas hover:text-ink-primary"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    isActive ? "text-brand-navy" : "text-ink-muted"
                  }`}
                  strokeWidth={isActive ? 2 : 1.75}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-4 border-t border-border-subtle p-4">
          {tenant ? (
            <div
              role="group"
              aria-label="Alternar base de dados"
              className="grid grid-cols-2 rounded-lg bg-surface-muted p-0.5 text-xs"
            >
              <Link
                href={`${basePathForScope}?escopo=mandate`}
                className={`rounded-md py-1.5 text-center font-medium transition-colors ${
                  activeScope === "mandate"
                    ? "bg-white text-brand-navy shadow-2xs"
                    : "text-ink-secondary hover:text-ink-primary"
                }`}
              >
                Mandato
              </Link>
              <Link
                href={`${basePathForScope}?escopo=campaign`}
                className={`rounded-md py-1.5 text-center font-medium transition-colors ${
                  activeScope === "campaign"
                    ? "bg-white text-brand-navy shadow-2xs"
                    : "text-ink-secondary hover:text-ink-primary"
                }`}
              >
                Campanha
              </Link>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/painel/perfil${scopeQuery}`}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-muted ${
                activeTab === "perfil" ? "bg-surface-muted" : ""
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-secondary">
                <User
                  className="h-3.5 w-3.5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink-primary">
                  {personalName}
                </p>
                <p className="truncate text-[11px] text-ink-muted">
                  Meu perfil
                </p>
              </div>
            </Link>

            <form action={signOutAction}>
              <button
                type="submit"
                aria-label="Sair da conta"
                title="Sair"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary"
              >
                <LogOut
                  className="h-4 w-4"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-60">
        <main
          id="conteudo-principal"
          className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-24 sm:px-6 lg:px-10 lg:py-9"
        >
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav
          aria-label="Navegação inferior"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-white pb-safe lg:hidden"
        >
          <div className="mx-auto grid max-w-md grid-cols-4 px-2 pt-1.5">
            {mobileItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] transition-colors ${
                    isActive
                      ? "font-semibold text-brand-navy"
                      : "font-medium text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={isActive ? 2.1 : 1.75}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
