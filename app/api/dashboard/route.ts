import crypto from "crypto";
import { NextResponse } from "next/server";
import { getFullDashboardData, fetchUserRepos } from "@/lib/github";
import { logger, setRequestId, clearRequestId } from "@/lib/logger";
import { quotaMonitor } from "@/services/github/quota-monitor";
import { refreshPolicy } from "@/services/github/refresh-policy";
import { refreshRateLimiter } from "@/services/github/refresh-rate-limiter";
import { getClientIp } from "@/utils/getClientIp";
import type { RepoActivityInfo } from "@/types/dashboard";
import { readUserParam, dashboardErrorResponse, DASHBOARD_TIMEOUT_MS } from "./shared";

export async function GET(request: Request) {
  const start = Date.now();
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  setRequestId(requestId);

  const { searchParams } = new URL(request.url);
  const parsed = readUserParam(searchParams);

  if (!parsed.ok) {
    clearRequestId();
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  }

  const username = parsed.user;
  const refresh = searchParams.get("refresh") === "true";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_TIMEOUT_MS);

  try {
    let bypassCache = refresh;
    if (refresh) {
      if (quotaMonitor.isQuotaLow()) {
        throw new Error("Rate Limit: GitHub API quota is low. Cache refresh temporarily disabled.");
      }
      if (!refreshRateLimiter.checkLimit(getClientIp(request)).success) {
        throw new Error("Rate Limit: Refresh rate limit exceeded. Please try again later.");
      }
      if (refreshPolicy.isRefreshAllowed(username)) {
        refreshPolicy.recordRefresh(username);
      } else {
        bypassCache = false;
      }
    }

    const options = { bypassCache, signal: controller.signal };

    const [data, repoActivity] = await Promise.all([
      getFullDashboardData(username, options),
      fetchUserRepos(username, options)
        .then<RepoActivityInfo[]>((repos) =>
          repos
            .filter((r) => !r.fork)
            .map((r) => ({
              name: r.name,
              url: `https://github.com/${r.owner?.login ?? username}/${r.name}`,
              pushedAt: r.pushed_at ?? null,
            })),
        )
        .catch<RepoActivityInfo[]>(() => []),
    ]);

    const payload = JSON.stringify({ user: username, ...data, repoActivity });
    const etag = `W/"${crypto.createHash("sha1").update(payload).digest("hex")}"`;

    if ((request.headers.get("if-none-match") ?? "").split(",").some((e) => e.trim() === etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag, "X-Request-ID": requestId },
      });
    }

    logger.info("Dashboard overview request completed", {
      source: "dashboard",
      user: username,
      status: 200,
      durationMs: Date.now() - start,
    });

    return new NextResponse(payload, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": refresh ? "no-cache, no-store, must-revalidate" : "public, s-maxage=300, stale-while-revalidate=86400",
        ETag: etag,
        "X-Cache-Status": bypassCache ? "BYPASS" : "HIT",
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    return dashboardErrorResponse(error, requestId, "dashboard");
  } finally {
    clearTimeout(timeoutId);
    clearRequestId();
  }
}
