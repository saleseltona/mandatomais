"use client";

import { useActionState } from "react";
import {
  createMandateActionAction,
  type MandateActionState,
} from "@/app/painel/transparencia/actions";
import { Button } from "@/components/ui/button";

const initialState: MandateActionState = { error: null, success: null };

export function CreateMandateActionForm({
  defaultCity,
}: {
  defaultCity: string;
}) {
  const [state, formAction, pending] = useActionState(
    createMandateActionAction,
    initialState
  );
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3.5">
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

      <div>
        <label
          htmlFor="act-title"
          className="block text-xs font-medium text-ink-secondary"
        >
          Título da entrega ou ação *
        </label>
        <input
          id="act-title"
          name="title"
          type="text"
          required
          disabled={pending}
          placeholder="Ex.: Reforma da quadra do bairro Santa Rita"
          className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="act-summary"
          className="block text-xs font-medium text-ink-secondary"
        >
          Resumo objetivo *
        </label>
        <textarea
          id="act-summary"
          name="summary"
          rows={3}
          required
          disabled={pending}
          placeholder="Descreva o que foi realizado e o impacto para a comunidade"
          className="mt-1 block w-full rounded-xl border border-border-subtle bg-white p-3 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="act-category"
            className="block text-xs font-medium text-ink-secondary"
          >
            Área
          </label>
          <input
            id="act-category"
            name="category"
            type="text"
            disabled={pending}
            placeholder="Ex.: Saúde, Educação"
            className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary"
          />
        </div>

        <div>
          <label
            htmlFor="act-date"
            className="block text-xs font-medium text-ink-secondary"
          >
            Data
          </label>
          <input
            id="act-date"
            name="actionDate"
            type="date"
            defaultValue={todayIso}
            disabled={pending}
            className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="act-city"
            className="block text-xs font-medium text-ink-secondary"
          >
            Município
          </label>
          <input
            id="act-city"
            name="city"
            type="text"
            defaultValue={defaultCity}
            disabled={pending}
            className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary"
          />
        </div>

        <div>
          <label
            htmlFor="act-neighborhood"
            className="block text-xs font-medium text-ink-secondary"
          >
            Bairro
          </label>
          <input
            id="act-neighborhood"
            name="neighborhood"
            type="text"
            disabled={pending}
            placeholder="Opcional"
            className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-xs text-ink-primary">
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked
          disabled={pending}
          className="h-4 w-4 accent-brand-emerald"
        />
        <span>Exibir na página pública de transparência</span>
      </label>

      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Publicando..." : "Registrar ação"}
      </Button>
    </form>
  );
}
