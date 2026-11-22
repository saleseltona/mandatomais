"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
  revokeInvitationAction,
  updateMemberRoleAction,
  type SettingsActionState,
} from "@/app/painel/configuracoes/actions";
import { CopyLinkButton } from "@/components/panel/copy-link-button";
import { Button } from "@/components/ui/button";
import {
  ROLE_DESCRIPTIONS_PT_BR,
  ROLE_LABELS_PT_BR,
} from "@/lib/auth/permissions";
import type { TenantInvitation, TenantRole } from "@/lib/types/database";

export interface TeamMemberView {
  id: string;
  user_id: string;
  role: TenantRole;
  full_name: string | null;
  team_role_label: string | null;
}

const initialState: SettingsActionState = { error: null, success: null };

export function TeamManagement({
  currentUserId,
  members,
  invitations,
  canManage,
}: {
  currentUserId: string;
  members: TeamMemberView[];
  invitations: TenantInvitation[];
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    inviteTeamMemberAction,
    initialState
  );

  return (
    <div className="space-y-6">
      {/* Lista de membros ativos */}
      <ul className="divide-y divide-border-subtle/70 rounded-xl border border-border-subtle">
        {members.map((member) => {
          const isOwner = member.role === "owner";
          const isSelf = member.user_id === currentUserId;

          return (
            <li
              key={member.id}
              className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-primary">
                  {member.full_name?.trim() || "Membro da equipe"}
                  {isSelf ? (
                    <span className="ml-1.5 text-xs text-ink-muted">(você)</span>
                  ) : null}
                </p>
                <p className="text-xs text-ink-muted">
                  {member.team_role_label || ROLE_LABELS_PT_BR[member.role]}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {canManage && !isOwner ? (
                  <>
                    <form action={updateMemberRoleAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="memberId" value={member.id} />
                      <select
                        name="role"
                        defaultValue={member.role}
                        aria-label="Papel do membro"
                        className="h-9 rounded-lg border border-border-subtle bg-white px-2.5 text-xs text-ink-primary"
                      >
                        <option value="admin">Administrador</option>
                        <option value="advisor">Assessor</option>
                        <option value="viewer">Somente leitura</option>
                      </select>
                      <button
                        type="submit"
                        className="h-9 rounded-lg border border-border-subtle bg-white px-2.5 text-xs font-medium text-ink-primary hover:bg-surface-muted"
                      >
                        Aplicar
                      </button>
                    </form>

                    {!isSelf ? (
                      <form action={removeTeamMemberAction}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <button
                          type="submit"
                          aria-label="Remover membro"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </form>
                    ) : null}
                  </>
                ) : (
                  <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
                    {ROLE_LABELS_PT_BR[member.role]}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Referência curta dos papéis */}
      <div className="grid gap-2 text-xs text-ink-secondary sm:grid-cols-2">
        {(["owner", "admin", "advisor", "viewer"] as const).map((r) => (
          <div key={r} className="rounded-xl bg-canvas p-3">
            <p className="font-semibold text-ink-primary">
              {ROLE_LABELS_PT_BR[r]}
            </p>
            <p className="mt-0.5 text-[11px]">{ROLE_DESCRIPTIONS_PT_BR[r]}</p>
          </div>
        ))}
      </div>

      {/* Formulário de convite */}
      {canManage ? (
        <div className="space-y-4 border-t border-border-subtle pt-5">
          <div>
            <h3 className="text-sm font-semibold text-ink-primary">
              Convidar novo membro
            </h3>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Cada integrante deve acessar com e-mail e senha próprios.
            </p>
          </div>

          <form action={formAction} className="space-y-3">
            {state.error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
              >
                {state.error}
              </div>
            ) : null}
            {state.success ? (
              <div
                role="status"
                className="space-y-2 rounded-xl bg-brand-emerald-soft p-3.5 text-xs text-brand-emerald"
              >
                <p className="font-medium">{state.success}</p>
                {state.inviteLink ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-white px-2 py-1 text-[11px] text-ink-primary">
                      {state.inviteLink}
                    </code>
                    <CopyLinkButton path={state.inviteLink} />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-2.5 sm:grid-cols-12">
              <input
                name="email"
                type="email"
                required
                disabled={pending}
                placeholder="email@assessoria.com.br"
                aria-label="E-mail do convidado"
                className="h-11 rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none sm:col-span-6"
              />
              <select
                name="role"
                defaultValue="advisor"
                disabled={pending}
                aria-label="Papel do convidado"
                className="h-11 rounded-xl border border-border-subtle bg-white px-3 text-sm text-ink-primary focus:border-brand-navy focus:outline-none sm:col-span-3"
              >
                <option value="admin">Administrador</option>
                <option value="advisor">Assessor</option>
                <option value="viewer">Somente leitura</option>
              </select>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={pending}
                className="sm:col-span-3"
              >
                {pending ? "Gerando..." : "Gerar convite"}
              </Button>
            </div>
          </form>

          {invitations.length > 0 ? (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-ink-secondary">
                Convites pendentes
              </p>
              <ul className="divide-y divide-border-subtle/70 rounded-xl border border-border-subtle">
                {invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-medium text-ink-primary">
                        {inv.email}
                      </span>
                      <span className="ml-2 text-ink-muted">
                        {ROLE_LABELS_PT_BR[inv.role]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyLinkButton path={`/convite/${inv.token}`} />
                      <form action={revokeInvitationAction}>
                        <input type="hidden" name="invitationId" value={inv.id} />
                        <button
                          type="submit"
                          className="rounded-lg px-2 py-1 text-red-700 hover:bg-red-50"
                        >
                          Cancelar
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
