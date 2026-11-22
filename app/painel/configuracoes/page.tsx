import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, GitCompare, Instagram, Upload } from "lucide-react";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  TeamManagement,
  type TeamMemberView,
} from "@/components/panel/team-management";
import { TenantBrandingForm } from "@/components/panel/tenant-branding-form";
import { TenantSettingsForm } from "@/components/panel/tenant-settings-form";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import type { AuditLog, TenantInvitation, TenantRole } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Configurações | Mandato+",
  description:
    "Dados do mandato, identidade visual, equipe, importações, integrações e privacidade.",
};

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadAuthenticatedMembership(params.escopo);
  const scopeQuery = `?escopo=${ctx.activeScope}`;

  let members: TeamMemberView[] = [];
  let invitations: TenantInvitation[] = [];
  let auditLogs: AuditLog[] = [];

  if (ctx.tenant) {
    const supabase = await createClient();
    const [{ data: memberRows }, { data: inviteRows }, { data: auditRows }] =
      await Promise.all([
        supabase
          .from("tenant_members")
          .select("id, user_id, role")
          .eq("tenant_id", ctx.tenant.id)
          .order("created_at", { ascending: true }),
        ctx.canManageTeam
          ? supabase
              .from("tenant_invitations")
              .select("*")
              .eq("tenant_id", ctx.tenant.id)
              .is("accepted_at", null)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        ctx.canViewAudit
          ? supabase
              .from("audit_logs")
              .select("*")
              .eq("tenant_id", ctx.tenant.id)
              .order("created_at", { ascending: false })
              .limit(15)
          : Promise.resolve({ data: [] }),
      ]);

    const rawMembers =
      (memberRows as Array<{ id: string; user_id: string; role: TenantRole }> | null) ??
      [];
    const userIds = rawMembers.map((m) => m.user_id);

    const profileMap = new Map<
      string,
      { full_name: string | null; team_role_label: string | null }
    >();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, full_name, team_role_label")
        .in("user_id", userIds);

      for (const p of (profiles as Array<{
        user_id: string;
        full_name: string | null;
        team_role_label: string | null;
      }> | null) ?? []) {
        profileMap.set(p.user_id, p);
      }
    }

    members = rawMembers.map((m) => {
      const prof = profileMap.get(m.user_id);
      return {
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        full_name: prof?.full_name ?? null,
        team_role_label: prof?.team_role_label ?? null,
      };
    });

    invitations = (inviteRows as TenantInvitation[] | null) ?? [];
    auditLogs = (auditRows as AuditLog[] | null) ?? [];
  }

  const dateFmt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <PanelShell
      tenant={ctx.tenant}
      userEmail={ctx.userEmail}
      userProfile={ctx.userProfile}
      activeScope={ctx.activeScope}
      activeTab="configuracoes"
    >
      {!ctx.tenant ? (
        <OnboardingTenantForm />
      ) : (
        <div className="space-y-7">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
              Configurações
            </h1>
            <p className="mt-0.5 text-sm text-ink-secondary">
              Gerencie mandato, identidade visual, equipe, importações e
              integrações.
            </p>
          </header>

          {/* Módulos dedicados (Importação, Conciliação, Instagram) */}
          <section aria-label="Ferramentas do ambiente">
            <div className="divide-y divide-border-subtle/70 rounded-2xl border border-border-subtle bg-white">
              <Link
                href={`/painel/configuracoes/importacao${scopeQuery}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-canvas first:rounded-t-2xl"
              >
                <div className="flex items-center gap-3">
                  <Upload
                    className="h-[18px] w-[18px] text-ink-secondary"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink-primary">
                      Central de importação
                    </p>
                    <p className="text-xs text-ink-muted">
                      Importe arquivos CSV ou XLSX com mapeamento e revisão
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className="h-4 w-4 text-ink-muted"
                  aria-hidden="true"
                />
              </Link>

              <Link
                href={`/painel/configuracoes/conciliacao${scopeQuery}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-canvas"
              >
                <div className="flex items-center gap-3">
                  <GitCompare
                    className="h-[18px] w-[18px] text-ink-secondary"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink-primary">
                      Conciliação de cadastros
                    </p>
                    <p className="text-xs text-ink-muted">
                      Revise correspondências, mesclagens e histórico de
                      deduplicação
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className="h-4 w-4 text-ink-muted"
                  aria-hidden="true"
                />
              </Link>

              <Link
                href={`/painel/configuracoes/instagram${scopeQuery}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-canvas last:rounded-b-2xl"
              >
                <div className="flex items-center gap-3">
                  <Instagram
                    className="h-[18px] w-[18px] text-ink-secondary"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink-primary">
                      Instagram e integrações
                    </p>
                    <p className="text-xs text-ink-muted">
                      Integração oficial Meta, importação de arquivo e campo
                      voluntário
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className="h-4 w-4 text-ink-muted"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </section>

          {/* 1. Dados do mandato */}
          <section
            id="mandato"
            className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-ink-primary">
              Dados do mandato
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Usados em cabeçalhos, saudações e páginas públicas de cadastro.
            </p>
            <div className="mt-5">
              <TenantSettingsForm
                tenant={ctx.tenant}
                canEdit={ctx.canManageBranding}
              />
            </div>
          </section>

          {/* 2. Identidade visual */}
          <section
            id="identidade"
            className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-ink-primary">
              Identidade visual
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Cores aplicadas por tokens de design com verificação automática de
              contraste.
            </p>
            <div className="mt-5">
              <TenantBrandingForm
                tenant={ctx.tenant}
                canEdit={ctx.canManageBranding}
              />
            </div>
          </section>

          {/* 3. Equipe e permissões */}
          <section
            id="equipe"
            className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-ink-primary">
              Equipe e permissões
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Permissões aplicadas no servidor e nas políticas do banco de
              dados.
            </p>
            <div className="mt-5">
              <TeamManagement
                currentUserId={ctx.userId}
                members={members}
                invitations={invitations}
                canManage={ctx.canManageTeam}
              />
            </div>
          </section>

          {/* 4. Privacidade e histórico de alterações */}
          {ctx.canViewAudit ? (
            <section
              id="privacidade"
              className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6"
            >
              <h2 className="text-base font-semibold text-ink-primary">
                Privacidade e histórico de alterações
              </h2>
              <p className="mt-0.5 text-xs text-ink-secondary">
                Últimas ações registradas na trilha de auditoria deste ambiente.
              </p>

              {auditLogs.length === 0 ? (
                <p className="mt-4 text-xs text-ink-muted">
                  Nenhuma alteração registrada ainda.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-border-subtle/70">
                  {auditLogs.map((log) => (
                    <li
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                    >
                      <div>
                        <span className="font-mono font-medium text-ink-primary">
                          {log.action}
                        </span>
                        <span className="ml-2 text-ink-muted">
                          {log.data_scope === "mandate"
                            ? "Mandato"
                            : "Campanha"}
                        </span>
                      </div>
                      <span className="text-ink-muted tabular-nums">
                        {dateFmt.format(new Date(log.created_at))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      )}
    </PanelShell>
  );
}
