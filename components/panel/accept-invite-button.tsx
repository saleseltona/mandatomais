"use client";

import { useActionState } from "react";
import {
  acceptInvitationAction,
  type AcceptInviteState,
} from "@/app/convite/[token]/actions";
import { Button } from "@/components/ui/button";

const initialState: AcceptInviteState = { error: null };

export function AcceptInviteButton({ token }: { token: string }) {
  const bound = acceptInvitationAction.bind(null, token);
  const [state, formAction, pending] = useActionState(bound, initialState);

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
        variant="primary"
        size="lg"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Confirmando..." : "Confirmar e entrar na equipe"}
      </Button>
    </form>
  );
}
