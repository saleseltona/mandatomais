export default function BaseLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando base de apoiadores"
      className="min-h-screen bg-canvas px-4 py-6 sm:px-6 lg:pl-72 lg:py-9"
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="h-7 w-24 animate-pulse rounded-lg bg-surface-subtle" />
            <div className="h-4 w-44 animate-pulse rounded bg-surface-subtle" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-xl bg-surface-subtle" />
        </div>
        <div className="h-11 w-full animate-pulse rounded-xl bg-white border border-border-subtle" />
        <div className="divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-white">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4">
              <div className="h-9 w-9 animate-pulse rounded-full bg-surface-subtle" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 animate-pulse rounded bg-surface-subtle" />
                <div className="h-3 w-28 animate-pulse rounded bg-surface-subtle" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
