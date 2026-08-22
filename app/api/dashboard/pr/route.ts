import crypto from "crypto";
import { NextResponse } from "next/server";
import { fetchPRInsights } from "@/services/github/pr-insights";
import { logger, setRequestId, clearRequestId } from "@/lib/logger";
import { readUserParam, dashboardErrorResponse, DASHBOARD_TIMEOUT_MS } from "../shared";

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_TIMEOUT_MS);

  try {
    const data = await fetchPRInsights(parsed.user, undefined, controller.signal);
    const payload = JSON.stringify({ user: parsed.user, ...data });
    const etag = `W/"${crypto.createHash("sha1").update(payload).digest("hex")}"`;

    if ((request.headers.get("if-none-match") ?? "").split(",").some((e) => e.trim() === etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag, "X-Request-ID": requestId },
      });
    }

    logger.info("Dashboard PR request completed", {
      source: "dashboard-pr",
      user: parsed.user,
      status: 200,
      durationMs: Date.now() - start,
    });

    return new NextResponse(payload, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400",
        ETag: etag,
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    return dashboardErrorResponse(error, requestId, "dashboard-pr");
  } finally {
    clearTimeout(timeoutId);
    clearRequestId();
  }
}
