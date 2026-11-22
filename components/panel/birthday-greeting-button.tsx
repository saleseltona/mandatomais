"use client";

import { useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { logBirthdayGreetingAction } from "@/app/painel/actions";

export function BirthdayGreetingButton({
  contactId,
  firstName,
  whatsappUrl,
  variant = "compact",
}: {
  contactId: string;
  firstName: string;
  whatsappUrl: string;
  variant?: "compact" | "full";
}) {
  const [isPending, startTransition] = useTransition();

  function handleOpenWhatsApp() {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    startTransition(async () => {
      await logBirthdayGreetingAction(contactId);
    });
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={handleOpenWhatsApp}
        aria-label={`Enviar parabéns para ${firstName} no WhatsApp`}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-emerald px-4 text-xs font-medium text-white transition-colors hover:bg-brand-emerald-hover active:scale-[0.99] disabled:opacity-50"
      >
        <MessageCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        <span>Parabenizar</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleOpenWhatsApp}
      aria-label={`Parabenizar ${firstName} no WhatsApp`}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-brand-emerald-soft px-3 text-xs font-medium text-brand-emerald transition-colors hover:bg-brand-emerald/15 active:scale-[0.98] disabled:opacity-50"
    >
      <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
      <span>Parabenizar</span>
    </button>
  );
}
