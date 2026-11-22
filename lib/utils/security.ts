import { createHmac } from "node:crypto";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const MAX_TRACKED_KEYS = 2_000;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
let warnedMissingSecret = false;

/**
 * Gera pseudoanonimização segura de IP com HMAC-SHA256 para conformidade LGPD.
 * Em produção, configure a variável privada IP_HASH_SECRET no servidor.
 */
export function hashClientIp(
  rawIp: string | null,
  explicitSecret?: string
): string | null {
  if (!rawIp) return null;
  const firstIp = rawIp.split(",")[0]?.trim();
  if (!firstIp) return null;

  const envSecret = process.env.IP_HASH_SECRET;
  if (
    !explicitSecret &&
    !envSecret &&
    process.env.NODE_ENV === "production" &&
    !warnedMissingSecret
  ) {
    warnedMissingSecret = true;
    console.warn(
      "[Mandato+] IP_HASH_SECRET não definido em produção. Configure uma chave secreta forte no ambiente."
    );
  }

  const secret = explicitSecret ?? envSecret ?? "mandato-plus-dev-ip-salt";
  return createHmac("sha256", secret).update(firstIp).digest("hex");
}

/**
 * Remove entradas expiradas para evitar crescimento ilimitado de memória.
 */
export function pruneExpiredRateLimits(now: number = Date.now()): number {
  let removed = 0;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
      removed += 1;
    }
  }
  return removed;
}

/**
 * Limitador leve em memória por chave (ex.: slug + ipHash) com limpeza automática.
 */
export function checkPublicRateLimit(
  key: string,
  now: number = Date.now()
): boolean {
  if (rateLimitStore.size >= MAX_TRACKED_KEYS) {
    pruneExpiredRateLimits(now);
  }

  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  existing.count += 1;
  return true;
}
