import type { Metadata } from "next";
import Link from "next/link";
import { AcceptInviteButton } from "@/components/panel/accept-invite-button";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Convite de equipe | Mandato+",
  description: "Aceite seu convite para acessar o ambiente com sua própria conta.",
};

export default async function AceitarConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let userEmail: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
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
          <span className="text-xs text-ink-muted">Convite de equipe</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-7">
          <h1 className="text-xl font-semibold tracking-tight text-ink-primary">
            Aceitar convite
          </h1>
          <p className="mt-1.5 text-sm text-ink-secondary">
            Cada membro acessa o ambiente com suas próprias credenciais e
            permissões definidas pelo administrador.
          </p>

          <div className="mt-6">
            {userEmail ? (
              <div className="space-y-4">
                <p className="text-xs text-ink-secondary">
                  Conectado como{" "}
                  <strong className="font-medium text-ink-primary">
                    {userEmail}
                  </strong>
                  .
                </p>
                <AcceptInviteButton token={token} />
              </div>
            ) : (
              <Link
                href={`/entrar?proximo=/convite/${token}`}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-brand-emerald px-4 text-sm font-medium text-white hover:bg-brand-emerald-hover"
              >
                Entrar para aceitar convite
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
