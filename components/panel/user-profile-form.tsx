"use client";

import { useActionState } from "react";
import {
  updatePasswordAction,
  updateUserProfileAction,
  type ProfileActionState,
} from "@/app/painel/perfil/actions";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/lib/types/database";

const initialState: ProfileActionState = { error: null, success: null };

export function UserProfileForm({
  email,
  profile,
}: {
  email: string;
  profile: UserProfile | null;
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateUserProfileAction,
    initialState
  );
  const [pwdState, pwdAction, pwdPending] = useActionState(
    updatePasswordAction,
    initialState
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-ink-primary">
          Dados pessoais
        </h2>
        <p className="mt-0.5 text-xs text-ink-secondary">
          Estas informações identificam você na equipe e não alteram os dados do
          mandato.
        </p>

        <form action={profileAction} className="mt-5 space-y-4">
          {profileState.error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
            >
              {profileState.error}
            </div>
          ) : null}
          {profileState.success ? (
            <div
              role="status"
              className="rounded-xl bg-brand-emerald-soft px-3.5 py-2.5 text-xs font-medium text-brand-emerald"
            >
              {profileState.success}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="profile-fullName"
                className="block text-xs font-medium text-ink-secondary"
              >
                Seu nome *
              </label>
              <input
                id="profile-fullName"
                name="fullName"
                type="text"
                required
                disabled={profilePending}
                defaultValue={profile?.full_name ?? ""}
                placeholder="Seu nome completo"
                className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-medium text-ink-secondary"
              >
                E-mail de acesso
              </label>
              <input
                id="profile-email"
                type="email"
                disabled
                value={email}
                className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-surface-muted px-3.5 text-sm text-ink-muted"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="profile-phone"
                className="block text-xs font-medium text-ink-secondary"
              >
                Telefone (opcional)
              </label>
              <input
                id="profile-phone"
                name="phone"
                type="tel"
                disabled={profilePending}
                defaultValue={profile?.phone ?? ""}
                placeholder="(99) 99999-9999"
                className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="profile-role"
                className="block text-xs font-medium text-ink-secondary"
              >
                Função na equipe (opcional)
              </label>
              <input
                id="profile-role"
                name="teamRoleLabel"
                type="text"
                disabled={profilePending}
                defaultValue={profile?.team_role_label ?? ""}
                placeholder="Ex.: Chefe de gabinete, Assessor(a)"
                className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="profile-avatar"
              className="block text-xs font-medium text-ink-secondary"
            >
              URL da foto de perfil (opcional)
            </label>
            <input
              id="profile-avatar"
              name="avatarUrl"
              type="url"
              disabled={profilePending}
              defaultValue={profile?.avatar_url ?? ""}
              placeholder="https://..."
              className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
            />
          </div>

          <Button type="submit" variant="primary" size="md" disabled={profilePending}>
            {profilePending ? "Salvando..." : "Salvar perfil"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-ink-primary">
          Segurança da conta
        </h2>
        <p className="mt-0.5 text-xs text-ink-secondary">
          Use credenciais pessoais e evite compartilhar senhas com a equipe.
        </p>

        <form action={pwdAction} className="mt-5 space-y-4">
          {pwdState.error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
            >
              {pwdState.error}
            </div>
          ) : null}
          {pwdState.success ? (
            <div
              role="status"
              className="rounded-xl bg-brand-emerald-soft px-3.5 py-2.5 text-xs font-medium text-brand-emerald"
            >
              {pwdState.success}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-medium text-ink-secondary"
              >
                Nova senha
              </label>
              <input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                disabled={pwdPending}
                placeholder="Mínimo 8 caracteres"
                className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-medium text-ink-secondary"
              >
                Confirmar nova senha
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                disabled={pwdPending}
                placeholder="Repita a senha"
                className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
              />
            </div>
          </div>

          <Button type="submit" variant="secondary" size="md" disabled={pwdPending}>
            {pwdPending ? "Atualizando..." : "Alterar senha"}
          </Button>
        </form>
      </section>
    </div>
  );
}
