import { randomBytes, randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function requestSecurity(req: Request, res: Response, next: NextFunction) {
  const nonce = randomBytes(18).toString("base64");
  res.locals.nonce = nonce;
  res.locals.requestId = randomUUID();
  const started = process.hrtime.bigint();
  res.once("finish", () => {
    if (res.statusCode < 500) return;
    // No raw URL, query, headers, body, receipt, source token or model text.
    console.error(JSON.stringify({
      event: "request_failed", requestId: res.locals.requestId, method: req.method,
      route: typeof req.route?.path === "string" ? req.route.path : "unmatched",
      status: res.statusCode, durationMs: Number(process.hrtime.bigint() - started) / 1000000,
    }));
  });
  res.set({
    "X-Request-ID": res.locals.requestId,
    "Content-Security-Policy": [
      "default-src 'self'", `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'nonce-${nonce}'`, "font-src 'self'",
      "img-src 'self' data:", "connect-src 'self'", "object-src 'none'",
      "base-uri 'none'", "frame-ancestors 'self'", "form-action 'self'",
    ].join("; "),
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), tools=(self)",
    "Cache-Control": "no-store",
  });
  if (req.secure || req.get("x-forwarded-proto")?.split(",")[0] === "https") {
    res.set("Strict-Transport-Security", "max-age=31536000");
  }
  next();
}

export function safeError(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;
  const status = (error as { status?: number })?.status;
  const code = status && status >= 400 && status < 500 ? status : 500;
  res.status(code).json({
    error: code === 413 ? "Request too large." : code === 400 ? "Invalid JSON request." : "The request could not be completed.",
    requestId: res.locals.requestId,
  });
}
