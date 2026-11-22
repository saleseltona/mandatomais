import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserX } from "lucide-react";
import { revokeContactConsentAction } from "@/app/painel/actions";
import { DeleteContactButton } from "@/components/panel/delete-contact-button";
import { EditContactForm } from "@/components/panel/edit-contact-form";
import { PanelShell } from "@/components/panel/panel-shell";
import { loadContactDetail } from "@/lib/supabase/panel-data";

export const metadata: Metadata = {
  title: "Ficha do apoiador | Mandato+",
  description:
    "Dados cadastrais, histórico de consentimento e gerenciamento de privacidade.",
};

export default async function FichaApoiadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await loadContactDetail(id);

  if (!ctx.tenant || !ctx.contact) {
    notFound();
  }

  const contact = ctx.contact;
  const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <PanelShell
      tenant={ctx.tenant}
      userEmail={ctx.userEmail}
      activeScope={ctx.activeScope}
      activeTab="base"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/painel/base?escopo=${contact.data_scope}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary transition-colors hover:text-ink-primary"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Voltar para a base</span>
          </Link>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              contact.consent_status === "granted"
                ? "bg-brand-emerald-soft text-brand-emerald"
                : "bg-surface-muted text-ink-secondary"
            }`}
          >
            {contact.consent_status === "granted"
              ? "Consentimento ativo"
              : contact.consent_status === "pending"
                ? "Consentimento pendente"
                : "Revogado"}
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          {/* Edição dos dados */}
          <section className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6 lg:col-span-7">
            <h1 className="text-xl font-semibold tracking-tight text-ink-primary">
              {contact.full_name}
            </h1>
            <p className="mt-0.5 text-xs text-ink-muted">
              {contact.data_scope === "mandate" ? "Mandato" : "Campanha"} ·
              Origem: {contact.consent_source}
            </p>

            <div className="mt-5">
              <EditContactForm
                contact={contact}
                scopeInterests={ctx.scopeInterests}
              />
            </div>
          </section>

          {/* Histórico de consentimento e ações */}
          <div className="space-y-5 lg:col-span-5">
            <section className="rounded-2xl border border-border-subtle bg-white p-5">
              <h2 className="text-sm font-semibold text-ink-primary">
                Histórico de consentimento
              </h2>

              {ctx.consentRecords.length === 0 ? (
                <p className="mt-3 text-xs text-ink-secondary">
                  {contact.consented_at
                    ? `Registrado em ${dateTimeFormatter.format(
                        new Date(contact.consented_at)
                      )} · Termo v${contact.consent_version}`
                    : "Registro importado sem consentimento validado ainda."}
                </p>
              ) : (
                <ol className="mt-3 divide-y divide-border-subtle/70">
                  {ctx.consentRecords.map((rec) => (
                    <li key={rec.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span
                          className={`font-medium ${
                            rec.action === "granted"
                              ? "text-brand-emerald"
                              : "text-ink-secondary"
                          }`}
                        >
                          {rec.action === "granted" ? "Autorizado" : "Revogado"}
                        </span>
                        <span className="text-ink-muted tabular-nums">
                          {dateTimeFormatter.format(new Date(rec.recorded_at))}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-muted">
                        {rec.source} · v{rec.consent_version}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-2xl border border-border-subtle bg-white p-5">
              <h2 className="text-sm font-semibold text-ink-primary">
                Privacidade
              </h2>
              <p className="mt-1 text-xs text-ink-secondary">
                Gerencie pedidos de descadastro ou exclusão definitiva.
              </p>

              <div className="mt-4 space-y-2">
                {contact.consent_status === "granted" ? (
                  <form action={revokeContactConsentAction}>
                    <input type="hidden" name="contactId" value={contact.id} />
                    <button
                      type="submit"
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-white px-4 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted"
                    >
                      <UserX
                        className="h-4 w-4 text-ink-secondary"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>Revogar consentimento</span>
                    </button>
                  </form>
                ) : null}

                {ctx.canDeleteContacts ? (
                  <DeleteContactButton
                    contactId={contact.id}
                    contactName={contact.full_name}
                    dataScope={contact.data_scope}
                  />
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
