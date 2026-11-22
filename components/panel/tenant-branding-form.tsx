"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Monitor, RotateCcw, Smartphone } from "lucide-react";
import {
  updateTenantBrandingAction,
  type SettingsActionState,
} from "@/app/painel/configuracoes/actions";
import { Button } from "@/components/ui/button";
import type { Tenant } from "@/lib/types/database";
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  evaluateColorAccessibility,
} from "@/lib/utils/branding";

const initialState: SettingsActionState = { error: null, success: null };

export function TenantBrandingForm({
  tenant,
  canEdit,
}: {
  tenant: Tenant;
  canEdit: boolean;
}) {
  const [primaryColor, setPrimaryColor] = useState(
    tenant.primary_color ?? DEFAULT_PRIMARY_COLOR
  );
  const [accentColor, setAccentColor] = useState(
    tenant.accent_color ?? DEFAULT_ACCENT_COLOR
  );
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url ?? "");
  const [avatarUrl, setAvatarUrl] = useState(tenant.avatar_url ?? "");
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");

  const [state, formAction, pending] = useActionState(
    updateTenantBrandingAction,
    initialState
  );

  const primaryCheck = evaluateColorAccessibility(primaryColor);
  const accentCheck = evaluateColorAccessibility(accentColor);
  const displayName = tenant.public_display_name?.trim() || tenant.name;

  return (
    <div className="space-y-5">
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
              htmlFor="brand-primary"
              className="block text-xs font-medium text-ink-secondary"
            >
              Cor principal
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                id="brand-primary"
                type="color"
                disabled={!canEdit || pending}
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                className="h-11 w-12 cursor-pointer rounded-xl border border-border-subtle bg-white p-1"
              />
              <input
                name="primaryColor"
                type="text"
                disabled={!canEdit || pending}
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                className="h-11 flex-1 rounded-xl border border-border-subtle bg-white px-3 font-mono text-sm text-ink-primary"
              />
            </div>
            {!primaryCheck.meetsAA ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Contraste {primaryCheck.contrastRatio}:1 (abaixo do ideal 4.5:1).
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="brand-accent"
              className="block text-xs font-medium text-ink-secondary"
            >
              Cor de destaque
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                id="brand-accent"
                type="color"
                disabled={!canEdit || pending}
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
                className="h-11 w-12 cursor-pointer rounded-xl border border-border-subtle bg-white p-1"
              />
              <input
                name="accentColor"
                type="text"
                disabled={!canEdit || pending}
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
                className="h-11 flex-1 rounded-xl border border-border-subtle bg-white px-3 font-mono text-sm text-ink-primary"
              />
            </div>
            {!accentCheck.meetsAA ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Contraste {accentCheck.contrastRatio}:1 (abaixo do ideal 4.5:1).
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="brand-logo"
              className="block text-xs font-medium text-ink-secondary"
            >
              URL do logotipo (opcional)
            </label>
            <input
              id="brand-logo"
              name="logoUrl"
              type="url"
              disabled={!canEdit || pending}
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="brand-avatar"
              className="block text-xs font-medium text-ink-secondary"
            >
              URL da foto do responsável (opcional)
            </label>
            <input
              id="brand-avatar"
              name="avatarUrl"
              type="url"
              disabled={!canEdit || pending}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
            />
          </div>
        </div>

        {/* Prévia Mobile e Desktop */}
        <div className="rounded-2xl border border-border-subtle bg-canvas p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-ink-secondary">
              Prévia ao vivo
            </span>
            <div className="inline-flex rounded-lg bg-surface-muted p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium ${
                  previewMode === "mobile"
                    ? "bg-white text-ink-primary shadow-2xs"
                    : "text-ink-secondary"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                Mobile
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium ${
                  previewMode === "desktop"
                    ? "bg-white text-ink-primary shadow-2xs"
                    : "text-ink-secondary"
                }`}
              >
                <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
                Desktop
              </button>
            </div>
          </div>

          <div
            className={`mx-auto rounded-2xl p-5 transition-all ${
              previewMode === "mobile" ? "max-w-xs" : "w-full"
            }`}
            style={{
              backgroundColor: primaryColor,
              color: primaryCheck.textColor,
            }}
          >
            <p className="text-xs opacity-75">{displayName}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              342
            </p>
            <p className="text-xs opacity-75">apoiadores na base</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className="inline-flex h-9 items-center rounded-lg px-3.5 text-xs font-medium"
                style={{
                  backgroundColor: accentColor,
                  color: accentCheck.textColor,
                }}
              >
                Novo apoiador
              </span>
              <span className="inline-flex h-9 items-center rounded-lg bg-white/15 px-3.5 text-xs font-medium">
                Compartilhar link
              </span>
            </div>
          </div>
        </div>

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button type="submit" variant="primary" size="md" disabled={pending}>
              {pending ? "Salvando..." : "Salvar identidade visual"}
            </Button>
            <Button
              type="submit"
              name="restoreDefault"
              value="true"
              variant="outline"
              size="md"
              disabled={pending}
              onClick={() => {
                setPrimaryColor(DEFAULT_PRIMARY_COLOR);
                setAccentColor(DEFAULT_ACCENT_COLOR);
                setLogoUrl("");
                setAvatarUrl("");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Restaurar padrão
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
