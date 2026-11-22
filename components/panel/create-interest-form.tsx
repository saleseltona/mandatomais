"use client";

import { useActionState } from "react";
import {
  createInterestAction,
  type CreateInterestActionState,
} from "@/app/painel/actions";
import { Button } from "@/components/ui/button";
import type { DataScope } from "@/lib/types/database";

const initialState: CreateInterestActionState = {
  error: null,
  success: null,
};

export function CreateInterestForm({ dataScope }: { dataScope: DataScope }) {
  const [state, formAction, pending] = useActionState(
    createInterestAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-2.5">
      <input type="hidden" name="dataScope" value={dataScope} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="interest-name" className="sr-only">
          Novo tema de interesse
        </label>
        <input
          id="interest-name"
          name="name"
          type="text"
          required
          disabled={pending}
          placeholder="Adicionar tema (ex.: Saúde, Educação)"
          className="block h-10 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none sm:max-w-xs"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={pending} className="h-10">
          {pending ? "Salvando..." : "Adicionar"}
        </Button>
      </div>

      {state.error ? (
        <p role="alert" className="text-xs text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p role="status" className="text-xs font-medium text-brand-emerald">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
