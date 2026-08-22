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

/**
 * Upstream budget for one repository analysis.
 *
 * Deliberately longer than the 15s the user-facing routes allow. Two costs
 * stack on a cold request: GitHub's `stats/contributors` payload is measured
 * in megabytes for a large repository (~12.5 MB and ~9s for facebook/react)
 * and answers 202 while it compiles statistics, and the Gemini recommendation
 * call runs after it on the same budget. At 45s the two together overran on
 * the largest repositories, which silently dropped those reports to
 * heuristics-only advice. Only the first request for a repository pays this —
 * the derived report is then cached for an hour.
 */
const BURNOUT_TIMEOUT_MS = 75000;

/**
 * Burnout and sustainability data for the Burnout Radar page.
 *
 * Rides the same quota, refresh-policy and rate-limit infrastructure as
 * `/api/compare` and `/api/dashboard`. No seeded values: every figure the page
 * renders is derived here from GitHub's repository statistics endpoints.
 *
 * `excludeBots` reaches the service rather than the client because filtering
 * bot accounts changes the commit totals every other figure is computed from —
 * contributor count, workload share, bus factor and the risk table all shift.
 * Each variant is cached separately.
 */
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

/**
 * Repository-shaped errors, falling through to the shared handler for
 * everything else. The shared one says "GitHub user not found", which is the
 * wrong noun for a route addressed by `owner/repo`.
 */
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
