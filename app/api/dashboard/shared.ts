import "server-only";
import { NextResponse } from "next/server";
import { isAbortError } from "@/lib/github";
import { logger } from "@/lib/logger";
import { GITHUB_USERNAME_REGEX } from "@/lib/validations";

export const DASHBOARD_TIMEOUT_MS = 15000;

export type UserParamResult = { ok: true; user: string } | { ok: false; error: string };

export function readUserParam(searchParams: URLSearchParams): UserParamResult {
  const raw = (searchParams.get("user") ?? "").trim();
  if (!raw) return { ok: false, error: "Missing user parameter" };
  if (raw.length > 39) return { ok: false, error: "GitHub username cannot exceed 39 characters" };
  if (!GITHUB_USERNAME_REGEX.test(raw)) return { ok: false, error: "Invalid GitHub username" };
  return { ok: true, user: raw };
}

function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
    } else {
      parts.push(String(current));
      break;
    }
  }

  return parts.join(" | ");
}

export function dashboardErrorResponse(error: unknown, requestId: string, source: string): NextResponse {
  const raw = describeError(error);
  const lower = raw.toLowerCase();

  const isTimeout = isAbortError(error);
  const isNotFound = lower.includes("not found") || lower.includes("could not resolve");
  const isRateLimit = lower.includes("rate limit");

  const status = isTimeout ? 504 : isRateLimit ? 429 : isNotFound ? 404 : 500;
  const message = isTimeout ? "Upstream request timed out." : isRateLimit ? "API rate limit quota is low. Please try again later." : isNotFound ? "GitHub user not found." : "Something went wrong. Please try again later.";

  if (status === 500) {
    logger.error("Unhandled dashboard error", { source, message: raw });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Request-ID": requestId,
  };
  if (isRateLimit) headers["Retry-After"] = "60";

  return NextResponse.json({ error: message }, { status, headers });
}
