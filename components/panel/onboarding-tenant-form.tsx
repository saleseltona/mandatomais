"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, RotateCcw } from "lucide-react";
import {
  bootstrapTenantAction,
  type BootstrapTenantActionState,
} from "@/app/painel/actions";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  evaluateColorAccessibility,
} from "@/lib/utils/branding";

const initialState: BootstrapTenantActionState = {
  error: null,
  success: null,
};

const STEPS = [
  { id: 1, title: "Seu perfil" },
  { id: 2, title: "Ambiente" },
  { id: 3, title: "Identidade visual" },
  { id: 4, title: "Primeiro passo" },
] as const;

export function OnboardingTenantForm() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileRole, setProfileRole] = useState("");

  const [publicDisplayName, setPublicDisplayName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [orgType, setOrgType] = useState("mandate");
  const [officeTitle, setOfficeTitle] = useState("");
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [nextDestination, setNextDestination] = useState("painel");

  const [state, formAction, pending] = useActionState(
    bootstrapTenantAction,
    initialState
  );

  const primaryCheck = evaluateColorAccessibility(primaryColor);
  const accentCheck = evaluateColorAccessibility(accentColor);
  const previewName = publicDisplayName.trim() || orgName.trim() || "Seu Mandato";

  function handleRestoreDefaults() {
    setPrimaryColor(DEFAULT_PRIMARY_COLOR);
    setAccentColor(DEFAULT_ACCENT_COLOR);
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border-subtle bg-white p-6 sm:p-8">
      {/* Progresso em 4 etapas */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-ink-muted">
            Etapa {step} de 4 · {STEPS[step - 1].title}
          </p>
          <span className="text-xs text-ink-muted">
            Campos opcionais podem ficar para depois
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`h-1 rounded-full transition-colors ${
                s.id <= step ? "bg-brand-navy" : "bg-surface-muted"
              }`}
            />
          ))}
        </div>
      </div>

      <form action={formAction} className="space-y-5">
        {/* Campos ocultos persistidos entre etapas */}
        <input type="hidden" name="profileFullName" value={profileName} />
        <input type="hidden" name="profilePhone" value={profilePhone} />
        <input type="hidden" name="profileTeamRole" value={profileRole} />
        <input type="hidden" name="publicDisplayName" value={publicDisplayName} />
        <input type="hidden" name="name" value={orgName} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="organizationType" value={orgType} />
        <input type="hidden" name="officeTitle" value={officeTitle} />
        <input type="hidden" name="city" value={city} />
        <input type="hidden" name="state" value={stateUf} />
        <input type="hidden" name="bio" value={bio} />
        <input type="hidden" name="socialInstagram" value={instagram} />
        <input type="hidden" name="logoUrl" value={logoUrl} />
        <input type="hidden" name="primaryColor" value={primaryColor} />
        <input type="hidden" name="accentColor" value={accentColor} />
        <input type="hidden" name="nextDestination" value={nextDestination} />

        {state.error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
          >
            {state.error}
          </div>
        ) : null}

        {/* Etapa 1 — Seu perfil */}
        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-ink-primary">
                Sobre você
              </h1>
              <p className="mt-1 text-sm text-ink-secondary">
                Estes dados são do seu perfil pessoal de acesso, separados da
                identidade do mandato.
              </p>
            </div>

            <div>
              <label
                htmlFor="ob-profile-name"
                className="block text-xs font-medium text-ink-secondary"
              >
                Seu nome (opcional agora)
              </label>
              <input
                id="ob-profile-name"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Ex.: Ana Paula"
                className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="ob-profile-phone"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Telefone (opcional)
                </label>
                <input
                  id="ob-profile-phone"
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="(99) 99999-9999"
                  className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="ob-profile-role"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Função na equipe (opcional)
                </label>
                <input
                  id="ob-profile-role"
                  type="text"
                  value={profileRole}
                  onChange={(e) => setProfileRole(e.target.value)}
                  placeholder="Ex.: Parlamentar, Chefe de gabinete"
                  className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="md" onClick={() => setStep(2)}>
                Continuar
              </Button>
            </div>
          </div>
        ) : null}

        {/* Etapa 2 — De quem é este ambiente? */}
        {step === 2 ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-ink-primary">
                De quem é este ambiente?
              </h1>
              <p className="mt-1 text-sm text-ink-secondary">
                A escolha do tipo organiza o ambiente e não compartilha dados
                automaticamente entre mandato e campanha.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="ob-org-name"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Nome do mandato ou organização *
                </label>
                <input
                  id="ob-org-name"
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOrgName(val);
                    if (!slug) {
                      const generated = val
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "")
                        .slice(0, 48);
                      if (generated.length >= 3) setSlug(generated);
                    }
                  }}
                  placeholder="Ex.: Gabinete Lucas Silveira"
                  className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="ob-display-name"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Nome público de exibição (opcional)
                </label>
                <input
                  id="ob-display-name"
                  type="text"
                  value={publicDisplayName}
                  onChange={(e) => setPublicDisplayName(e.target.value)}
                  placeholder="Ex.: Lucas Silveira"
                  className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="ob-slug"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Identificador (slug) *
                </label>
                <input
                  id="ob-slug"
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="lucas-silveira"
                  className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="ob-org-type"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Tipo de ambiente
                </label>
                <select
                  id="ob-org-type"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
                >
                  <option value="mandate">Mandato</option>
                  <option value="pre_campaign">Pré-campanha</option>
                  <option value="campaign">Campanha</option>
                  <option value="other">Outra organização</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="ob-office"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Cargo (opcional)
                </label>
                <input
                  id="ob-office"
                  type="text"
                  value={officeTitle}
                  onChange={(e) => setOfficeTitle(e.target.value)}
                  placeholder="Vereador(a)"
                  className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="ob-city"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Município (opcional)
                </label>
                <input
                  id="ob-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Imperatriz"
                  className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="ob-state"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  UF (opcional)
                </label>
                <input
                  id="ob-state"
                  type="text"
                  maxLength={2}
                  value={stateUf}
                  onChange={(e) => setStateUf(e.target.value.toUpperCase())}
                  placeholder="MA"
                  className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm uppercase text-ink-primary focus:border-brand-navy focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="ob-instagram"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Instagram oficial (opcional)
                </label>
                <input
                  id="ob-instagram"
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@usuario"
                  className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="ob-bio"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Biografia curta (opcional)
                </label>
                <input
                  id="ob-bio"
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Resumo em uma linha"
                  className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="md" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                variant="secondary"
                size="md"
                disabled={orgName.trim().length < 2 || slug.trim().length < 3}
                onClick={() => setStep(3)}
              >
                Continuar
              </Button>
            </div>
          </div>
        ) : null}

        {/* Etapa 3 — Identidade visual com prévia em tempo real */}
        {step === 3 ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-ink-primary">
                  Identidade visual
                </h1>
                <p className="mt-1 text-sm text-ink-secondary">
                  Personalize as cores aplicadas no painel e nas páginas
                  públicas.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-muted hover:text-ink-primary"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Padrão
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="ob-primary"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Cor principal
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id="ob-primary"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                    className="h-11 w-12 cursor-pointer rounded-xl border border-border-subtle bg-white p-1"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                    aria-label="Código hexadecimal da cor principal"
                    className="h-11 flex-1 rounded-xl border border-border-subtle bg-white px-3 font-mono text-sm text-ink-primary"
                  />
                </div>
                {!primaryCheck.meetsAA ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    Contraste baixo ({primaryCheck.contrastRatio}:1). Prefira
                    tons mais escuros.
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="ob-accent"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Cor de destaque
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id="ob-accent"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
                    className="h-11 w-12 cursor-pointer rounded-xl border border-border-subtle bg-white p-1"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
                    aria-label="Código hexadecimal da cor de destaque"
                    className="h-11 flex-1 rounded-xl border border-border-subtle bg-white px-3 font-mono text-sm text-ink-primary"
                  />
                </div>
                {!accentCheck.meetsAA ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    Contraste baixo ({accentCheck.contrastRatio}:1) para texto
                    em botões.
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <label
                htmlFor="ob-logo"
                className="block text-xs font-medium text-ink-secondary"
              >
                URL do logotipo (opcional)
              </label>
              <input
                id="ob-logo"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
              />
            </div>

            {/* Prévia em tempo real */}
            <div className="rounded-2xl border border-border-subtle bg-canvas p-4">
              <p className="mb-2.5 text-[11px] font-medium text-ink-muted">
                Prévia em tempo real
              </p>
              <div
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: primaryColor,
                  color: primaryCheck.textColor,
                }}
              >
                <p className="text-xs opacity-75">{previewName}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                  128
                </p>
                <p className="text-xs opacity-75">apoiadores na base</p>
                <div className="mt-4 flex gap-2">
                  <span
                    className="inline-flex h-9 items-center rounded-lg px-3.5 text-xs font-medium"
                    style={{
                      backgroundColor: accentColor,
                      color: accentCheck.textColor,
                    }}
                  >
                    Novo apoiador
                  </span>
                  <span className="inline-flex h-9 items-center rounded-lg bg-white/15 px-3.5 text-xs font-medium">
                    Compartilhar link
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="md" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button variant="secondary" size="md" onClick={() => setStep(4)}>
                Continuar
              </Button>
            </div>
          </div>
        ) : null}

        {/* Etapa 4 — Primeiro passo */}
        {step === 4 ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-ink-primary">
                Por onde você quer começar?
              </h1>
              <p className="mt-1 text-sm text-ink-secondary">
                Escolha o primeiro destino após ativar{" "}
                <strong className="font-medium text-ink-primary">
                  {previewName}
                </strong>
                .
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {[
                {
                  id: "links",
                  title: "Criar link público",
                  desc: "Comece a receber cadastros consentidos.",
                },
                {
                  id: "importar",
                  title: "Importar base",
                  desc: "Envie CSV ou XLSX com revisão e conciliação.",
                },
                {
                  id: "equipe",
                  title: "Convidar equipe",
                  desc: "Adicione assessores com permissões próprias.",
                },
                {
                  id: "painel",
                  title: "Acessar o painel",
                  desc: "Explore a visão geral primeiro.",
                },
              ].map((option) => {
                const selected = nextDestination === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setNextDestination(option.id)}
                    className={`flex items-start justify-between rounded-xl border p-4 text-left transition-colors ${
                      selected
                        ? "border-brand-navy bg-surface-muted/60"
                        : "border-border-subtle bg-white hover:bg-canvas"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">
                        {option.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-secondary">
                        {option.desc}
                      </p>
                    </div>
                    {selected ? (
                      <Check
                        className="h-4 w-4 shrink-0 text-brand-emerald"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="md" onClick={() => setStep(3)}>
                Voltar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={pending}
              >
                {pending ? "Ativando ambiente..." : "Concluir configuração"}
              </Button>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
