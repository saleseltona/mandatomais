"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CadastroPublicoError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xs ring-1 ring-slate-200/80 sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-primary">
          Página temporariamente indisponível
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Não conseguimos carregar este formulário de cadastro no momento.
        </p>
        <div className="mt-6">
          <Button variant="primary" size="md" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Recarregar página
          </Button>
        </div>
      </div>
    </div>
  );
}
