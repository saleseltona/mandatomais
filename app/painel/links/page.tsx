import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { togglePublicLinkAction } from "@/app/painel/actions";
import { CopyLinkButton } from "@/components/panel/copy-link-button";
import { CreateInterestForm } from "@/components/panel/create-interest-form";
import { CreateLinkForm } from "@/components/panel/create-link-form";
import { OnboardingTenantForm } from "@/components/panel/onboarding-tenant-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { ShareLinkButton } from "@/components/panel/share-link-button";
import { loadPanelSummary } from "@/lib/supabase/panel-data";

export const metadata: Metadata = {
  title: "Links | Mandato+",
  description:
    "Gerencie links públicos de cadastro e temas de interesse da base.",
};

export default async function LinksETemasPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string }>;
}) {
  const params = await searchParams;
  const ctx = await loadPanelSummary(params.escopo);
  const scopeLabel = ctx.activeScope === "mandate" ? "Mandato" : "Campanha";

  return (
    <PanelShell
      tenant={ctx.tenant}
      userEmail={ctx.userEmail}
      activeScope={ctx.activeScope}
      activeTab="links"
    >
      {!ctx.tenant ? (
        <OnboardingTenantForm />
      ) : (
        <div className="space-y-7">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
              Links e temas
            </h1>
            <p className="mt-0.5 text-sm text-ink-secondary">
              Páginas de cadastro e pautas de interesse · {scopeLabel}
            </p>
          </header>

          <div className="grid gap-7 lg:grid-cols-12 lg:items-start">
            {/* Lista de links existentes */}
            <div className="space-y-6 lg:col-span-7">
              <section className="space-y-2.5">
                <h2 className="px-1 text-sm font-semibold text-ink-primary">
                  Links públicos
                </h2>

                {ctx.links.length === 0 ? (
                  <div className="rounded-2xl border border-border-subtle bg-white p-6">
                    <p className="text-sm font-medium text-ink-primary">
                      Nenhum link criado ainda.
                    </p>
                    <p className="mt-1 text-xs text-ink-secondary">
                      Use o formulário ao lado para gerar seu primeiro endereço
                      de cadastro.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border-subtle/70 rounded-2xl border border-border-subtle bg-white">
                    {ctx.links.map((link) => {
                      const publicPath = `/cadastro/${link.slug}`;
                      return (
                        <li key={link.id} className="space-y-3 p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-semibold text-ink-primary">
                                  {link.title}
                                </p>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    link.is_active
                                      ? "bg-brand-emerald-soft text-brand-emerald"
                                      : "bg-surface-muted text-ink-muted"
                                  }`}
                                >
                                  {link.is_active ? "Ativo" : "Pausado"}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate font-mono text-xs text-ink-muted">
                                {publicPath}
                              </p>
                            </div>

                            {ctx.canManageLinks ? (
                              <form action={togglePublicLinkAction}>
                                <input
                                  type="hidden"
                                  name="linkId"
                                  value={link.id}
                                />
                                <input
                                  type="hidden"
                                  name="nextActive"
                                  value={String(!link.is_active)}
                                />
                                <button
                                  type="submit"
                                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary"
                                >
                                  {link.is_active ? "Pausar" : "Reativar"}
                                </button>
                              </form>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <CopyLinkButton path={publicPath} />
                            <ShareLinkButton
                              path={publicPath}
                              tenantName={ctx.tenant!.name}
                              variant="light"
                              label="Compartilhar"
                            />
                            <Link
                              href={publicPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3.5 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
                            >
                              <span>Abrir</span>
                              <ExternalLink
                                className="h-3.5 w-3.5 text-ink-muted"
                                strokeWidth={1.75}
                                aria-hidden="true"
                              />
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Temas de interesse */}
              <section id="temas" className="scroll-mt-20 space-y-2.5">
                <h2 className="px-1 text-sm font-semibold text-ink-primary">
                  Temas de interesse
                </h2>
                <div className="rounded-2xl border border-border-subtle bg-white p-5">
                  <CreateInterestForm dataScope={ctx.activeScope} />

                  {ctx.interests.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {ctx.interests.map((interest) => (
                        <span
                          key={interest.id}
                          className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-ink-primary"
                        >
                          {interest.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-ink-muted">
                      Os temas adicionados aparecem como opções nos formulários
                      deste escopo.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Novo link público */}
            {ctx.canManageLinks ? (
              <section className="space-y-2.5 lg:col-span-5">
                <h2 className="px-1 text-sm font-semibold text-ink-primary">
                  Criar novo link
                </h2>
                <div className="rounded-2xl border border-border-subtle bg-white p-5">
                  <CreateLinkForm />
                </div>
              </section>
            ) : null}
          </div>
        </div>
      )}
    </PanelShell>
  );
}
