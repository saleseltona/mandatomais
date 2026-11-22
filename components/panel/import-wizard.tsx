"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { readSheet } from "read-excel-file/browser";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import {
  processImportBatchAction,
  type ImportBatchResult,
} from "@/app/painel/configuracoes/importacao/actions";
import { Button } from "@/components/ui/button";
import type { DataScope } from "@/lib/types/database";
import {
  normalizeImportRow,
  parseCsvText,
  suggestColumnMapping,
  type ColumnMapping,
} from "@/lib/utils/import-parser";

const EMPTY_MAPPING: ColumnMapping = {
  fullName: "",
  whatsapp: "",
  email: "",
  city: "",
  neighborhood: "",
  instagram: "",
  originalOrigin: "",
  originalRegisteredAt: "",
};

export function ImportWizard({ defaultScope }: { defaultScope: DataScope }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [dataScope, setDataScope] = useState<DataScope>(defaultScope);
  const [declaredOrigin, setDeclaredOrigin] = useState("");
  const [declaredPurpose, setDeclaredPurpose] = useState("");
  const [legalBasis, setLegalBasis] = useState("revisao_pendente");
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);

  const [result, setResult] = useState<ImportBatchResult | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setFileName(file.name);

    try {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith(".csv") || lowerName.endsWith(".txt")) {
        const text = await file.text();
        const parsed = parseCsvText(text);
        if (parsed.headers.length === 0 || parsed.rows.length === 0) {
          setParseError("O arquivo CSV está vazio ou sem linhas de dados.");
          return;
        }
        setHeaders(parsed.headers);
        setRows(parsed.rows.slice(0, 1000));
        setMapping(suggestColumnMapping(parsed.headers));
        setStep(2);
      } else if (lowerName.endsWith(".xlsx")) {
        const rawMatrix = await readSheet(file);
        if (rawMatrix.length < 2) {
          setParseError("A planilha XLSX precisa ter cabeçalho e ao menos 1 linha.");
          return;
        }
        const parsedHeaders = rawMatrix[0].map((cell, idx) =>
          String(cell ?? "").trim() || `Coluna ${idx + 1}`
        );
        const parsedRows = rawMatrix
          .slice(1, 1001)
          .map((cells) => {
            const rec: Record<string, string> = {};
            parsedHeaders.forEach((h, idx) => {
              const val = cells[idx];
              rec[h] = val === null || val === undefined ? "" : String(val).trim();
            });
            return rec;
          })
          .filter((r) => Object.values(r).some((v) => v.length > 0));

        setHeaders(parsedHeaders);
        setRows(parsedRows);
        setMapping(suggestColumnMapping(parsedHeaders));
        setStep(2);
      } else {
        setParseError("Formato não suportado. Envie um arquivo .csv ou .xlsx.");
      }
    } catch {
      setParseError(
        "Não foi possível ler o arquivo. Verifique se o formato CSV/XLSX é válido."
      );
    }
  }

  const previewCandidates = rows
    .slice(0, 8)
    .map((r, idx) => normalizeImportRow(r, idx + 2, mapping));

  const quickStats = rows.reduce(
    (acc, r, idx) => {
      const norm = normalizeImportRow(r, idx + 2, mapping);
      if (norm.validationError) acc.invalid += 1;
      else acc.valid += 1;
      return acc;
    },
    { valid: 0, invalid: 0 }
  );

  function handleConfirmImport() {
    startTransition(async () => {
      const res = await processImportBatchAction({
        fileName,
        dataScope,
        declaredOrigin,
        declaredPurpose,
        legalBasis,
        rows,
        mapping,
      });
      setResult(res);
      if (!res.error) {
        setStep(5);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-muted">
          Etapa {step} de 5
        </p>
        {fileName ? (
          <span className="truncate text-xs text-ink-secondary">{fileName}</span>
        ) : null}
      </div>

      {parseError ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
        >
          {parseError}
        </div>
      ) : null}

      {result?.error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
        >
          {result.error}
        </div>
      ) : null}

      {/* Etapa 1: Upload */}
      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink-primary">
              Enviar arquivo CSV ou XLSX
            </h2>
            <p className="mt-1 text-xs text-ink-secondary">
              O arquivo é inspecionado antes de qualquer gravação. Não exigimos
              CPF e não armazenamos o arquivo bruto indefinidamente.
            </p>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-canvas px-6 py-10 text-center transition-colors hover:bg-surface-muted">
            <Upload
              className="h-6 w-6 text-ink-secondary"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="mt-2 text-sm font-medium text-ink-primary">
              Selecionar arquivo (.csv ou .xlsx)
            </span>
            <span className="mt-1 text-xs text-ink-muted">
              Até 1.000 linhas por lote
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.txt"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        </div>
      ) : null}

      {/* Etapa 2: Origem, Finalidade e Escopo */}
      {step === 2 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-brand-emerald">
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <span>
              {rows.length} linhas detectadas · {headers.length} colunas
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="imp-scope"
                className="block text-xs font-medium text-ink-secondary"
              >
                Base de destino *
              </label>
              <select
                id="imp-scope"
                value={dataScope}
                onChange={(e) => setDataScope(e.target.value as DataScope)}
                className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3 text-sm text-ink-primary"
              >
                <option value="mandate">Mandato</option>
                <option value="campaign">Campanha</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="imp-basis"
                className="block text-xs font-medium text-ink-secondary"
              >
                Situação da base legal *
              </label>
              <select
                id="imp-basis"
                value={legalBasis}
                onChange={(e) => setLegalBasis(e.target.value)}
                className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3 text-sm text-ink-primary"
              >
                <option value="revisao_pendente">
                  Avaliação jurídica pendente (somente organização interna)
                </option>
                <option value="consentimento_previo_documentado">
                  Consentimento prévio documentado fora da plataforma
                </option>
                <option value="atendimento_institucional">
                  Registros de atendimento institucional
                </option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="imp-origin"
              className="block text-xs font-medium text-ink-secondary"
            >
              Origem declarada da base *
            </label>
            <input
              id="imp-origin"
              type="text"
              required
              value={declaredOrigin}
              onChange={(e) => setDeclaredOrigin(e.target.value)}
              placeholder="Ex.: Planilha de atendimentos do gabinete 2026"
              className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary"
            />
          </div>

          <div>
            <label
              htmlFor="imp-purpose"
              className="block text-xs font-medium text-ink-secondary"
            >
              Finalidade de uso *
            </label>
            <input
              id="imp-purpose"
              type="text"
              required
              value={declaredPurpose}
              onChange={(e) => setDeclaredPurpose(e.target.value)}
              placeholder="Ex.: Organização e deduplicação cadastral"
              className="mt-1.5 block h-11 w-full rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary"
            />
          </div>

          <div className="rounded-xl border border-border-subtle bg-canvas p-3.5 text-xs leading-relaxed text-ink-secondary">
            <strong className="font-medium text-ink-primary">
              Importante:
            </strong>{" "}
            registros importados entram com consentimento{" "}
            <strong>pendente</strong> (não autorizados para envio automático) e
            categoria separada de apoiadores declarados. Esta declaração não
            substitui a avaliação da base legal.
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="md" onClick={() => setStep(1)}>
              Trocar arquivo
            </Button>
            <Button
              variant="secondary"
              size="md"
              disabled={
                declaredOrigin.trim().length < 2 ||
                declaredPurpose.trim().length < 3
              }
              onClick={() => setStep(3)}
            >
              Mapear colunas
            </Button>
          </div>
        </div>
      ) : null}

      {/* Etapa 3: Mapeamento de colunas */}
      {step === 3 ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink-primary">
              Mapear colunas do arquivo
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Campos encontrados no arquivo: {headers.join(", ")}.
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {(
              [
                ["fullName", "Nome"],
                ["whatsapp", "Telefone / WhatsApp"],
                ["email", "E-mail"],
                ["city", "Município"],
                ["neighborhood", "Bairro"],
                ["instagram", "@Instagram"],
                ["originalOrigin", "Origem original"],
                ["originalRegisteredAt", "Data original do cadastro"],
              ] as Array<[keyof ColumnMapping, string]>
            ).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-ink-secondary">
                  {label}
                </label>
                <select
                  value={mapping[key]}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="mt-1 block h-10 w-full rounded-xl border border-border-subtle bg-white px-3 text-sm text-ink-primary"
                >
                  <option value="">Ignorar campo</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="md" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Button variant="secondary" size="md" onClick={() => setStep(4)}>
              Visualizar amostra
            </Button>
          </div>
        </div>
      ) : null}

      {/* Etapa 4: Amostra, validação e confirmação */}
      {step === 4 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">
                Revisão antes de confirmar
              </h2>
              <p className="text-xs text-ink-secondary">
                Destino: {dataScope === "mandate" ? "Mandato" : "Campanha"} ·{" "}
                {quickStats.valid} válidas · {quickStats.invalid} com erro
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border-subtle">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border-subtle bg-canvas text-ink-muted">
                <tr>
                  <th className="px-3 py-2">Linha</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Canais</th>
                  <th className="px-3 py-2">Município</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/70">
                {previewCandidates.map((item) => (
                  <tr key={item.rowNumber}>
                    <td className="px-3 py-2 tabular-nums text-ink-muted">
                      {item.rowNumber}
                    </td>
                    <td className="px-3 py-2 font-medium text-ink-primary">
                      {item.fullName || "—"}
                    </td>
                    <td className="px-3 py-2 text-ink-secondary">
                      {[
                        item.whatsapp,
                        item.email,
                        item.instagramNormalized
                          ? `@${item.instagramNormalized}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-ink-secondary">
                      {item.city ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {item.validationError ? (
                        <span className="text-red-700">
                          {item.validationError}
                        </span>
                      ) : (
                        <span className="text-brand-emerald">Pronto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <p>
              Possíveis correspondências com contatos já existentes serão
              enviadas para a fila de <strong>Conciliação</strong> para revisão
              manual — nada será mesclado automaticamente.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="md"
              disabled={isPending}
              onClick={() => setStep(3)}
            >
              Voltar
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={isPending || quickStats.valid === 0}
              onClick={handleConfirmImport}
            >
              {isPending ? "Processando lote..." : "Confirmar importação"}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Etapa 5: Resultado */}
      {step === 5 && result?.summary ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-brand-emerald"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-base font-semibold text-ink-primary">
                Importação concluída
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                {result.summary.created} novos registros criados (consentimento
                pendente) · {result.summary.pendingReview} enviados para
                conciliação · {result.summary.rejected} rejeitados.
              </p>
            </div>
          </div>

          {result.summary.rejectedSamples.length > 0 ? (
            <div className="rounded-xl border border-border-subtle bg-canvas p-4">
              <p className="text-xs font-semibold text-ink-primary">
                Registros rejeitados
              </p>
              <ul className="mt-2 space-y-1 text-xs text-ink-secondary">
                {result.summary.rejectedSamples.map((r) => (
                  <li key={r.rowNumber}>
                    Linha {r.rowNumber}: {r.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2.5 pt-1">
            {result.summary.pendingReview > 0 ? (
              <Link
                href={`/painel/configuracoes/conciliacao?escopo=${dataScope}`}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-emerald px-4 text-xs font-medium text-white hover:bg-brand-emerald-hover"
              >
                Revisar conciliações ({result.summary.pendingReview})
              </Link>
            ) : null}
            <Link
              href={`/painel/base?escopo=${dataScope}`}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border-subtle bg-white px-4 text-xs font-medium text-ink-primary hover:bg-surface-muted"
            >
              Ver base
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep(1);
                setFileName("");
                setRows([]);
                setHeaders([]);
                setResult(null);
              }}
            >
              Nova importação
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
