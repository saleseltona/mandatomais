"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  Award,
  Briefcase,
  CheckCircle2,
  Instagram,
  Link2,
  Lock,
  Mail,
  Map,
  MapPin,
  Palette,
  Phone,
  Sparkles,
  Tag,
  User,
  UserCheck,
} from "lucide-react";
import {
  signUpWithProfileAction,
  type SignupActionState,
} from "@/app/criar-conta/actions";
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
} from "@/lib/utils/branding";

const initialState: SignupActionState = { error: null };

const TEAM_ROLES = [
  "Parlamentar",
  "Chefe de gabinete",
  "Assessor(a)",
  "Coordenação",
  "Comunicação",
  "Outro",
];

const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M+";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function SignupTimelineForm({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);

  const [state, formAction, pending] = useActionState(
    signUpWithProfileAction,
    initialState
  );

  const firstName = fullName.trim().split(/\s+/)[0] || "";
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  if (state.needsEmailConfirmation) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border-subtle bg-white p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-brand-emerald"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div>
            <h1 className="text-lg font-semibold text-ink-primary">
              Confirme seu e-mail para continuar
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
              Enviamos um link de confirmação para{" "}
              <strong className="font-medium text-ink-primary">
                {state.registeredEmail}
              </strong>
              . Após confirmar, faça login para acessar seu painel.
            </p>
            <div className="mt-5">
              <Link
                href="/entrar"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-navy px-4 text-sm font-medium text-white hover:bg-brand-navy-hover"
              >
                Ir para Entrar
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="mx-auto w-full max-w-xl" noValidate>
      {/* Cabeçalho com ícone na trilha */}
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

        <h1 className="text-xl font-semibold tracking-tight text-ink-primary sm:text-2xl">
          {firstName ? `Olá, ${firstName}!` : "Crie sua conta no Mandato+"}
        </h1>
        <p className="mt-0.5 text-sm text-ink-secondary">
          Preencha os detalhes do seu perfil e do seu mandato.
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

      {/* Seção 1 — Seus detalhes (Perfil Pessoal) */}
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
          {/* Nome com avatar de iniciais */}
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-navy text-[11px] font-semibold text-white">
              {computeInitials(fullName)}
            </span>
            <label htmlFor="su-fullName" className="sr-only">
              Seu nome completo
            </label>
            <input
              id="su-fullName"
              name="fullName"
              type="text"
              required
              disabled={disabled || pending}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo *"
              className="w-full bg-transparent text-sm font-medium text-ink-primary placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            />
          </div>

          {/* E-mail */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="su-email"
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
                id="su-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={disabled || pending}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

          {/* Senha */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="su-password"
              className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm"
            >
              <Lock
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Senha</span>
            </label>
            <input
              id="su-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              disabled={disabled || pending}
              placeholder="Mínimo 8 caracteres"
              className="min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-ink-primary placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            />
          </div>

          {/* Telefone */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="su-phone"
              className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm"
            >
              <Phone
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Telefone</span>
            </label>
            <input
              id="su-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              disabled={disabled || pending}
              placeholder="Opcional"
              className="min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-ink-primary placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            />
          </div>

          {/* Sua Função */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="su-role"
              className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm"
            >
              <UserCheck
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Sua função</span>
            </label>
            <select
              id="su-role"
              name="teamRoleLabel"
              defaultValue="Parlamentar"
              disabled={disabled || pending}
              className="bg-transparent text-right text-sm font-medium text-ink-primary focus:outline-none"
            >
              {TEAM_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Seção 2 — Detalhes do mandato */}
      <section className="relative pl-12 pb-6">
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-white text-ink-secondary"
        >
          <Briefcase className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span
          aria-hidden="true"
          className="absolute top-8 bottom-0 left-4 border-l border-dashed border-border-strong"
        />

        <h2 className="mb-3 pt-1 text-sm font-semibold text-ink-primary">
          Detalhes do mandato
        </h2>

        <div className="divide-y divide-border-subtle/80 overflow-hidden rounded-2xl border border-border-subtle bg-white">
          {/* Nome do mandato */}
          <div className="px-4 py-3">
            <label htmlFor="su-orgName" className="sr-only">
              Nome do mandato ou organização
            </label>
            <input
              id="su-orgName"
              name="orgName"
              type="text"
              required
              disabled={disabled || pending}
              value={orgName}
              onChange={(e) => {
                const val = e.target.value;
                setOrgName(val);
                if (!slugTouched) {
                  setSlug(slugify(val));
                }
              }}
              placeholder="Nome do mandato ou organização *"
              className="w-full bg-transparent text-sm font-medium text-ink-primary placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            />
          </div>

          {/* Tipo */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="su-orgType"
              className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm"
            >
              <Tag
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Tipo</span>
            </label>
            <select
              id="su-orgType"
              name="organizationType"
              defaultValue="mandate"
              disabled={disabled || pending}
              className="bg-transparent text-right text-sm font-medium text-ink-primary focus:outline-none"
            >
              <option value="mandate">Mandato</option>
              <option value="pre_campaign">Pré-campanha</option>
              <option value="campaign">Campanha</option>
              <option value="other">Outra organização</option>
            </select>
          </div>

          {/* Cargo */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="su-office"
              className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm"
            >
              <Award
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Cargo</span>
            </label>
            <input
              id="su-office"
              name="officeTitle"
              type="text"
              disabled={disabled || pending}
              placeholder="Ex.: Vereador(a)"
              className="min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-ink-primary placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            />
          </div>

          {/* Município */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="su-city"
              className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm"
            >
              <MapPin
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Município</span>
            </label>
            <input
              id="su-city"
              name="city"
              type="text"
              disabled={disabled || pending}
              placeholder="Ex.: Imperatriz"
              className="min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-ink-primary placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            />
          </div>

          {/* UF */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="su-state"
              className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm"
            >
              <Map
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>UF</span>
            </label>
            <select
              id="su-state"
              name="state"
              defaultValue=""
              disabled={disabled || pending}
              className="bg-transparent text-right text-sm font-medium text-ink-primary focus:outline-none"
            >
              <option value="">Selecione a UF</option>
              {BRAZIL_STATES.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>

          {/* Slug */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="su-slug"
              className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm"
            >
              <Link2
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Identificador</span>
            </label>
            <input
              id="su-slug"
              name="slug"
              type="text"
              required
              disabled={disabled || pending}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
              placeholder="meu-mandato"
              className="min-w-0 flex-1 bg-transparent text-right font-mono text-xs font-medium text-ink-primary placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            />
          </div>

          {/* Instagram */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <label
              htmlFor="su-instagram"
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
              id="su-instagram"
              name="instagram"
              type="text"
              disabled={disabled || pending}
              placeholder="@usuario (opcional)"
              className="min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-ink-primary placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            />
          </div>

          {/* Cores do painel */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="flex shrink-0 items-center gap-2.5 text-xs text-ink-secondary sm:text-sm">
              <Palette
                className="h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Identidade visual</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                name="primaryColor"
                type="color"
                aria-label="Cor principal"
                disabled={disabled || pending}
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                className="h-7 w-7 cursor-pointer rounded-md border border-border-subtle bg-white p-0.5"
              />
              <input
                name="accentColor"
                type="color"
                aria-label="Cor de destaque"
                disabled={disabled || pending}
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
                className="h-7 w-7 cursor-pointer rounded-md border border-border-subtle bg-white p-0.5"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Botão final conectado à curva da linha pontilhada */}
      <div className="relative pl-12">
        <span
          aria-hidden="true"
          className="absolute top-0 left-4 h-6 w-8 rounded-bl-xl border-b border-l border-dashed border-border-strong"
        />
        <button
          type="submit"
          disabled={disabled || pending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-emerald px-5 text-sm font-medium text-white transition-colors hover:bg-brand-emerald-hover active:scale-[0.99] disabled:opacity-50"
        >
          {pending ? "Criando conta..." : "Continuar"}
        </button>
      </div>
    </form>
  );
}
