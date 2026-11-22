"use client";

import { useActionState } from "react";
import {
  createPublicLinkAction,
  type CreateLinkActionState,
} from "@/app/painel/actions";
import { Button } from "@/components/ui/button";

const initialState: CreateLinkActionState = {
  error: null,
  success: null,
};

export function CreateLinkForm() {
  const [state, formAction, pending] = useActionState(
    createPublicLinkAction,
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

      <div>
        <label
          htmlFor="title"
          className="block text-xs font-medium text-ink-secondary"
        >
          Título da página
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          disabled={pending}
          placeholder="Ex.: Cadastro de apoiadores"
          className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="slug"
          className="block text-xs font-medium text-ink-secondary"
        >
          Endereço do link
        </label>
        <div className="mt-1.5 flex h-11 rounded-xl border border-border-subtle bg-white focus-within:border-brand-navy">
          <span className="inline-flex items-center rounded-l-xl border-r border-border-subtle bg-canvas px-3 text-xs text-ink-muted">
            /cadastro/
          </span>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            disabled={pending}
            placeholder="meu-mandato"
            className="block w-full rounded-r-xl px-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="dataScope"
          className="block text-xs font-medium text-ink-secondary"
        >
          Base de destino
        </label>
        <select
          id="dataScope"
          name="dataScope"
          defaultValue="mandate"
          disabled={pending}
          className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
        >
          <option value="mandate">Mandato</option>
          <option value="campaign">Campanha eleitoral</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-xs font-medium text-ink-secondary"
        >
          Descrição (opcional)
        </label>
        <input
          id="description"
          name="description"
          type="text"
          disabled={pending}
          placeholder="Breve resumo exibido no topo do formulário"
          className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Criando..." : "Criar link"}
      </Button>
    </form>
  );
}
