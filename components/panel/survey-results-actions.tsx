"use client";

import { useActionState, useState } from "react";
import {
  Check,
  Copy,
  Megaphone,
  Printer,
  Share2,
} from "lucide-react";
import {
  publishSurveySummaryToTransparencyAction,
  type SurveyActionState,
} from "@/app/painel/pesquisas/actions";

const INITIAL_STATE: SurveyActionState = { error: null, success: null };

export function SurveyResultsActions({
  surveyId,
  surveyTitle,
  tenantName,
  totalResponses,
  topStrengths,
  topImprovements,
  whatsappSummaryText,
  canPublishTransparency,
}: {
  surveyId: string;
  surveyTitle: string;
  tenantName: string;
  totalResponses: number;
  topStrengths: Array<{ label: string; count: number }>;
  topImprovements: Array<{ label: string; count: number }>;
  whatsappSummaryText: string;
  canPublishTransparency: boolean;
}) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [showSocialCard, setShowSocialCard] = useState(false);
  const [publishState, publishAction, isPublishing] = useActionState(
    publishSurveySummaryToTransparencyAction,
    INITIAL_STATE
  );

  async function handleCopySummary() {
    try {
      await navigator.clipboard.writeText(whatsappSummaryText);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      // Fallback silencioso
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={handleCopySummary}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3.5 py-2 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
        >
          {copiedSummary ? (
            <>
              <Check className="h-3.5 w-3.5 text-brand-emerald" />
              Resumo copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copiar resumo para WhatsApp
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowSocialCard((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3.5 py-2 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
        >
          <Share2 className="h-3.5 w-3.5" />
          {showSocialCard ? "Ocultar card de resumo" : "Card para redes sociais"}
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3.5 py-2 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
        >
          <Printer className="h-3.5 w-3.5" />
          Imprimir / Salvar PDF
        </button>

        {canPublishTransparency && totalResponses > 0 ? (
          <form action={publishAction}>
            <input type="hidden" name="surveyId" value={surveyId} />
            <button
              type="submit"
              disabled={isPublishing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-emerald px-3.5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Megaphone className="h-3.5 w-3.5" />
              {isPublishing
                ? "Publicando..."
                : "Publicar resumo na Transparência"}
            </button>
          </form>
        ) : null}
      </div>

      {publishState.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700"
        >
          {publishState.error}
        </div>
      ) : null}

      {publishState.success ? (
        <div className="rounded-xl border border-emerald-200 bg-brand-emerald-soft px-4 py-2.5 text-xs text-brand-emerald">
          {publishState.success}
        </div>
      ) : null}

      {showSocialCard ? (
        <div className="mx-auto max-w-md rounded-2xl border border-border-subtle bg-brand-navy p-6 text-white">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/70">
            Prestação de contas · {tenantName}
          </p>
          <h3 className="mt-1.5 text-lg font-semibold leading-snug">
            {surveyTitle}
          </h3>
          <p className="mt-2 text-xs text-white/80">
            {totalResponses}{" "}
            {totalResponses === 1
              ? "cidadão participou"
              : "cidadãos participaram"}{" "}
            desta escuta pública (dados agregados e anonimizados).
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-[11px] font-medium text-emerald-300">
                Onde estamos acertando
              </p>
              <ul className="mt-1.5 space-y-1 text-xs">
                {topStrengths.slice(0, 3).map((item) => (
                  <li key={item.label} className="truncate">
                    • {item.label} ({item.count})
                  </li>
                ))}
                {topStrengths.length === 0 ? (
                  <li className="text-white/60">Sem citações ainda</li>
                ) : null}
              </ul>
            </div>

            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-[11px] font-medium text-amber-300">
                Prioridades para melhorar
              </p>
              <ul className="mt-1.5 space-y-1 text-xs">
                {topImprovements.slice(0, 3).map((item) => (
                  <li key={item.label} className="truncate">
                    • {item.label} ({item.count})
                  </li>
                ))}
                {topImprovements.length === 0 ? (
                  <li className="text-white/60">Sem citações ainda</li>
                ) : null}
              </ul>
            </div>
          </div>

          <p className="mt-4 text-[10px] text-white/60">
            Escuta voluntária realizada pelo Mandato+. Nenhum dado pessoal individual é divulgado.
          </p>
        </div>
      ) : null}
    </div>
  );
}
