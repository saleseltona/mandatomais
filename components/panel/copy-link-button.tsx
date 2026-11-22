"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyLinkButton({
  path,
  className = "",
}: {
  path: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      await navigator.clipboard.writeText(`${origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copiar endereço ${path}`}
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3.5 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted active:scale-[0.99] ${className}`}
    >
      {copied ? (
        <>
          <Check
            className="h-3.5 w-3.5 text-brand-emerald"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>Copiado</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 text-ink-secondary" strokeWidth={1.75} aria-hidden="true" />
          <span>Copiar</span>
        </>
      )}
    </button>
  );
}
