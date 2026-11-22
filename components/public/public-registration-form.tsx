"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  submitPublicRegistrationAction,
  type PublicRegistrationActionState,
} from "@/app/cadastro/[slug]/actions";
import { Button } from "@/components/ui/button";
import {
  CONSENT_CHECKBOX_DEFAULT_CHECKED,
  CONSENT_STATEMENT_PT_BR,
  CURRENT_CONSENT_VERSION,
} from "@/lib/constants/consent";

export interface PublicInterestOption {
  id: string;
  name: string;
}

const MONTHS_PT_BR = [
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

const initialState: PublicRegistrationActionState = {
  error: null,
  success: false,
};

export function PublicRegistrationForm({
  slug,
  tenantName,
  interests,
}: {
  slug: string;
  tenantName: string;
  interests: PublicInterestOption[];
}) {
  const boundAction = submitPublicRegistrationAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState
  );

  if (state.success) {
    const formattedDate = state.consentedAt
      ? new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(state.consentedAt))
      : null;

    return (
      <div
        role="status"
        className="space-y-4 rounded-2xl border border-border-subtle bg-canvas p-5"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-brand-emerald"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div>
            <h2 className="text-base font-semibold text-ink-primary">
              Cadastro confirmado
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
              Seu consentimento foi registrado para{" "}
              <strong className="font-medium text-ink-primary">
                {tenantName}
              </strong>
              {formattedDate ? ` em ${formattedDate}` : ""} (v
              {CURRENT_CONSENT_VERSION}).
            </p>
          </div>
        </div>

        {state.unsubscribeToken ? (
          <div className="border-t border-border-subtle pt-3 text-xs text-ink-secondary">
            <p>Você pode cancelar o recebimento a qualquer momento:</p>
            <Link
              href={`/descadastro/${state.unsubscribeToken}`}
              className="mt-1 inline-block font-medium text-brand-navy underline underline-offset-2"
            >
              Acessar link de descadastro
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {/* Honeypot invisível contra preenchimento automatizado */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Não preencha este campo</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

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
          htmlFor="fullName"
          className="block text-xs font-medium text-ink-secondary"
        >
          Nome completo *
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          disabled={pending}
          placeholder="Seu nome"
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
          className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
        />
        {state.fieldErrors?.fullName ? (
          <p className="mt-1 text-xs text-red-700">
            {state.fieldErrors.fullName}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="whatsapp"
            className="block text-xs font-medium text-ink-secondary"
          >
            WhatsApp (com DDD)
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            disabled={pending}
            placeholder="(11) 99999-9999"
            aria-invalid={Boolean(state.fieldErrors?.whatsapp)}
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
          />
          {state.fieldErrors?.whatsapp ? (
            <p className="mt-1 text-xs text-red-700">
              {state.fieldErrors.whatsapp}
            </p>
          ) : null}
        </div>

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
            disabled={pending}
            placeholder="voce@exemplo.com.br"
            aria-invalid={Boolean(state.fieldErrors?.email)}
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
          />
          {state.fieldErrors?.email ? (
            <p className="mt-1 text-xs text-red-700">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-ink-muted">
        Informe ao menos WhatsApp ou e-mail. Não solicitamos CPF.
      </p>

      <div>
        <label
          htmlFor="instagramHandle"
          className="block text-xs font-medium text-ink-secondary"
        >
          @Instagram (opcional)
        </label>
        <input
          id="instagramHandle"
          name="instagramHandle"
          type="text"
          disabled={pending}
          placeholder="@seuusuario"
          className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-ink-muted">
          Opcional — usado apenas para identificar seu perfil caso você deseje.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="city"
            className="block text-xs font-medium text-ink-secondary"
          >
            Cidade *
          </label>
          <input
            id="city"
            name="city"
            type="text"
            autoComplete="address-level2"
            required
            disabled={pending}
            placeholder="Sua cidade"
            aria-invalid={Boolean(state.fieldErrors?.city)}
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
          />
          {state.fieldErrors?.city ? (
            <p className="mt-1 text-xs text-red-700">
              {state.fieldErrors.city}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="neighborhood"
            className="block text-xs font-medium text-ink-secondary"
          >
            Bairro (opcional)
          </label>
          <input
            id="neighborhood"
            name="neighborhood"
            type="text"
            disabled={pending}
            placeholder="Seu bairro"
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="birthDay"
            className="block text-xs font-medium text-ink-secondary"
          >
            Dia do aniversário (opcional)
          </label>
          <select
            id="birthDay"
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
            htmlFor="birthMonth"
            className="block text-xs font-medium text-ink-secondary"
          >
            Mês do aniversário (opcional)
          </label>
          <select
            id="birthMonth"
            name="birthMonth"
            defaultValue=""
            disabled={pending}
            className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
          >
            <option value="">Mês</option>
            {MONTHS_PT_BR.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {state.fieldErrors?.birthDay ? (
        <p className="text-xs text-red-700">{state.fieldErrors.birthDay}</p>
      ) : null}

      {interests.length > 0 ? (
        <fieldset className="space-y-2 pt-1">
          <legend className="text-xs font-medium text-ink-secondary">
            Temas de interesse (opcional)
          </legend>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <label
                key={interest.id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors has-[:checked]:border-brand-emerald has-[:checked]:bg-brand-emerald-soft has-[:checked]:text-brand-emerald"
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
            id="consentAccepted"
            name="consentAccepted"
            type="checkbox"
            defaultChecked={CONSENT_CHECKBOX_DEFAULT_CHECKED}
            required
            disabled={pending}
            aria-invalid={Boolean(state.fieldErrors?.consentAccepted)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong accent-brand-emerald"
          />
          <span className="text-xs leading-relaxed text-ink-primary">
            {CONSENT_STATEMENT_PT_BR}
          </span>
        </label>
        <p className="mt-2 pl-7 text-[11px] text-ink-muted">
          Termo v{CURRENT_CONSENT_VERSION} · Origem: link público ({slug})
        </p>
        {state.fieldErrors?.consentAccepted ? (
          <p className="mt-1.5 pl-7 text-xs text-red-700">
            {state.fieldErrors.consentAccepted}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Confirmando..." : "Confirmar cadastro"}
      </Button>
    </form>
  );
}
