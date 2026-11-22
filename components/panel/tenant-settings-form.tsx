"use client";

import { useActionState } from "react";
import {
  updateTenantDetailsAction,
  type SettingsActionState,
} from "@/app/painel/configuracoes/actions";
import { Button } from "@/components/ui/button";
import type { Tenant } from "@/lib/types/database";

const initialState: SettingsActionState = { error: null, success: null };

export function TenantSettingsForm({
  tenant,
  canEdit,
}: {
  tenant: Tenant;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateTenantDetailsAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
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
          className="rounded-xl bg-brand-emerald-soft px-3.5 py-2.5 text-xs font-medium text-brand-emerald"
        >
          {state.success}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="set-name"
            className="block text-xs font-medium text-ink-secondary"
          >
            Nome da organização / mandato *
          </label>
          <input
            id="set-name"
            name="name"
            type="text"
            required
            disabled={!canEdit || pending}
            defaultValue={tenant.name}
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none disabled:bg-surface-muted"
          />
        </div>

        <div>
          <label
            htmlFor="set-display-name"
            className="block text-xs font-medium text-ink-secondary"
          >
            Nome público de exibição
          </label>
          <input
            id="set-display-name"
            name="publicDisplayName"
            type="text"
            disabled={!canEdit || pending}
            defaultValue={tenant.public_display_name ?? ""}
            placeholder="Como aparece no cabeçalho e links"
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none disabled:bg-surface-muted"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="set-org-type"
            className="block text-xs font-medium text-ink-secondary"
          >
            Tipo de ambiente
          </label>
          <select
            id="set-org-type"
            name="organizationType"
            disabled={!canEdit || pending}
            defaultValue={tenant.organization_type ?? "mandate"}
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3 text-sm text-ink-primary focus:border-brand-navy focus:outline-none disabled:bg-surface-muted"
          >
            <option value="mandate">Mandato</option>
            <option value="pre_campaign">Pré-campanha</option>
            <option value="campaign">Campanha</option>
            <option value="other">Outra organização</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="set-office"
            className="block text-xs font-medium text-ink-secondary"
          >
            Cargo (quando aplicável)
          </label>
          <input
            id="set-office"
            name="officeTitle"
            type="text"
            disabled={!canEdit || pending}
            defaultValue={tenant.office_title ?? ""}
            placeholder="Ex.: Vereador(a), Deputado(a)"
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none disabled:bg-surface-muted"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label
            htmlFor="set-city"
            className="block text-xs font-medium text-ink-secondary"
          >
            Município
          </label>
          <input
            id="set-city"
            name="city"
            type="text"
            disabled={!canEdit || pending}
            defaultValue={tenant.city ?? ""}
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none disabled:bg-surface-muted"
          />
        </div>

        <div>
          <label
            htmlFor="set-state"
            className="block text-xs font-medium text-ink-secondary"
          >
            UF
          </label>
          <input
            id="set-state"
            name="state"
            type="text"
            maxLength={2}
            disabled={!canEdit || pending}
            defaultValue={tenant.state ?? ""}
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm uppercase text-ink-primary focus:border-brand-navy focus:outline-none disabled:bg-surface-muted"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="set-bio"
          className="block text-xs font-medium text-ink-secondary"
        >
          Biografia curta (opcional)
        </label>
        <textarea
          id="set-bio"
          name="bio"
          rows={2}
          disabled={!canEdit || pending}
          defaultValue={tenant.bio ?? ""}
          placeholder="Breve apresentação do mandato ou organização"
          className="mt-1.5 block w-full rounded-xl border border-border-subtle bg-white p-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none disabled:bg-surface-muted"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="set-instagram"
            className="block text-xs font-medium text-ink-secondary"
          >
            Instagram (opcional)
          </label>
          <input
            id="set-instagram"
            name="socialInstagram"
            type="text"
            disabled={!canEdit || pending}
            defaultValue={tenant.social_links?.instagram ?? ""}
            placeholder="@usuario"
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none disabled:bg-surface-muted"
          />
        </div>

        <div>
          <label
            htmlFor="set-website"
            className="block text-xs font-medium text-ink-secondary"
          >
            Site oficial (opcional)
          </label>
          <input
            id="set-website"
            name="socialWebsite"
            type="url"
            disabled={!canEdit || pending}
            defaultValue={tenant.social_links?.website ?? ""}
            placeholder="https://..."
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none disabled:bg-surface-muted"
          />
        </div>
      </div>

      {canEdit ? (
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Salvando..." : "Salvar dados"}
        </Button>
      ) : (
        <p className="text-xs text-ink-muted">
          Apenas proprietários e administradores podem editar estes dados.
        </p>
      )}
    </form>
  );
}
