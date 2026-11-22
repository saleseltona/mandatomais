export default function PainelLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando"
      className="min-h-screen bg-canvas px-4 py-6 sm:px-6 lg:pl-72 lg:py-9"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <div className="h-3.5 w-20 animate-pulse rounded bg-surface-subtle" />
          <div className="h-7 w-48 animate-pulse rounded-lg bg-surface-subtle" />
        </div>
        <div className="grid gap-7 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="h-48 animate-pulse rounded-2xl bg-brand-navy/15" />
            <div className="h-32 animate-pulse rounded-2xl border border-border-subtle bg-white" />
          </div>
          <div className="h-64 animate-pulse rounded-2xl border border-border-subtle bg-white lg:col-span-5" />
        </div>
      </div>
    </div>
  );
}
