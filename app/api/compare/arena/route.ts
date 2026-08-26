import crypto from "crypto";
import { NextResponse } from "next/server";
import { logger, setRequestId, clearRequestId } from "@/lib/logger";
import { buildArenaPayload } from "./payload";

export async function GET(request: Request) {
  const start = Date.now();
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  setRequestId(requestId);

  try {
    const body = JSON.stringify(await buildArenaPayload());
    const etag = `W/"${crypto.createHash("sha1").update(body).digest("hex")}"`;

    if ((request.headers.get("if-none-match") ?? "").split(",").some((e) => e.trim() === etag)) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, "X-Request-ID": requestId } });
    }

    logger.info("Compare arena request completed", { source: "compare", status: 200, durationMs: Date.now() - start });

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, must-revalidate",
        ETag: etag,
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    logger.error("Compare arena request failed", { source: "compare", error });
    return NextResponse.json({ error: "Something went wrong. Please try again later." }, { status: 500, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } finally {
    clearRequestId();
  }
}
