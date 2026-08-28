import crypto from "crypto";
import { NextResponse, after } from "next/server";
import { getUserGitHubToken } from "@/lib/githubtoken";
import { compareParamsSchema, coerceQueryParams } from "@/lib/validations";
import { logger, setRequestId, clearRequestId } from "@/lib/logger";
import { quotaMonitor } from "@/services/github/quota-monitor";
import { refreshPolicy } from "@/services/github/refresh-policy";
import { refreshRateLimiter } from "@/services/github/refresh-rate-limiter";
import { getClientIp } from "@/utils/getClientIp";
import { dashboardErrorResponse } from "../dashboard/shared";
import { recordComparison } from "./counters";
import { fetchCompareUser } from "./fetch-user";
import type { CompareBattlePayload } from "@/types/compare";

const COMPARE_TIMEOUT_MS = 15000;

export async function GET(request: Request) {
  const start = Date.now();
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  setRequestId(requestId);

  const { searchParams } = new URL(request.url);
  const parsed = compareParamsSchema.safeParse(coerceQueryParams(searchParams));

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message = Object.values(flat.fieldErrors).flat()[0] ?? flat.formErrors[0] ?? "Invalid parameters";
    clearRequestId();
    return NextResponse.json({ error: message }, { status: 400, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  }

  const { user1, user2 } = parsed.data;
  const refresh = searchParams.get("refresh") === "true";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COMPARE_TIMEOUT_MS);

  try {
    let bypassCache = refresh;
    if (refresh) {
      if (quotaMonitor.isQuotaLow()) {
        throw new Error("Rate Limit: GitHub API quota is low. Cache refresh temporarily disabled.");
      }
      if (!refreshRateLimiter.checkLimit(getClientIp(request)).success) {
        throw new Error("Rate Limit: Refresh rate limit exceeded. Please try again later.");
      }
      if (refreshPolicy.isRefreshAllowed(user1) && refreshPolicy.isRefreshAllowed(user2)) {
        refreshPolicy.recordRefresh(user1);
        refreshPolicy.recordRefresh(user2);
      } else {
        bypassCache = false;
      }
    }

    const token = await getUserGitHubToken();
    const options = { bypassCache, signal: controller.signal, token };

    const [resultA, resultB] = await Promise.allSettled([fetchCompareUser(user1, options), fetchCompareUser(user2, options)]);

    if (resultA.status === "rejected") return dashboardErrorResponse(unwrap(resultA.reason), requestId, "compare");
    if (resultB.status === "rejected") return dashboardErrorResponse(unwrap(resultB.reason), requestId, "compare");

    const a = resultA.value;
    const b = resultB.value;

    const payload: CompareBattlePayload = { user1: a, user2: b };
    const body = JSON.stringify(payload);
    const etag = `W/"${crypto.createHash("sha1").update(body).digest("hex")}"`;

    if ((request.headers.get("if-none-match") ?? "").split(",").some((e) => e.trim() === etag)) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, "X-Request-ID": requestId } });
    }

    if (request.headers.get("x-sf-record") === "1") {
      after(() =>
        recordComparison({
          userA: a.profile.username,
          userB: b.profile.username,
          reposAnalyzed: a.profile.stats.repositories + b.profile.stats.repositories,
          languages: [...a.languages.map((l) => l.name), ...b.languages.map((l) => l.name)],
        }),
      );
    }

    logger.info("Compare request completed", {
      source: "compare",
      user: `${user1} vs ${user2}`,
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
    return dashboardErrorResponse(error, requestId, "compare");
  } finally {
    clearTimeout(timeoutId);
    clearRequestId();
  }
}

function unwrap(reason: unknown): unknown {
  let err: unknown = reason;
  while (err instanceof Error && err.cause instanceof Error) err = err.cause;
  return err;
}
