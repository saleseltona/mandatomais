import type * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { buildTenantThemeStyle } from "@/lib/utils/branding";

export const metadata: Metadata = {
  title: "Transparência | Mandato+",
  description: "Prestação de contas e ações públicas realizadas pelo mandato.",
};

interface PublicFeed {
  slug: string;
  display_name: string;
  office_title: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  primary_color: string | null;
  accent_color: string | null;
  actions: Array<{
    id: string;
    title: string;
    summary: string;
    category: string | null;
    city: string | null;
    neighborhood: string | null;
    action_date: string;
  }>;
}

export default async function PublicTransparencyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let feed: PublicFeed | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_public_transparency_feed", {
      p_slug: slug,
    });
    if (data) feed = data as PublicFeed;
  }

  const themeStyle = buildTenantThemeStyle(
    feed?.primary_color,
    feed?.accent_color
  );

  return (
    <div
      style={themeStyle as React.CSSProperties}
      className="flex min-h-screen flex-col bg-canvas"
    >
      <header className="border-b border-border-subtle bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-brand-navy"
          >
            Mandato<span className="text-brand-emerald">+</span>
          </Link>
          <span className="text-xs text-ink-muted">Transparência</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {!feed ? (
          <div className="rounded-2xl border border-border-subtle bg-white p-6">
            <h1 className="text-lg font-semibold text-ink-primary">
              Página indisponível
            </h1>
            <p className="mt-1.5 text-sm text-ink-secondary">
              Não encontramos publicações de transparência para este endereço.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl bg-brand-navy p-6 text-white sm:p-7">
              <p className="text-xs text-white/70">
                {feed.office_title ?? "Prestação de contas"}
                {feed.city
                  ? ` · ${feed.city}${feed.state ? `/${feed.state}` : ""}`
                  : ""}
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                {feed.display_name}
              </h1>
              {feed.bio ? (
                <p className="mt-2 text-sm text-white/75">{feed.bio}</p>
              ) : null}
            </section>

            {feed.actions.length === 0 ? (
              <div className="rounded-2xl border border-border-subtle bg-white p-6 text-sm text-ink-secondary">
                Nenhuma ação pública registrada até o momento.
              </div>
            ) : (
              <ul className="divide-y divide-border-subtle/70 rounded-2xl border border-border-subtle bg-white">
                {feed.actions.map((act) => (
                  <li key={act.id} className="space-y-1.5 p-5">
                    <p className="text-xs text-ink-muted tabular-nums">
                      {act.action_date.split("-").reverse().join("/")}
                      {act.category ? ` · ${act.category}` : ""}
                      {act.neighborhood
                        ? ` · ${act.neighborhood}${act.city ? `, ${act.city}` : ""}`
                        : act.city
                          ? ` · ${act.city}`
                          : ""}
                    </p>
                    <h2 className="text-base font-semibold text-ink-primary">
                      {act.title}
                    </h2>
                    <p className="text-sm leading-relaxed text-ink-secondary">
                      {act.summary}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
