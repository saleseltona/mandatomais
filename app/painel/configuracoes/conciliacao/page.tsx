import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import {
  acceptMergeRowAction,
  createSeparateFromRowAction,
  ignoreImportRowAction,
  undoContactMergeAction,
} from "@/app/painel/configuracoes/conciliacao/actions";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import type {
  Contact,
  ContactMerge,
  ImportMatchType,
  ImportRow,
} from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Conciliação de cadastros | Mandato+",
  description:
    "Revise correspondências, resolva duplicidades manualmente e desfaça mesclagens com histórico.",
};

const MATCH_LABELS: Record<ImportMatchType, string> = {
  exact_instagram: "Correspondência exata de @Instagram",
  exact_email: "Correspondência exata de e-mail",
  exact_phone: "Correspondência exata de telefone",
  possible_duplicate: "Possível duplicidade (revisão manual)",
  no_match: "Sem correspondência",
};

export default async function ConciliacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadAuthenticatedMembership(params.escopo);
  const scopeQuery = `?escopo=${ctx.activeScope}`;

  let pendingRows: ImportRow[] = [];
  let matchedContactsMap = new Map<string, Contact>();
  let recentMerges: ContactMerge[] = [];

  if (ctx.tenant && ctx.canManageImports) {
    const supabase = await createClient();
    const [{ data: rows }, { data: merges }] = await Promise.all([
      supabase
        .from("import_rows")
        .select("*")
        .eq("tenant_id", ctx.tenant.id)
        .eq("data_scope", ctx.activeScope)
        .eq("resolution", "pending")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("contact_merges")
        .select("*")
        .eq("tenant_id", ctx.tenant.id)
        .eq("data_scope", ctx.activeScope)
        .order("merged_at", { ascending: false })
        .limit(15),
    ]);

    pendingRows = (rows as ImportRow[] | null) ?? [];
    recentMerges = (merges as ContactMerge[] | null) ?? [];

    const contactIds = Array.from(
      new Set(
        pendingRows
          .map((r) => r.matched_contact_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (contactIds.length > 0) {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("*")
        .eq("tenant_id", ctx.tenant.id)
        .in("id", contactIds);

      matchedContactsMap = new Map(
        ((contacts as Contact[] | null) ?? []).map((c) => [c.id, c])
      );
    }
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
              Conciliação de cadastros
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Uma correspondência indica coincidência cadastral; não comprova
              apoio político, consentimento ou intenção de voto.
            </p>
          </header>

          {!ctx.canManageImports ? (
            <div className="rounded-2xl border border-border-subtle bg-white p-6 text-sm text-ink-secondary">
              Apenas proprietários e administradores podem revisar conciliações.
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="px-1 text-sm font-semibold text-ink-primary">
                  Pendentes de revisão ({pendingRows.length})
                </h2>

                {pendingRows.length === 0 ? (
                  <div className="rounded-2xl border border-border-subtle bg-white p-6">
                    <p className="text-sm font-medium text-ink-primary">
                      Nenhuma correspondência pendente.
                    </p>
                    <p className="mt-1 text-xs text-ink-secondary">
                      Quando uma importação encontrar registros compatíveis com
                      contatos existentes, eles aparecerão aqui para revisão.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {pendingRows.map((row) => {
                      const existing = row.matched_contact_id
                        ? matchedContactsMap.get(row.matched_contact_id)
                        : null;
                      const norm = row.normalized_data ?? {};

                      return (
                        <li
                          key={row.id}
                          className="rounded-2xl border border-border-subtle bg-white p-5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
                            <span className="text-xs font-semibold text-brand-navy">
                              {MATCH_LABELS[row.match_type]}
                            </span>
                            <span className="text-xs text-ink-muted">
                              Campos coincidentes:{" "}
                              {row.match_fields.join(", ") || "—"}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl bg-canvas p-3.5 text-xs">
                              <p className="font-semibold text-ink-primary">
                                Registro importado (linha {row.row_number})
                              </p>
                              <p className="mt-1 text-ink-primary">
                                {norm.full_name || "—"}
                              </p>
                              <p className="mt-0.5 text-ink-secondary">
                                {[
                                  norm.whatsapp,
                                  norm.email,
                                  norm.instagram_handle,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </p>
                              <p className="mt-0.5 text-ink-muted">
                                {[norm.neighborhood, norm.city]
                                  .filter(Boolean)
                                  .join(", ") || "Localização não informada"}
                              </p>
                            </div>

                            <div className="rounded-xl border border-border-subtle p-3.5 text-xs">
                              <p className="font-semibold text-ink-primary">
                                Contato já existente na base
                              </p>
                              {existing ? (
                                <>
                                  <p className="mt-1 text-ink-primary">
                                    {existing.full_name}
                                  </p>
                                  <p className="mt-0.5 text-ink-secondary">
                                    {[
                                      existing.whatsapp,
                                      existing.email,
                                      existing.instagram_handle,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ") || "—"}
                                  </p>
                                  <p className="mt-0.5 text-ink-muted">
                                    {[existing.neighborhood, existing.city]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </p>
                                </>
                              ) : (
                                <p className="mt-1 text-ink-muted">
                                  Contato não encontrado.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {existing ? (
                              <form action={acceptMergeRowAction}>
                                <input type="hidden" name="rowId" value={row.id} />
                                <button
                                  type="submit"
                                  className="h-9 rounded-xl bg-brand-emerald px-3.5 text-xs font-medium text-white hover:bg-brand-emerald-hover"
                                >
                                  Mesclar campos faltantes
                                </button>
                              </form>
                            ) : null}

                            <form action={createSeparateFromRowAction}>
                              <input type="hidden" name="rowId" value={row.id} />
                              <button
                                type="submit"
                                className="h-9 rounded-xl border border-border-subtle bg-white px-3.5 text-xs font-medium text-ink-primary hover:bg-surface-muted"
                              >
                                Criar como registro separado
                              </button>
                            </form>

                            <form action={ignoreImportRowAction}>
                              <input type="hidden" name="rowId" value={row.id} />
                              <button
                                type="submit"
                                className="h-9 rounded-xl px-3 text-xs font-medium text-ink-muted hover:bg-surface-muted hover:text-ink-primary"
                              >
                                Ignorar
                              </button>
                            </form>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Histórico de mesclagens com Desfazer */}
              <section className="space-y-2.5">
                <h2 className="px-1 text-sm font-semibold text-ink-primary">
                  Histórico de mesclagens
                </h2>
                {recentMerges.length === 0 ? (
                  <div className="rounded-2xl border border-border-subtle bg-white p-5 text-xs text-ink-muted">
                    Nenhuma mesclagem realizada neste escopo.
                  </div>
                ) : (
                  <ul className="divide-y divide-border-subtle/70 rounded-2xl border border-border-subtle bg-white">
                    {recentMerges.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
                      >
                        <div>
                          <p className="font-medium text-ink-primary">
                            Mesclagem por {m.match_fields.join(", ") || "revisão"}
                          </p>
                          <p className="text-ink-muted tabular-nums">
                            {dateFmt.format(new Date(m.merged_at))}
                            {m.undone_at ? " · Desfeita" : ""}
                          </p>
                        </div>

                        {!m.undone_at ? (
                          <form action={undoContactMergeAction}>
                            <input type="hidden" name="mergeId" value={m.id} />
                            <button
                              type="submit"
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-white px-3 font-medium text-ink-primary hover:bg-surface-muted"
                            >
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Desfazer</span>
                            </button>
                          </form>
                        ) : null}
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
