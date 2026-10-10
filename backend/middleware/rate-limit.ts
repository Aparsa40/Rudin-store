import type { Request, Response, NextFunction } from "express";

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimitOptions, now: () => number = Date.now) {
  if (!Number.isInteger(options.windowMs) || options.windowMs < 1 ||
      !Number.isInteger(options.maxRequests) || options.maxRequests < 1) {
    throw new Error("Rate limiter windowMs and maxRequests must be positive integers.");
  }

  const buckets = new Map<string, Bucket>();
  let operations = 0;

  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const currentTime = now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= currentTime) {
      bucket = { count: 0, resetAt: currentTime + options.windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    operations += 1;

    // Opportunistically clear expired entries to keep the in-memory map bounded over time.
    if (operations % 256 === 0) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= currentTime) buckets.delete(bucketKey);
      }
    }

    res.setHeader("RateLimit-Limit", String(options.maxRequests));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, options.maxRequests - bucket.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: options.message ?? "Too many requests. Please try again later.",
        },
      });
      return;
    }

    next();
  };
}
