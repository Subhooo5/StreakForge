import crypto from "crypto";
import { NextResponse } from "next/server";
import { getUserGitHubToken } from "@/lib/githubtoken";
import { burnoutParamsSchema, coerceQueryParams } from "@/lib/validations";
import { logger, setRequestId, clearRequestId } from "@/lib/logger";
import { quotaMonitor } from "@/services/github/quota-monitor";
import { refreshPolicy } from "@/services/github/refresh-policy";
import { refreshRateLimiter } from "@/services/github/refresh-rate-limiter";
import { fetchBurnoutAnalysis } from "@/services/github/burnout-analyzer";
import { getClientIp } from "@/utils/getClientIp";
import { dashboardErrorResponse } from "../dashboard/shared";
import type { BurnoutReport } from "@/types/burnout";

const BURNOUT_TIMEOUT_MS = 75000;

export async function GET(request: Request) {
  const start = Date.now();
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  setRequestId(requestId);

  const { searchParams } = new URL(request.url);
  const parsed = burnoutParamsSchema.safeParse(coerceQueryParams(searchParams));

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message = Object.values(flat.fieldErrors).flat()[0] ?? flat.formErrors[0] ?? "Invalid parameters";
    clearRequestId();
    return NextResponse.json({ error: message }, { status: 400, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  }

  const { owner, repo, excludeBots } = parsed.data;
  const refresh = searchParams.get("refresh") === "true";
  const slug = `${owner}/${repo}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BURNOUT_TIMEOUT_MS);

  try {
    let bypassCache = refresh;
    if (refresh) {
      if (quotaMonitor.isQuotaLow()) {
        throw new Error("Rate Limit: GitHub API quota is low. Cache refresh temporarily disabled.");
      }
      if (!refreshRateLimiter.checkLimit(getClientIp(request)).success) {
        throw new Error("Rate Limit: Refresh rate limit exceeded. Please try again later.");
      }
      if (refreshPolicy.isRefreshAllowed(slug)) {
        refreshPolicy.recordRefresh(slug);
      } else {
        bypassCache = false;
      }
    }

    const token = await getUserGitHubToken();
    const report = await fetchBurnoutAnalysis(owner, repo, {
      bypassCache,
      token,
      excludeBots,
      signal: controller.signal,
    });

    const payload: BurnoutReport = report;
    const body = JSON.stringify(payload);
    const etag = `W/"${crypto.createHash("sha1").update(body).digest("hex")}"`;

    if ((request.headers.get("if-none-match") ?? "").split(",").some((e) => e.trim() === etag)) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, "X-Request-ID": requestId } });
    }

    logger.info("Burnout request completed", {
      source: "burnout",
      repo: slug,
      excludeBots,
      status: 200,
      durationMs: Date.now() - start,
    });

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": refresh ? "no-cache, no-store, must-revalidate" : "public, s-maxage=300, stale-while-revalidate=86400",
        ETag: etag,
        "X-Cache-Status": bypassCache ? "BYPASS" : "HIT",
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    return burnoutErrorResponse(error, requestId);
  } finally {
    clearTimeout(timeoutId);
    clearRequestId();
  }
}

function burnoutErrorResponse(error: unknown, requestId: string): NextResponse {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.toLowerCase().includes("not found")) {
    return NextResponse.json(
      { error: "Repository not found. Check the owner and repository name." },
      { status: 404, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } },
    );
  }
  return dashboardErrorResponse(error, requestId, "burnout");
}
