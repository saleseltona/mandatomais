"use client";

import { useActionState } from "react";
import {
  createDemandAction,
  type DemandActionState,
} from "@/app/painel/demandas/actions";
import { Button } from "@/components/ui/button";
import type { DataScope } from "@/lib/types/database";

const initialState: DemandActionState = { error: null, success: null };

export function CreateDemandForm({
  dataScope,
  defaultCity,
}: {
  dataScope: DataScope;
  defaultCity: string;
}) {
  const [state, formAction, pending] = useActionState(
    createDemandAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3.5">
      <input type="hidden" name="dataScope" value={dataScope} />

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
          htmlFor="dem-title"
          className="block text-xs font-medium text-ink-secondary"
        >
          Título da demanda *
        </label>
        <input
          id="dem-title"
          name="title"
          type="text"
          required
          disabled={pending}
          placeholder="Ex.: Reparo de iluminação pública na Rua Principal"
          className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="dem-city"
            className="block text-xs font-medium text-ink-secondary"
          >
            Município *
          </label>
          <input
            id="dem-city"
            name="city"
            type="text"
            required
            disabled={pending}
            defaultValue={defaultCity}
            placeholder="Município"
            className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="dem-neighborhood"
            className="block text-xs font-medium text-ink-secondary"
          >
            Bairro
          </label>
          <input
            id="dem-neighborhood"
            name="neighborhood"
            type="text"
            disabled={pending}
            placeholder="Ex.: Centro"
            className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="dem-category"
            className="block text-xs font-medium text-ink-secondary"
          >
            Área / tema
          </label>
          <input
            id="dem-category"
            name="category"
            type="text"
            disabled={pending}
            placeholder="Ex.: Infraestrutura, Saúde"
            className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="dem-priority"
            className="block text-xs font-medium text-ink-secondary"
          >
            Prioridade
          </label>
          <select
            id="dem-priority"
            name="priority"
            defaultValue="media"
            disabled={pending}
            className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3 text-sm text-ink-primary"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="dem-requester"
          className="block text-xs font-medium text-ink-secondary"
        >
          Solicitante (opcional)
        </label>
        <input
          id="dem-requester"
          name="requesterName"
          type="text"
          disabled={pending}
          placeholder="Nome de referência"
          className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="dem-note"
          className="block text-xs font-medium text-ink-secondary"
        >
          Andamento / ofício (opcional)
        </label>
        <textarea
          id="dem-note"
          name="officeNote"
          rows={2}
          disabled={pending}
          placeholder="Ex.: Ofício protocolado na Secretaria de Obras"
          className="mt-1 block w-full rounded-xl border border-border-subtle bg-white p-3 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Registrando..." : "Registrar demanda"}
      </Button>
    </form>
  );
}
