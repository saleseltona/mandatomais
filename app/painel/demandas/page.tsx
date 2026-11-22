import type { Metadata } from "next";
import Link from "next/link";
import { updateDemandStatusAction } from "@/app/painel/demandas/actions";
import { CreateDemandForm } from "@/components/panel/create-demand-form";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import type { Demand, DemandStatus } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Demandas | Mandato+",
  description:
    "Acompanhamento de demandas comunitárias por bairro, protocolo e status.",
};

const STATUS_LABELS: Record<DemandStatus, string> = {
  recebida: "Recebida",
  em_execucao: "Em execução",
  resolvida: "Resolvida",
};

export default async function DemandasPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string; status?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadAuthenticatedMembership(params.escopo);
  const selectedStatus = params.status?.trim() ?? "";
  const scopeQuery = `?escopo=${ctx.activeScope}`;

  let demands: Demand[] = [];
  if (ctx.tenant) {
    const supabase = await createClient();
    let query = supabase
      .from("demands")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("data_scope", ctx.activeScope)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (
      selectedStatus === "recebida" ||
      selectedStatus === "em_execucao" ||
      selectedStatus === "resolvida"
    ) {
      query = query.eq("status", selectedStatus);
    }

    const { data } = await query;
    demands = (data as Demand[] | null) ?? [];
  }

  const dateFmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <PanelShell
      tenant={ctx.tenant}
      allMemberships={ctx.allMemberships}
      userEmail={ctx.userEmail}
      userProfile={ctx.userProfile}
      activeScope={ctx.activeScope}
      activeTab="demandas"
    >
      {!ctx.tenant ? (
        <OnboardingTenantForm />
      ) : (
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
              Demandas
            </h1>
            <p className="mt-0.5 text-sm text-ink-secondary">
              Solicitações e acompanhamentos por bairro ·{" "}
              {ctx.activeScope === "mandate" ? "Mandato" : "Campanha"}
            </p>
          </header>

          {/* Filtro por status */}
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5">
            {[
              { id: "", label: "Todas" },
              { id: "recebida", label: "Recebidas" },
              { id: "em_execucao", label: "Em execução" },
              { id: "resolvida", label: "Resolvidas" },
            ].map((tab) => {
              const active = selectedStatus === tab.id;
              return (
                <Link
                  key={tab.id || "all"}
                  href={
                    tab.id
                      ? `/painel/demandas${scopeQuery}&status=${tab.id}`
                      : `/painel/demandas${scopeQuery}`
                  }
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-brand-navy text-white"
                      : "border border-border-subtle bg-white text-ink-secondary hover:text-ink-primary"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <div className="grid gap-7 lg:grid-cols-12 lg:items-start">
            {/* Lista de demandas */}
            <section className="lg:col-span-7">
              {demands.length === 0 ? (
                <div className="rounded-2xl border border-border-subtle bg-white p-6">
                  <p className="text-sm font-medium text-ink-primary">
                    Nenhuma demanda registrada neste filtro.
                  </p>
                  <p className="mt-1 text-xs text-ink-secondary">
                    Registre uma solicitação para acompanhar protocolo, bairro e
                    status.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border-subtle/70 rounded-2xl border border-border-subtle bg-white">
                  {demands.map((d) => (
                    <li key={d.id} className="space-y-3 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                            <span className="font-mono">{d.protocol}</span>
                            {d.category ? <span>· {d.category}</span> : null}
                            <span>
                              · {dateFmt.format(new Date(d.updated_at))}
                            </span>
                          </div>
                          <h2 className="mt-1 text-sm font-semibold text-ink-primary">
                            {d.title}
                          </h2>
                          <p className="mt-0.5 text-xs text-ink-secondary">
                            {d.neighborhood
                              ? `${d.neighborhood}, ${d.city}`
                              : d.city}
                            {d.requester_name
                              ? ` · Solicitante: ${d.requester_name}`
                              : ""}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            d.status === "resolvida"
                              ? "bg-brand-emerald-soft text-brand-emerald"
                              : "bg-surface-muted text-ink-secondary"
                          }`}
                        >
                          {STATUS_LABELS[d.status]}
                        </span>
                      </div>

                      {d.office_note ? (
                        <p className="rounded-xl bg-canvas px-3 py-2 text-xs text-ink-secondary">
                          {d.office_note}
                        </p>
                      ) : null}

                      {ctx.canEditContacts ? (
                        <form
                          action={updateDemandStatusAction}
                          className="flex flex-wrap items-center gap-2 pt-1"
                        >
                          <input type="hidden" name="demandId" value={d.id} />
                          <select
                            name="status"
                            defaultValue={d.status}
                            aria-label="Atualizar status da demanda"
                            className="h-9 rounded-lg border border-border-subtle bg-white px-2.5 text-xs text-ink-primary"
                          >
                            <option value="recebida">Recebida</option>
                            <option value="em_execucao">Em execução</option>
                            <option value="resolvida">Resolvida</option>
                          </select>
                          <input
                            name="officeNote"
                            type="text"
                            defaultValue={d.office_note ?? ""}
                            placeholder="Atualizar andamento / ofício"
                            className="h-9 min-w-[160px] flex-1 rounded-lg border border-border-subtle bg-white px-2.5 text-xs text-ink-primary"
                          />
                          <button
                            type="submit"
                            className="h-9 rounded-lg bg-brand-navy px-3 text-xs font-medium text-white hover:bg-brand-navy-hover"
                          >
                            Salvar
                          </button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Nova demanda */}
            {ctx.canEditContacts ? (
              <section className="rounded-2xl border border-border-subtle bg-white p-5 lg:col-span-5">
                <h2 className="text-sm font-semibold text-ink-primary">
                  Nova demanda
                </h2>
                <div className="mt-4">
                  <CreateDemandForm
                    dataScope={ctx.activeScope}
                    defaultCity={ctx.tenant.city ?? ""}
                  />
                </div>
              </section>
            ) : null}
          </div>
        </div>
      )}
    </PanelShell>
  );
}
