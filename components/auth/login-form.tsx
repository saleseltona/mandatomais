"use client";

import { useActionState } from "react";
import { signInAction, type LoginActionState } from "@/app/entrar/actions";
import { Button } from "@/components/ui/button";

const initialState: LoginActionState = { error: null };

export function LoginForm({ disabled = false }: { disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
        >
          {state.error}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="email"
          className="block text-xs font-medium text-ink-secondary"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={disabled || pending}
          placeholder="nome@mandato.gov.br"
          className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none disabled:bg-surface-muted"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium text-ink-secondary"
        >
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={disabled || pending}
          placeholder="Sua senha"
          className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none disabled:bg-surface-muted"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={disabled || pending}
        className="w-full"
      >
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
