"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  confirmUnsubscribeAction,
  type UnsubscribeActionState,
} from "@/app/descadastro/[token]/actions";
import { Button } from "@/components/ui/button";

const initialState: UnsubscribeActionState = {
  error: null,
  revoked: false,
};

export function UnsubscribeForm({
  token,
  tenantName,
}: {
  token: string;
  tenantName: string;
}) {
  const boundAction = confirmUnsubscribeAction.bind(null, token);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState
  );

  if (state.revoked) {
    return (
      <div
        role="status"
        className="rounded-xl border border-border-subtle bg-canvas p-4"
      >
        <div className="flex items-start gap-2.5">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-brand-emerald"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">
              Descadastro confirmado
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
              Seu consentimento para receber mensagens de{" "}
              <strong className="font-medium text-ink-primary">
                {tenantName}
              </strong>{" "}
              foi revogado imediatamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
        >
          {state.error}
        </div>
      ) : null}

      <Button
        type="submit"
        variant="secondary"
        size="lg"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Confirmando..." : "Confirmar descadastro"}
      </Button>
    </form>
  );
}
