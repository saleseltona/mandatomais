"use client";

import { Share2 } from "lucide-react";

export function ShareLinkButton({
  path,
  tenantName,
  variant = "hero",
  label = "Compartilhar link",
  className = "",
}: {
  path: string;
  tenantName: string;
  variant?: "hero" | "light";
  label?: string;
  className?: string;
}) {
  async function handleShare() {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = `${origin}${path}`;
    const shareText = `Cadastre-se no canal de ${tenantName}: ${fullUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: tenantName,
          text: `Cadastre-se no canal de ${tenantName}`,
          url: fullUrl,
        });
        return;
      } catch {
        // Fallback para WhatsApp oficial
      }
    }

    const waShareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waShareUrl, "_blank", "noopener,noreferrer");
  }

  const styles =
    variant === "hero"
      ? "h-11 rounded-xl bg-white/12 px-4 text-sm font-medium text-white hover:bg-white/18 active:scale-[0.99]"
      : "h-10 rounded-xl border border-border-subtle bg-white px-3.5 text-xs font-medium text-ink-primary hover:bg-surface-muted active:scale-[0.99]";

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={`Compartilhar link de cadastro de ${tenantName}`}
      className={`inline-flex items-center justify-center gap-2 transition-all ${styles} ${className}`}
    >
      <Share2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
