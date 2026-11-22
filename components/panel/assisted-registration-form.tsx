"use client";

import { useActionState } from "react";
import {
  createAssistedContactAction,
  type ActionFeedbackState,
} from "@/app/painel/actions";
import { Button } from "@/components/ui/button";
import {
  CONSENT_CHECKBOX_DEFAULT_CHECKED,
  CONSENT_STATEMENT_PT_BR,
  CURRENT_CONSENT_VERSION,
} from "@/lib/constants/consent";
import type { DataScope, Interest } from "@/lib/types/database";

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const initialState: ActionFeedbackState = {
  error: null,
  success: null,
};

export function AssistedRegistrationForm({
  dataScope,
  interests,
}: {
  dataScope: DataScope;
  interests: Interest[];
}) {
  const [state, formAction, pending] = useActionState(
    createAssistedContactAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="dataScope" value={dataScope} />

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
          htmlFor="assisted-fullName"
          className="block text-xs font-medium text-ink-secondary"
        >
          Nome completo *
        </label>
        <input
          id="assisted-fullName"
          name="fullName"
          type="text"
          required
          disabled={pending}
          placeholder="Nome do apoiador"
          className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="assisted-whatsapp"
            className="block text-xs font-medium text-ink-secondary"
          >
            WhatsApp (com DDD)
          </label>
          <input
            id="assisted-whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            disabled={pending}
            placeholder="(99) 99999-9999"
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="assisted-email"
            className="block text-xs font-medium text-ink-secondary"
          >
            E-mail
          </label>
          <input
            id="assisted-email"
            name="email"
            type="email"
            disabled={pending}
            placeholder="nome@exemplo.com.br"
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="assisted-city"
            className="block text-xs font-medium text-ink-secondary"
          >
            Cidade *
          </label>
          <input
            id="assisted-city"
            name="city"
            type="text"
            required
            disabled={pending}
            placeholder="Cidade"
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="assisted-neighborhood"
            className="block text-xs font-medium text-ink-secondary"
          >
            Bairro (opcional)
          </label>
          <input
            id="assisted-neighborhood"
            name="neighborhood"
            type="text"
            disabled={pending}
            placeholder="Bairro"
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="assisted-birthDay"
            className="block text-xs font-medium text-ink-secondary"
          >
            Dia do aniversário (opcional)
          </label>
          <select
            id="assisted-birthDay"
            name="birthDay"
            defaultValue=""
            disabled={pending}
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
          >
            <option value="">Dia</option>
            {DAYS.map((day) => (
              <option key={day} value={day}>
                {String(day).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="assisted-birthMonth"
            className="block text-xs font-medium text-ink-secondary"
          >
            Mês do aniversário (opcional)
          </label>
          <select
            id="assisted-birthMonth"
            name="birthMonth"
            defaultValue=""
            disabled={pending}
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
          >
            <option value="">Mês</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {interests.length > 0 ? (
        <fieldset className="space-y-2 pt-1">
          <legend className="text-xs font-medium text-ink-secondary">
            Temas de interesse (opcional)
          </legend>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <label
                key={interest.id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-ink-primary has-[:checked]:border-brand-emerald has-[:checked]:bg-brand-emerald-soft has-[:checked]:text-brand-emerald"
              >
                <input
                  type="checkbox"
                  name="interestIds"
                  value={interest.id}
                  disabled={pending}
                  className="h-3.5 w-3.5 accent-brand-emerald"
                />
                <span>{interest.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="rounded-xl border border-border-subtle bg-canvas p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            id="assisted-consentAccepted"
            name="consentAccepted"
            type="checkbox"
            defaultChecked={CONSENT_CHECKBOX_DEFAULT_CHECKED}
            required
            disabled={pending}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong accent-brand-emerald"
          />
          <span className="text-xs leading-relaxed text-ink-primary">
            Confirmo que o apoiador autorizou presencialmente: &ldquo;
            {CONSENT_STATEMENT_PT_BR}&rdquo;
          </span>
        </label>
        <p className="mt-2 pl-7 text-[11px] text-ink-muted">
          Termo v{CURRENT_CONSENT_VERSION} · Origem: atendimento-presencial
        </p>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Salvando apoiador..." : "Cadastrar apoiador"}
      </Button>
    </form>
  );
}
