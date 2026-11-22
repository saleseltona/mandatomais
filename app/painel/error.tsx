"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PainelError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-white p-6 text-center">
        <h1 className="text-lg font-semibold text-ink-primary">
          Não foi possível carregar os dados
        </h1>
        <p className="mt-1.5 text-sm text-ink-secondary">
          Houve uma instabilidade temporária. Tente novamente.
        </p>
        <div className="mt-5">
          <Button variant="secondary" size="md" onClick={reset}>
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Tentar novamente
          </Button>
        </div>
      </div>
    </div>
  );
}
