import type { Metadata } from "next";
import { PanelShell } from "@/components/panel/panel-shell";
import { UserProfileForm } from "@/components/panel/user-profile-form";
import { ROLE_LABELS_PT_BR } from "@/lib/auth/permissions";
import {
  getTenantDisplayName,
  loadAuthenticatedMembership,
} from "@/lib/supabase/panel-data";

export const metadata: Metadata = {
  title: "Meu perfil | Mandato+",
  description:
    "Gerencie seus dados pessoais, senha e ambientes dos quais participa.",
};

export default async function MeuPerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadAuthenticatedMembership(params.escopo);

  return (
    <PanelShell
      tenant={ctx.tenant}
      userEmail={ctx.userEmail}
      userProfile={ctx.userProfile}
      activeScope={ctx.activeScope}
      activeTab="perfil"
    >
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
            Meu perfil
          </h1>
          <p className="mt-0.5 text-sm text-ink-secondary">
            Sua conta pessoal de acesso ao Mandato+.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-8">
            <UserProfileForm email={ctx.userEmail} profile={ctx.userProfile} />
          </div>

          <section className="rounded-2xl border border-border-subtle bg-white p-5 lg:col-span-4">
            <h2 className="text-sm font-semibold text-ink-primary">
              Ambientes vinculados
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Organizações e mandatos que sua conta pode acessar.
            </p>

            {ctx.allMemberships.length === 0 ? (
              <p className="mt-4 text-xs text-ink-muted">
                Nenhum ambiente vinculado ainda.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border-subtle/70">
                {ctx.allMemberships.map((m) => (
                  <li
                    key={m.tenant_id}
                    className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-primary">
                        {getTenantDisplayName(m.tenant)}
                      </p>
                      {m.tenant.city ? (
                        <p className="truncate text-xs text-ink-muted">
                          {m.tenant.city}
                          {m.tenant.state ? `/${m.tenant.state}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-medium text-ink-secondary">
                      {ROLE_LABELS_PT_BR[m.role]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </PanelShell>
  );
}
