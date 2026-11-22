import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { UnsubscribeForm } from "@/components/public/unsubscribe-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { ConsentStatus, DataScope } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Descadastro | Mandato+",
  description: "Revogue seu consentimento de forma simples e imediata.",
};

interface UnsubscribePreview {
  first_name: string;
  tenant_name: string;
  office_title: string | null;
  data_scope: DataScope;
  consent_status: ConsentStatus;
  revoked_at: string | null;
}

const uuidSchema = z.string().uuid();

export default async function DescadastroPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabaseReady = isSupabaseConfigured();
  const validToken = uuidSchema.safeParse(token).success;

  let preview: UnsubscribePreview | null = null;

  if (supabaseReady && validToken) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_unsubscribe_preview", {
      p_token: token,
    });
    if (data) {
      preview = data as UnsubscribePreview;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-border-subtle bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-brand-navy"
          >
            Mandato<span className="text-brand-emerald">+</span>
          </Link>
          <span className="text-xs text-ink-muted">Descadastro</span>
        </div>
      </header>

      <main
        id="conteudo-principal"
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6"
      >
        {!supabaseReady ? (
          <div className="rounded-2xl border border-border-subtle bg-white p-6">
            <h1 className="text-lg font-semibold text-ink-primary">
              Ambiente não configurado
            </h1>
            <p className="mt-1.5 text-sm text-ink-secondary">
              Configure <code>.env.local</code> para habilitar o descadastro.
            </p>
          </div>
        ) : !validToken || !preview ? (
          <div className="rounded-2xl border border-border-subtle bg-white p-6">
            <h1 className="text-lg font-semibold text-ink-primary">
              Link inválido
            </h1>
            <p className="mt-1.5 text-sm text-ink-secondary">
              Não encontramos nenhum registro associado a este endereço.
            </p>
          </div>
        ) : preview.consent_status === "revoked" ? (
          <div className="rounded-2xl border border-border-subtle bg-white p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-brand-emerald"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <div>
                <h1 className="text-lg font-semibold text-ink-primary">
                  Descadastro já confirmado
                </h1>
                <p className="mt-1.5 text-sm text-ink-secondary">
                  Olá, {preview.first_name}. Você já não recebe comunicações de{" "}
                  <strong className="font-medium text-ink-primary">
                    {preview.tenant_name}
                  </strong>
                  .
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-7">
            <p className="text-xs font-medium text-ink-muted">
              {preview.data_scope === "mandate" ? "Mandato" : "Campanha"}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink-primary">
              Confirmar descadastro
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Olá, {preview.first_name}. Ao confirmar abaixo, você deixará de
              receber mensagens de{" "}
              <strong className="font-medium text-ink-primary">
                {preview.tenant_name}
              </strong>
              .
            </p>

            <div className="mt-6">
              <UnsubscribeForm token={token} tenantName={preview.tenant_name} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
