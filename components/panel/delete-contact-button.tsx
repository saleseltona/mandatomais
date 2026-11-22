"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteContactAction } from "@/app/painel/actions";
import type { DataScope } from "@/lib/types/database";

export function DeleteContactButton({
  contactId,
  contactName,
  dataScope,
}: {
  contactId: string;
  contactName: string;
  dataScope: DataScope;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        <span>Excluir registro</span>
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Confirmação de exclusão permanente"
      className="space-y-2.5 rounded-xl border border-red-200 bg-red-50/70 p-3.5"
    >
      <p className="text-xs leading-relaxed text-red-900">
        Excluir definitivamente{" "}
        <strong className="font-semibold">{contactName}</strong>? Esta ação
        remove o contato e não pode ser desfeita.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
        >
          Cancelar
        </button>
        <form action={deleteContactAction}>
          <input type="hidden" name="contactId" value={contactId} />
          <input type="hidden" name="dataScope" value={dataScope} />
          <button
            type="submit"
            className="h-9 w-full rounded-lg bg-red-700 px-3 text-xs font-medium text-white transition-colors hover:bg-red-800"
          >
            Confirmar exclusão
          </button>
        </form>
      </div>
    </div>
  );
}
