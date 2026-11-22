import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { deleteImportBatchAction } from "@/app/painel/configuracoes/importacao/actions";
import { ImportWizard } from "@/components/panel/import-wizard";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import type { ImportBatch } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Central de importação | Mandato+",
  description:
    "Importe arquivos CSV ou XLSX com rastreabilidade, revisão de duplicidades e controle de retenção.",
};

export default async function ImportacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadAuthenticatedMembership(params.escopo);
  const scopeQuery = `?escopo=${ctx.activeScope}`;

  let batches: ImportBatch[] = [];

  if (ctx.tenant && ctx.canManageImports) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("import_batches")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .order("created_at", { ascending: false })
      .limit(20);
    batches = (data as ImportBatch[] | null) ?? [];
  }

  const dateFmt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <PanelShell
      tenant={ctx.tenant}
      userEmail={ctx.userEmail}
      userProfile={ctx.userProfile}
      activeScope={ctx.activeScope}
      activeTab="configuracoes"
    >
      {!ctx.tenant ? (
        <OnboardingTenantForm />
      ) : (
        <div className="space-y-6">
          <Link
            href={`/painel/configuracoes${scopeQuery}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Configurações</span>
          </Link>

          <header>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
              Central de importação
            </h1>
            <p className="mt-0.5 text-sm text-ink-secondary">
              Envie CSV ou XLSX com mapeamento de colunas, origem declarada e
              revisão de duplicidades.
            </p>
          </header>

          {!ctx.canManageImports ? (
            <div className="rounded-2xl border border-border-subtle bg-white p-6 text-sm text-ink-secondary">
              Apenas proprietários e administradores podem importar bases.
            </div>
          ) : (
            <>
              <ImportWizard defaultScope={ctx.activeScope} />

              <section className="space-y-2.5">
                <h2 className="px-1 text-sm font-semibold text-ink-primary">
                  Histórico de lotes (retenção de 30 dias para revisão)
                </h2>

                {batches.length === 0 ? (
                  <div className="rounded-2xl border border-border-subtle bg-white p-5 text-xs text-ink-muted">
                    Nenhum lote importado ainda.
                  </div>
                ) : (
                  <ul className="divide-y divide-border-subtle/70 rounded-2xl border border-border-subtle bg-white">
                    {batches.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-primary">
                            {b.file_name}
                          </p>
                          <p className="text-xs text-ink-secondary">
                            Origem: {b.declared_origin} ·{" "}
                            {b.data_scope === "mandate" ? "Mandato" : "Campanha"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-ink-muted tabular-nums">
                            {dateFmt.format(new Date(b.created_at))} ·{" "}
                            {b.imported_count} criados · {b.pending_review_count}{" "}
                            p/ conciliar · {b.rejected_count} rejeitados
                          </p>
                        </div>

                        <form action={deleteImportBatchAction}>
                          <input type="hidden" name="batchId" value={b.id} />
                          <button
                            type="submit"
                            aria-label="Excluir lote de importação"
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-subtle px-3 text-xs font-medium text-ink-secondary hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Remover lote</span>
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </PanelShell>
  );
}
