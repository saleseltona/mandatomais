"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  Cake,
  CheckCircle2,
  Home,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import {
  submitPublicRegistrationAction,
  type PublicRegistrationActionState,
} from "@/app/cadastro/[slug]/actions";
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

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M+";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function PublicRegistrationForm({
  slug,
  title,
  description,
  subtitle,
  tenantName,
  interests,
}: {
  slug: string;
  title: string;
  description?: string | null;
  subtitle: string;
  tenantName: string;
  interests: PublicInterestOption[];
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const boundAction = submitPublicRegistrationAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState
  );

  const firstName = fullName.trim().split(/\s+/)[0] || "";
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

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
        className="mx-auto max-w-lg space-y-4 rounded-2xl border border-border-subtle bg-white p-6 sm:p-7"
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
    <form action={formAction} className="mx-auto w-full max-w-xl" noValidate>
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

      {/* Cabeçalho na trilha */}
      <div className="relative pl-12 pb-6">
        <span
          aria-hidden="true"
          className="absolute top-0.5 left-0 flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-white text-ink-secondary"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span
          aria-hidden="true"
          className="absolute top-9 bottom-0 left-4 border-l border-dashed border-border-strong"
        />

        <p className="text-xs font-medium text-ink-muted">{subtitle}</p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-ink-primary sm:text-2xl">
          {firstName ? `Olá, ${firstName}!` : title}
        </h1>
        <p className="mt-0.5 text-sm text-ink-secondary">
          {description ||
            `Preencha seus dados para se conectar com ${tenantName}.`}
        </p>

        {state.error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
          >
            {state.error}
          </div>
        ) : null}
      </div>

      {/* Seção 1 — Seus detalhes */}
      <section className="relative pl-12 pb-7">
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-white text-ink-secondary"
        >
          <User className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span
          aria-hidden="true"
          className="absolute top-8 bottom-0 left-4 border-l border-dashed border-border-strong"
        />

        <h2 className="mb-3 pt-1 text-sm font-semibold text-ink-primary">
          Seus detalhes
        </h2>

        <div className="divide-y divide-border-subtle/80 overflow-hidden rounded-2xl border border-border-subtle bg-white">
          {/* Nome com avatar */}
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-navy text-[11px] font-semibold text-white">
              {computeInitials(fullName)}
            </span>
            <label htmlFor="fullName" className="sr-only">
              Nome completo
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              disabled={pending}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={Boolean(state.fieldErrors?.fullName)}
              placeholder="Seu nome completo *"
              className="w-full bg-transparent text-sm font-medium text-ink-primary placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            />
          </div>

          {/* WhatsApp */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="whatsapp"
              className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm"
            >
              <Phone
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>WhatsApp</span>
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.whatsapp)}
              placeholder="(11) 99999-9999"
              className="min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-ink-primary placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            />
          </div>

          {/* E-mail */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="email"
              className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm"
            >
              <Mail
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>E-mail</span>
            </label>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                disabled={pending}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(state.fieldErrors?.email)}
                placeholder="voce@exemplo.com.br"
                className="w-full bg-transparent text-right text-sm font-medium text-ink-primary placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
              />
              {isValidEmail ? (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-brand-emerald"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              ) : null}
            </div>
          </div>

          {/* @Instagram */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="instagramHandle"
              className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm"
            >
              <Instagram
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Instagram</span>
            </label>
            <input
              id="instagramHandle"
              name="instagramHandle"
              type="text"
              disabled={pending}
              placeholder="@usuario (opcional)"
              className="min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-ink-primary placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            />
          </div>
        </div>

        <p className="mt-2 px-1 text-[11px] text-ink-muted">
          Informe ao menos WhatsApp ou e-mail. Não solicitamos CPF.
        </p>
      </section>

      {/* Seção 2 — Localização e aniversário */}
      <section className="relative pl-12 pb-7">
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-white text-ink-secondary"
        >
          <MapPin className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span
          aria-hidden="true"
          className="absolute top-8 bottom-0 left-4 border-l border-dashed border-border-strong"
        />

        <h2 className="mb-3 pt-1 text-sm font-semibold text-ink-primary">
          Localização e aniversário
        </h2>

        <div className="divide-y divide-border-subtle/80 overflow-hidden rounded-2xl border border-border-subtle bg-white">
          {/* Cidade */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="city"
              className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm"
            >
              <MapPin
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Cidade *</span>
            </label>
            <input
              id="city"
              name="city"
              type="text"
              autoComplete="address-level2"
              required
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.city)}
              placeholder="Sua cidade"
              className="min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-ink-primary placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            />
          </div>

          {/* Bairro */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="neighborhood"
              className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm"
            >
              <Home
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Bairro</span>
            </label>
            <input
              id="neighborhood"
              name="neighborhood"
              type="text"
              disabled={pending}
              placeholder="Opcional"
              className="min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-ink-primary placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            />
          </div>

          {/* Aniversário (Dia / Mês) */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm">
              <Cake
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Aniversário</span>
            </span>
            <div className="flex items-center gap-2">
              <select
                id="birthDay"
                name="birthDay"
                defaultValue=""
                disabled={pending}
                aria-label="Dia do aniversário"
                className="bg-transparent text-right text-sm font-medium text-ink-primary focus:outline-none"
              >
                <option value="">Dia</option>
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {String(day).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <span className="text-ink-muted">/</span>
              <select
                id="birthMonth"
                name="birthMonth"
                defaultValue=""
                disabled={pending}
                aria-label="Mês do aniversário"
                className="bg-transparent text-right text-sm font-medium text-ink-primary focus:outline-none"
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

          {/* Temas de interesse */}
          {interests.length > 0 ? (
            <div className="space-y-2.5 px-4 py-3.5">
              <div className="flex items-center gap-2 text-xs text-ink-secondary sm:text-sm">
                <Tag
                  className="h-4 w-4 text-ink-muted"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>Temas de interesse (opcional)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <label
                    key={interest.id}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border-subtle bg-canvas px-3 py-1 text-xs font-medium text-ink-primary transition-colors has-[:checked]:border-brand-emerald has-[:checked]:bg-brand-emerald-soft has-[:checked]:text-brand-emerald"
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
            </div>
          ) : null}
        </div>
      </section>

      {/* Seção 3 — Consentimento explícito */}
      <section className="relative pl-12 pb-6">
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-white text-ink-secondary"
        >
          <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span
          aria-hidden="true"
          className="absolute top-8 bottom-0 left-4 border-l border-dashed border-border-strong"
        />

        <h2 className="mb-3 pt-1 text-sm font-semibold text-ink-primary">
          Consentimento
        </h2>

        <div className="rounded-2xl border border-border-subtle bg-white p-4">
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
        </div>
      </section>

      {/* Botão final conectado à linha pontilhada */}
      <div className="relative pl-12">
        <span
          aria-hidden="true"
          className="absolute top-0 left-4 h-6 w-8 rounded-bl-xl border-b border-l border-dashed border-border-strong"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-emerald px-5 text-sm font-medium text-white transition-colors hover:bg-brand-emerald-hover active:scale-[0.99] disabled:opacity-50"
        >
          {pending ? "Confirmando..." : "Confirmar cadastro"}
        </button>
      </div>
    </form>
  );
}
