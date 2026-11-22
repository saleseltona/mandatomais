"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

export function ImageUploadField({
  id,
  name,
  label,
  target,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  name: string;
  label: string;
  target: "profile" | "tenant_logo" | "tenant_avatar";
  value: string;
  onChange: (nextUrl: string) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target", target);

      const res = await fetch("/painel/upload", {
        method: "POST",
        body: fd,
      });

      const data = (await res.json()) as { publicUrl?: string; error?: string };
      if (!res.ok || !data.publicUrl) {
        setError(data.error ?? "Falha no envio da imagem.");
      } else {
        onChange(data.publicUrl);
      }
    } catch {
      setError("Erro de rede ao enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-ink-secondary"
      >
        {label}
      </label>

      <div className="flex items-center gap-2">
        <input
          id={id}
          name={name}
          type="url"
          disabled={disabled || uploading}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... ou envie um arquivo"
          className="block h-11 min-w-0 flex-1 rounded-xl border border-border-subtle bg-white px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-navy focus:outline-none disabled:bg-surface-muted"
        />

        {!disabled ? (
          <label className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3.5 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-muted">
            <Upload className="h-3.5 w-3.5 text-ink-secondary" aria-hidden="true" />
            <span>{uploading ? "Enviando..." : "Enviar"}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              onChange={handleFileSelect}
              className="sr-only"
            />
          </label>
        ) : null}
      </div>

      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
