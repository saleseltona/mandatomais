"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Plus } from "lucide-react";
import {
  createManualReminderAction,
  saveReminderSettingsAction,
  type ReminderActionState,
} from "@/app/painel/notificacoes/actions";
import type { DataScope } from "@/lib/types/database";
import { ALLOWED_REMINDER_HORIZONS } from "@/lib/utils/team-reminders";

const INITIAL_STATE: ReminderActionState = { error: null, success: null };

export function CopyDigestButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback silencioso
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3.5 py-2 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-brand-emerald" />
          Resumo interno copiado
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copiar resumo diário da equipe
        </>
      )}
    </button>
  );
}

export function ReminderSettingsForm({
  activeScope,
  initialEnabled,
  initialDaysAhead,
  initialIncludeBirthdays,
  initialIncludeOpenDemands,
  initialDigestHour,
}: {
  activeScope: DataScope;
  initialEnabled: boolean;
  initialDaysAhead: number[];
  initialIncludeBirthdays: boolean;
  initialIncludeOpenDemands: boolean;
  initialDigestHour: number;
}) {
  const [state, formAction, isPending] = useActionState(
    saveReminderSettingsAction,
    INITIAL_STATE
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-border-subtle bg-white p-5"
    >
      <input type="hidden" name="dataScope" value={activeScope} />

      <div>
        <h2 className="text-sm font-semibold text-ink-primary">
          Preferências de lembretes antecipados
        </h2>
        <p className="mt-0.5 text-xs text-ink-secondary">
          Alertas internos para a equipe do gabinete. Nenhum aviso automático é enviado aos cidadãos.
        </p>
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-xl border border-emerald-200 bg-brand-emerald-soft px-3 py-2 text-xs text-brand-emerald">
          {state.success}
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-xs font-medium text-ink-primary">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={initialEnabled}
          className="h-4 w-4 rounded border-border-subtle text-brand-navy"
        />
        Ativar lembretes antecipados neste ambiente
      </label>

      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-secondary">
          Antecedência para aniversariantes consentidos
        </p>
        <div className="flex flex-wrap gap-2">
          {ALLOWED_REMINDER_HORIZONS.map((day) => {
            const label =
              day === 0
                ? "No dia"
                : day === 1
                  ? "1 dia antes"
                  : `${day} dias antes`;
            return (
              <label
                key={day}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border-subtle px-3 py-1.5 text-xs text-ink-primary hover:bg-surface-muted/60"
              >
                <input
                  type="checkbox"
                  name="daysAhead"
                  value={day}
                  defaultChecked={initialDaysAhead.includes(day)}
                  className="h-3.5 w-3.5 rounded border-border-subtle text-brand-navy"
                />
                {label}
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-xs text-ink-secondary">
          <input
            type="checkbox"
            name="includeBirthdays"
            defaultChecked={initialIncludeBirthdays}
            className="h-4 w-4 rounded border-border-subtle text-brand-navy"
          />
          Incluir aniversariantes próximos
        </label>

        <label className="flex items-center gap-2 text-xs text-ink-secondary">
          <input
            type="checkbox"
            name="includeOpenDemands"
            defaultChecked={initialIncludeOpenDemands}
            className="h-4 w-4 rounded border-border-subtle text-brand-navy"
          />
          Incluir demandas prioritárias ou pendentes
        </label>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label
            htmlFor="digest-hour"
            className="block text-xs font-medium text-ink-secondary"
          >
            Horário de referência (Brasília)
          </label>
          <select
            id="digest-hour"
            name="digestHourBrt"
            defaultValue={initialDigestHour}
            className="mt-1 rounded-xl border border-border-subtle bg-white px-3 py-1.5 text-xs text-ink-primary"
          >
            {[7, 8, 9, 10, 12, 14, 17, 18].map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-brand-navy px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar preferências"}
        </button>
      </div>
    </form>
  );
}

export function ManualReminderForm({ activeScope }: { activeScope: DataScope }) {
  const [state, formAction, isPending] = useActionState(
    createManualReminderAction,
    INITIAL_STATE
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-2xl border border-border-subtle bg-white p-5"
    >
      <input type="hidden" name="dataScope" value={activeScope} />

      <div>
        <h2 className="text-sm font-semibold text-ink-primary">
          Novo lembrete interno da equipe
        </h2>
        <p className="mt-0.5 text-xs text-ink-secondary">
          Registre compromissos, retornos de atendimento ou datas importantes do gabinete.
        </p>
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-xl border border-emerald-200 bg-brand-emerald-soft px-3 py-2 text-xs text-brand-emerald">
          {state.success}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <input
            type="text"
            name="title"
            required
            minLength={3}
            maxLength={140}
            placeholder="Ex.: Retornar liderança do bairro Bacuri sobre iluminação"
            className="w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-xs text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
          />
        </div>
        <div>
          <input
            type="date"
            name="targetDate"
            className="w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-xs text-ink-primary focus:border-brand-navy focus:outline-none"
          />
        </div>
        <div className="sm:col-span-3">
          <textarea
            name="body"
            rows={2}
            maxLength={500}
            placeholder="Detalhes opcionais para a equipe..."
            className="w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-xs text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-navy px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          {isPending ? "Registrando..." : "Adicionar lembrete"}
        </button>
      </div>
    </form>
  );
}
