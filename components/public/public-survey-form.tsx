"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  submitPublicSurveyAction,
  type SubmitSurveyActionState,
} from "@/app/pesquisa/[slug]/actions";
import { Button } from "@/components/ui/button";
import {
  CONSENT_CHECKBOX_DEFAULT_CHECKED,
  CURRENT_CONSENT_VERSION,
} from "@/lib/constants/consent";
import {
  SURVEY_AREAS,
  SURVEY_COMMUNICATION_CONSENT_TEXT,
  SURVEY_MANAGEMENT_RATINGS,
  SURVEY_MANDATE_RATINGS,
  type SurveyCustomQuestion,
} from "@/lib/utils/surveys";

const initialState: SubmitSurveyActionState = {
  error: null,
  success: false,
};

export function PublicSurveyForm({
  slug,
  tenantDisplayName,
  tenantSlug,
  publicRegistrationSlug,
  useDefaultQuestions,
  customQuestions,
  thankYouText,
  defaultCity,
}: {
  slug: string;
  tenantDisplayName: string;
  tenantSlug: string;
  publicRegistrationSlug: string | null;
  useDefaultQuestions: boolean;
  customQuestions: SurveyCustomQuestion[];
  thankYouText: string | null;
  defaultCity: string | null;
}) {
  const [managementRating, setManagementRating] = useState("");
  const [mandateRating, setMandateRating] = useState("");
  const [wantsUpdates, setWantsUpdates] = useState<"yes" | "no">("no");
  const [identificationMode, setIdentificationMode] = useState<
    "anonymous" | "identified"
  >("anonymous");
  const [deviceToken, setDeviceToken] = useState("");

  useEffect(() => {
    try {
      const storageKey = "mandato_plus_device_id";
      let existing = window.localStorage.getItem(storageKey);
      if (!existing) {
        existing =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        window.localStorage.setItem(storageKey, existing);
      }
      setDeviceToken(existing);
    } catch {
      // storage indisponível (navegação privada)
    }
  }, []);

  const boundAction = submitPublicSurveyAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState
  );

  // Barra de progresso estimada
  const completedSteps =
    (managementRating ? 1 : 0) +
    (mandateRating ? 1 : 0) +
    (wantsUpdates ? 1 : 0) +
    (identificationMode ? 1 : 0);
  const progressPct = Math.min(100, Math.round((completedSteps / 4) * 100));

  if (state.success) {
    return (
      <div
        role="status"
        className="space-y-5 rounded-2xl border border-border-subtle bg-white p-6 sm:p-8"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2
            className="mt-0.5 h-6 w-6 shrink-0 text-brand-emerald"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div>
            <h2 className="text-lg font-semibold text-ink-primary">
              Obrigado por participar!
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
              {thankYouText ||
                `Sua resposta foi registrada e ajudará ${tenantDisplayName} a priorizar melhorias reais para a cidade.`}
            </p>
          </div>
        </div>

        {state.unsubscribeToken ? (
          <div className="rounded-xl bg-canvas p-3.5 text-xs text-ink-secondary">
            Seu consentimento de comunicação foi registrado (v
            {CURRENT_CONSENT_VERSION}). Você pode cancelar a qualquer momento em{" "}
            <Link
              href={`/descadastro/${state.unsubscribeToken}`}
              className="font-medium text-brand-navy underline"
            >
              descadastro fácil
            </Link>
            .
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2.5 border-t border-border-subtle pt-4">
          <Link
            href={`/transparencia/${tenantSlug}`}
            className="inline-flex h-10 items-center rounded-xl border border-border-subtle bg-white px-4 text-xs font-medium text-ink-primary hover:bg-surface-muted"
          >
            Ver página de transparência
          </Link>
          {publicRegistrationSlug ? (
            <Link
              href={`/cadastro/${publicRegistrationSlug}`}
              className="inline-flex h-10 items-center rounded-xl bg-brand-emerald px-4 text-xs font-medium text-white hover:bg-brand-emerald-hover"
            >
              Cadastrar-se na rede de apoio (opcional)
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="deviceToken" value={deviceToken} />

      {/* Honeypot invisível */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="survey-website">Não preencha</label>
        <input
          id="survey-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Barra de progresso */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-ink-muted">
          <span>Progresso</span>
          <span className="tabular-nums">{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-brand-emerald transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
        >
          {state.error}
        </div>
      ) : null}

      {useDefaultQuestions ? (
        <>
          {/* 1. Avaliação da gestão pública */}
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-semibold text-ink-primary">
              1. Como você avalia a gestão pública do seu município?
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SURVEY_MANAGEMENT_RATINGS.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-subtle bg-white px-3 py-2.5 text-xs font-medium text-ink-primary transition-colors has-[:checked]:border-brand-navy has-[:checked]:bg-surface-muted"
                >
                  <input
                    type="radio"
                    name="managementRating"
                    value={option}
                    checked={managementRating === option}
                    onChange={() => setManagementRating(option)}
                    disabled={pending}
                    className="h-3.5 w-3.5 accent-brand-navy"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* 2. Avaliação do desempenho do mandato */}
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-semibold text-ink-primary">
              2. Como você avalia o desempenho do vereador/mandato de{" "}
              {tenantDisplayName}?
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SURVEY_MANDATE_RATINGS.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-subtle bg-white px-3 py-2.5 text-xs font-medium text-ink-primary transition-colors has-[:checked]:border-brand-navy has-[:checked]:bg-surface-muted"
                >
                  <input
                    type="radio"
                    name="mandateRating"
                    value={option}
                    checked={mandateRating === option}
                    onChange={() => setMandateRating(option)}
                    disabled={pending}
                    className="h-3.5 w-3.5 accent-brand-navy"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* 3. Áreas de acerto */}
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-semibold text-ink-primary">
              3. Em quais áreas você acredita que o mandato está acertando?
            </legend>
            <div className="flex flex-wrap gap-2">
              {SURVEY_AREAS.map((area) => (
                <label
                  key={area}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors has-[:checked]:border-brand-emerald has-[:checked]:bg-brand-emerald-soft has-[:checked]:text-brand-emerald"
                >
                  <input
                    type="checkbox"
                    name="strengthAreas"
                    value={area}
                    disabled={pending}
                    className="h-3.5 w-3.5 accent-brand-emerald"
                  />
                  <span>{area}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* 4. Áreas de melhoria */}
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-semibold text-ink-primary">
              4. Em quais áreas você acredita que o mandato precisa melhorar?
            </legend>
            <div className="flex flex-wrap gap-2">
              {SURVEY_AREAS.map((area) => (
                <label
                  key={area}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors has-[:checked]:border-brand-navy has-[:checked]:bg-surface-muted has-[:checked]:text-brand-navy"
                >
                  <input
                    type="checkbox"
                    name="improvementAreas"
                    value={area}
                    disabled={pending}
                    className="h-3.5 w-3.5 accent-brand-navy"
                  />
                  <span>{area}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* 5, 6 e 7. Perguntas abertas (até 500 caracteres) */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="q-need"
                className="block text-sm font-semibold text-ink-primary"
              >
                5. Qual é a principal necessidade do seu bairro hoje?
              </label>
              <textarea
                id="q-need"
                name="mainNeighborhoodNeed"
                rows={2}
                maxLength={500}
                disabled={pending}
                placeholder="Resposta opcional (até 500 caracteres)"
                className="mt-1.5 block w-full rounded-xl border border-border-subtle bg-white p-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="q-valued"
                className="block text-sm font-semibold text-ink-primary"
              >
                6. Qual ação ou atendimento do mandato você mais valoriza?
              </label>
              <textarea
                id="q-valued"
                name="mostValuedAction"
                rows={2}
                maxLength={500}
                disabled={pending}
                placeholder="Resposta opcional (até 500 caracteres)"
                className="mt-1.5 block w-full rounded-xl border border-border-subtle bg-white p-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="q-improve"
                className="block text-sm font-semibold text-ink-primary"
              >
                7. O que o mandato poderia fazer melhor?
              </label>
              <textarea
                id="q-improve"
                name="whatToImprove"
                rows={2}
                maxLength={500}
                disabled={pending}
                placeholder="Resposta opcional (até 500 caracteres)"
                className="mt-1.5 block w-full rounded-xl border border-border-subtle bg-white p-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
              />
            </div>
          </div>
        </>
      ) : null}

      {/* Perguntas personalizadas adicionais */}
      {customQuestions.length > 0 ? (
        <div className="space-y-4 border-t border-border-subtle pt-5">
          {customQuestions.map((q) => (
            <div key={q.id}>
              <label className="block text-sm font-semibold text-ink-primary">
                {q.label}
                {q.required ? " *" : ""}
              </label>
              {q.type === "long_text" ? (
                <textarea
                  name={`custom_${q.id}`}
                  rows={2}
                  maxLength={500}
                  required={q.required}
                  disabled={pending}
                  className="mt-1.5 block w-full rounded-xl border border-border-subtle bg-white p-3 text-sm text-ink-primary"
                />
              ) : q.type === "yes_no" ? (
                <div className="mt-1.5 flex gap-3">
                  {["Sim", "Não"].map((opt) => (
                    <label
                      key={opt}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-subtle bg-white px-4 py-2 text-xs font-medium"
                    >
                      <input
                        type="radio"
                        name={`custom_${q.id}`}
                        value={opt}
                        required={q.required}
                        disabled={pending}
                        className="accent-brand-navy"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : q.type === "scale_5" || q.type === "scale_10" ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {Array.from(
                    { length: q.type === "scale_10" ? 10 : 5 },
                    (_, i) => String(i + 1)
                  ).map((num) => (
                    <label
                      key={num}
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border-subtle bg-white text-xs font-medium has-[:checked]:border-brand-navy has-[:checked]:bg-brand-navy has-[:checked]:text-white"
                    >
                      <input
                        type="radio"
                        name={`custom_${q.id}`}
                        value={num}
                        required={q.required}
                        disabled={pending}
                        className="sr-only"
                      />
                      <span>{num}</span>
                    </label>
                  ))}
                </div>
              ) : (q.type === "single_choice" || q.type === "multiple_choice") &&
                q.options &&
                q.options.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium"
                    >
                      <input
                        type={q.type === "multiple_choice" ? "checkbox" : "radio"}
                        name={`custom_${q.id}`}
                        value={opt}
                        disabled={pending}
                        className="accent-brand-navy"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  name={`custom_${q.id}`}
                  type={
                    q.type === "date"
                      ? "date"
                      : q.type === "number"
                        ? "number"
                        : "text"
                  }
                  required={q.required}
                  disabled={pending}
                  className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary"
                />
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Cidade e Bairro (sempre opcionais mesmo em resposta anônima) */}
      <div className="grid gap-3.5 border-t border-border-subtle pt-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="s-city"
            className="block text-xs font-medium text-ink-secondary"
          >
            Cidade (opcional)
          </label>
          <input
            id="s-city"
            name="city"
            type="text"
            defaultValue={defaultCity ?? ""}
            disabled={pending}
            placeholder="Sua cidade"
            className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary"
          />
        </div>

        <div>
          <label
            htmlFor="s-neighborhood"
            className="block text-xs font-medium text-ink-secondary"
          >
            Bairro (opcional)
          </label>
          <input
            id="s-neighborhood"
            name="neighborhood"
            type="text"
            disabled={pending}
            placeholder="Seu bairro"
            className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary"
          />
        </div>
      </div>

      {/* 8, 9 e 10. Receber informações + Consentimento separado */}
      <fieldset className="space-y-3 border-t border-border-subtle pt-5">
        <legend className="text-sm font-semibold text-ink-primary">
          8. Você gostaria de receber informações sobre ações, audiências
          públicas, mutirões e atendimentos do mandato?
        </legend>
        <div className="flex gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-subtle bg-white px-4 py-2 text-xs font-medium has-[:checked]:border-brand-navy has-[:checked]:bg-surface-muted">
            <input
              type="radio"
              name="wantsUpdates"
              value="yes"
              checked={wantsUpdates === "yes"}
              onChange={() => {
                setWantsUpdates("yes");
                setIdentificationMode("identified");
              }}
              disabled={pending}
              className="accent-brand-navy"
            />
            <span>Sim</span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-subtle bg-white px-4 py-2 text-xs font-medium has-[:checked]:border-brand-navy has-[:checked]:bg-surface-muted">
            <input
              type="radio"
              name="wantsUpdates"
              value="no"
              checked={wantsUpdates === "no"}
              onChange={() => setWantsUpdates("no")}
              disabled={pending}
              className="accent-brand-navy"
            />
            <span>Não</span>
          </label>
        </div>

        {wantsUpdates === "yes" ? (
          <div className="space-y-3 rounded-xl border border-border-subtle bg-canvas p-4">
            <div>
              <label
                htmlFor="s-updates-wa"
                className="block text-xs font-medium text-ink-secondary"
              >
                9. Informe seu WhatsApp para receber informações autorizadas
                (opcional)
              </label>
              <input
                id="s-updates-wa"
                name="updatesWhatsapp"
                type="tel"
                inputMode="tel"
                disabled={pending}
                placeholder="(99) 99999-9999"
                className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                name="communicationConsent"
                defaultChecked={CONSENT_CHECKBOX_DEFAULT_CHECKED}
                disabled={pending}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-emerald"
              />
              <span className="text-xs leading-relaxed text-ink-primary">
                <strong>10. Aceito receber informações do mandato por WhatsApp.</strong>{" "}
                {SURVEY_COMMUNICATION_CONSENT_TEXT}
              </span>
            </label>
          </div>
        ) : null}
      </fieldset>

      {/* 11 e 12. Identificação sempre opcional */}
      <fieldset className="space-y-3 border-t border-border-subtle pt-5">
        <legend className="text-sm font-semibold text-ink-primary">
          11. Deseja identificar-se nesta pesquisa?
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-xs font-medium has-[:checked]:border-brand-navy has-[:checked]:bg-surface-muted">
            <input
              type="radio"
              name="identificationMode"
              value="anonymous"
              checked={identificationMode === "anonymous"}
              onChange={() => setIdentificationMode("anonymous")}
              disabled={pending}
              className="accent-brand-navy"
            />
            <span>Não, prefiro responder de forma anônima</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-xs font-medium has-[:checked]:border-brand-navy has-[:checked]:bg-surface-muted">
            <input
              type="radio"
              name="identificationMode"
              value="identified"
              checked={identificationMode === "identified"}
              onChange={() => setIdentificationMode("identified")}
              disabled={pending}
              className="accent-brand-navy"
            />
            <span>Sim, quero me identificar</span>
          </label>
        </div>

        {identificationMode === "identified" ? (
          <div className="grid gap-3 rounded-xl border border-border-subtle bg-canvas p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="s-name"
                className="block text-xs font-medium text-ink-secondary"
              >
                Nome
              </label>
              <input
                id="s-name"
                name="respondentName"
                type="text"
                disabled={pending}
                placeholder="Seu nome"
                className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary"
              />
            </div>
            <div>
              <label
                htmlFor="s-wa"
                className="block text-xs font-medium text-ink-secondary"
              >
                WhatsApp (opcional)
              </label>
              <input
                id="s-wa"
                name="respondentWhatsapp"
                type="tel"
                inputMode="tel"
                disabled={pending}
                placeholder="(99) 99999-9999"
                className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary"
              />
            </div>
            <div>
              <label
                htmlFor="s-email"
                className="block text-xs font-medium text-ink-secondary"
              >
                E-mail (opcional)
              </label>
              <input
                id="s-email"
                name="respondentEmail"
                type="email"
                disabled={pending}
                placeholder="voce@exemplo.com.br"
                className="mt-1 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary"
              />
            </div>
          </div>
        ) : null}
      </fieldset>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Enviando resposta..." : "Enviar resposta"}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-4 text-xs text-ink-muted">
        <Link href="/#lgpd-seguranca" className="hover:underline">
          Política de privacidade
        </Link>
        <div className="flex items-center gap-4">
          <Link href={`/transparencia/${tenantSlug}`} className="hover:underline">
            Transparência do mandato
          </Link>
          {publicRegistrationSlug ? (
            <Link
              href={`/cadastro/${publicRegistrationSlug}`}
              className="hover:underline"
            >
              Cadastrar-se como apoiador
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
