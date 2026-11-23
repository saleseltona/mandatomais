"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  createSurveyAction,
  type SurveyActionState,
} from "@/app/painel/pesquisas/actions";
import type { DataScope } from "@/lib/types/database";
import type {
  SurveyCustomQuestion,
  SurveyQuestionType,
} from "@/lib/utils/surveys";

const INITIAL_STATE: SurveyActionState = { error: null, success: null };

const QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  single_choice: "Múltipla escolha (única resposta)",
  multiple_choice: "Seleção múltipla (várias respostas)",
  scale_5: "Escala de 1 a 5",
  scale_10: "Escala de 0 a 10",
  yes_no: "Sim ou Não",
  short_text: "Texto curto",
  long_text: "Texto longo",
  date: "Data",
  number: "Número",
};

function slugifyTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function CreateSurveyForm({
  activeScope,
  defaultCity,
}: {
  activeScope: DataScope;
  defaultCity: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createSurveyAction,
    INITIAL_STATE
  );

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [targetAudience, setTargetAudience] = useState<
    "geral" | "cidade" | "bairro" | "segmento"
  >("geral");
  const [customQuestions, setCustomQuestions] = useState<SurveyCustomQuestion[]>(
    []
  );

  // Estado para nova pergunta personalizada
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<SurveyQuestionType>("single_choice");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptionsText, setNewOptionsText] = useState("");

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugEdited) {
      setSlug(slugifyTitle(value));
    }
  }

  function addCustomQuestion() {
    const label = newLabel.trim();
    if (label.length < 3) return;

    const needsOptions =
      newType === "single_choice" || newType === "multiple_choice";
    const options = needsOptions
      ? newOptionsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : undefined;

    if (needsOptions && (!options || options.length < 2)) {
      return;
    }

    const question: SurveyCustomQuestion = {
      id: `q_${Date.now().toString(36)}`,
      label,
      type: newType,
      required: newRequired,
      ...(options ? { options } : {}),
    };

    setCustomQuestions((prev) => [...prev, question]);
    setNewLabel("");
    setNewOptionsText("");
    setNewRequired(false);
  }

  function removeCustomQuestion(id: string) {
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  const needsOptions =
    newType === "single_choice" || newType === "multiple_choice";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="dataScope" value={activeScope} />
      <input
        type="hidden"
        name="customQuestionsJson"
        value={JSON.stringify(customQuestions)}
      />

      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      ) : null}

      {/* 1. Informações principais */}
      <section className="space-y-4 rounded-2xl border border-border-subtle bg-white p-5 sm:p-6">
        <div>
          <h2 className="text-sm font-semibold text-ink-primary">
            1. Identificação da pesquisa
          </h2>
          <p className="mt-0.5 text-xs text-ink-secondary">
            Defina o título, o endereço público e o status inicial.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="survey-title"
              className="block text-xs font-medium text-ink-secondary"
            >
              Título da pesquisa *
            </label>
            <input
              id="survey-title"
              name="title"
              type="text"
              required
              minLength={3}
              maxLength={140}
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ex.: Pesquisa de Percepção — 1º Semestre"
              className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="survey-slug"
              className="block text-xs font-medium text-ink-secondary"
            >
              Endereço público (/pesquisa/...) *
            </label>
            <input
              id="survey-slug"
              name="slug"
              type="text"
              required
              minLength={3}
              maxLength={60}
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(slugifyTitle(e.target.value));
              }}
              placeholder="escuta-bairros-2026"
              className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 font-mono text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              Link final: <span className="font-mono">/pesquisa/{slug || "seu-slug"}</span>
            </p>
          </div>

          <div>
            <label
              htmlFor="survey-status"
              className="block text-xs font-medium text-ink-secondary"
            >
              Status inicial
            </label>
            <select
              id="survey-status"
              name="status"
              defaultValue="active"
              className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
            >
              <option value="active">Ativa (aberta para respostas)</option>
              <option value="draft">Rascunho (ainda não pública)</option>
              <option value="paused">Pausada</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="survey-description"
              className="block text-xs font-medium text-ink-secondary"
            >
              Descrição interna (opcional)
            </label>
            <input
              id="survey-description"
              name="description"
              type="text"
              maxLength={400}
              placeholder="Objetivo interno para a equipe do mandato"
              className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* 2. Textos públicos e janela de coleta */}
      <section className="space-y-4 rounded-2xl border border-border-subtle bg-white p-5 sm:p-6">
        <div>
          <h2 className="text-sm font-semibold text-ink-primary">
            2. Apresentação e período de coleta
          </h2>
          <p className="mt-0.5 text-xs text-ink-secondary">
            Deixe em branco para usar os textos institucionais padrão e manter a pesquisa sem data limite.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="survey-intro"
              className="block text-xs font-medium text-ink-secondary"
            >
              Texto de introdução (opcional)
            </label>
            <textarea
              id="survey-intro"
              name="introText"
              rows={2}
              maxLength={400}
              placeholder="Responda em menos de 2 minutos. Sua participação é voluntária e suas respostas serão usadas apenas para melhorar o atendimento e as ações do mandato."
              className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="survey-thank-you"
              className="block text-xs font-medium text-ink-secondary"
            >
              Mensagem de agradecimento após envio (opcional)
            </label>
            <textarea
              id="survey-thank-you"
              name="thankYouText"
              rows={2}
              maxLength={400}
              placeholder="Obrigado pela sua participação! Sua opinião ajuda a orientar as ações e prioridades do mandato."
              className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="survey-starts-at"
              className="block text-xs font-medium text-ink-secondary"
            >
              Início da coleta (opcional)
            </label>
            <input
              id="survey-starts-at"
              name="startsAt"
              type="datetime-local"
              className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="survey-ends-at"
              className="block text-xs font-medium text-ink-secondary"
            >
              Encerramento da coleta (opcional)
            </label>
            <input
              id="survey-ends-at"
              name="endsAt"
              type="datetime-local"
              className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="survey-limit"
              className="block text-xs font-medium text-ink-secondary"
            >
              Limite máximo de respostas (opcional)
            </label>
            <input
              id="survey-limit"
              name="responseLimit"
              type="number"
              min={1}
              max={100000}
              placeholder="Sem limite"
              className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="survey-audience"
              className="block text-xs font-medium text-ink-secondary"
            >
              Público-alvo
            </label>
            <select
              id="survey-audience"
              name="targetAudience"
              value={targetAudience}
              onChange={(e) =>
                setTargetAudience(
                  e.target.value as "geral" | "cidade" | "bairro" | "segmento"
                )
              }
              className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
            >
              <option value="geral">População geral</option>
              <option value="cidade">Município específico</option>
              <option value="bairro">Bairros específicos</option>
              <option value="segmento">Segmento (ex.: comércio, educação)</option>
            </select>
          </div>

          {(targetAudience === "cidade" || targetAudience === "bairro") && (
            <div>
              <label
                htmlFor="survey-target-city"
                className="block text-xs font-medium text-ink-secondary"
              >
                Município de referência
              </label>
              <input
                id="survey-target-city"
                name="targetCity"
                type="text"
                defaultValue={defaultCity}
                placeholder="Ex.: Imperatriz"
                className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
              />
            </div>
          )}

          {targetAudience === "bairro" && (
            <div>
              <label
                htmlFor="survey-neighborhoods"
                className="block text-xs font-medium text-ink-secondary"
              >
                Bairros (separados por vírgula)
              </label>
              <input
                id="survey-neighborhoods"
                name="targetNeighborhoods"
                type="text"
                placeholder="Centro, Nova Imperatriz, Bacuri"
                className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
              />
            </div>
          )}

          {targetAudience === "segmento" && (
            <div className="sm:col-span-2">
              <label
                htmlFor="survey-segment"
                className="block text-xs font-medium text-ink-secondary"
              >
                Segmento
              </label>
              <input
                id="survey-segment"
                name="targetSegment"
                type="text"
                placeholder="Ex.: Professores, comerciantes, lideranças comunitárias"
                className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
              />
            </div>
          )}
        </div>
      </section>

      {/* 3. Questionário padrão + perguntas personalizadas */}
      <section className="space-y-4 rounded-2xl border border-border-subtle bg-white p-5 sm:p-6">
        <div>
          <h2 className="text-sm font-semibold text-ink-primary">
            3. Questionário e perguntas adicionais
          </h2>
          <p className="mt-0.5 text-xs text-ink-secondary">
            As 12 perguntas padrão de percepção, prioridades e consentimento já vêm configuradas. Você pode adicionar perguntas complementares sem solicitar dados sensíveis (CPF, partido, religião ou intenção de voto).
          </p>
        </div>

        <label className="flex items-start gap-2.5 rounded-xl border border-border-subtle bg-canvas/60 px-3.5 py-3 text-xs text-ink-primary">
          <input
            type="checkbox"
            name="useDefaultQuestions"
            defaultChecked
            value="on"
            className="mt-0.5 h-4 w-4 rounded border-border-subtle text-brand-navy"
          />
          <span>
            <strong className="font-semibold">
              Usar o questionário padrão do Mandato+
            </strong>{" "}
            (avaliação da gestão, avaliação do mandato, áreas de acerto e melhoria, prioridades do bairro e consentimento opcional).
          </span>
        </label>

        {customQuestions.length > 0 ? (
          <ul className="space-y-2">
            {customQuestions.map((q, index) => (
              <li
                key={q.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border-subtle px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-primary">
                    {index + 1}. {q.label}
                    {q.required ? (
                      <span className="ml-1.5 text-xs text-red-600">*</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {QUESTION_TYPE_LABELS[q.type]}
                    {q.options?.length ? ` · ${q.options.join(", ")}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeCustomQuestion(q.id)}
                  className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Remover pergunta"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="space-y-3 rounded-xl border border-dashed border-border-subtle p-4">
          <p className="text-xs font-semibold text-ink-primary">
            Adicionar pergunta complementar (opcional)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                maxLength={200}
                placeholder="Ex.: Qual horário prefere para audiências públicas?"
                className="w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <select
                value={newType}
                onChange={(e) =>
                  setNewType(e.target.value as SurveyQuestionType)
                }
                className="w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm text-ink-primary focus:border-brand-navy focus:outline-none"
              >
                {(
                  Object.keys(QUESTION_TYPE_LABELS) as SurveyQuestionType[]
                ).map((key) => (
                  <option key={key} value={key}>
                    {QUESTION_TYPE_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-ink-secondary">
              <input
                type="checkbox"
                checked={newRequired}
                onChange={(e) => setNewRequired(e.target.checked)}
                className="h-4 w-4 rounded border-border-subtle text-brand-navy"
              />
              Resposta obrigatória
            </label>

            {needsOptions ? (
              <div className="sm:col-span-2">
                <textarea
                  rows={3}
                  value={newOptionsText}
                  onChange={(e) => setNewOptionsText(e.target.value)}
                  placeholder={"Uma opção por linha (mínimo 2):\nManhã\nTarde\nNoite"}
                  className="w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none"
                />
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={addCustomQuestion}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3.5 py-2 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar pergunta
          </button>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-brand-navy px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? "Criando pesquisa..." : "Criar pesquisa"}
        </button>
      </div>
    </form>
  );
}
