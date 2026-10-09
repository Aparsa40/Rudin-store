import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { createRateLimiter } from "./rate-limit.js";

function responseRecorder() {
  const headers = new Map<string, string>();
  let statusCode = 200;
  let body: unknown;
  const response = {
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value); return this; },
    status(value: number) { statusCode = value; return this; },
    json(value: unknown) { body = value; return this; },
  };
  return { response: response as unknown as Response, headers, get statusCode() { return statusCode; }, get body() { return body; } };
}

test("rate limiter allows requests within the configured window and rejects excess requests", () => {
  let now = 1_000;
  const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 }, () => now);
  let nextCalls = 0;
  const request = { ip: "198.51.100.10", socket: { remoteAddress: "198.51.100.10" } } as unknown as Request;
  const next = (() => { nextCalls += 1; }) as NextFunction;

  const first = responseRecorder();
  limiter(request, first.response, next);
  assert.equal(first.statusCode, 200);
  assert.equal(first.headers.get("ratelimit-remaining"), "1");

  const second = responseRecorder();
  limiter(request, second.response, next);
  assert.equal(second.statusCode, 200);
  assert.equal(second.headers.get("ratelimit-remaining"), "0");

  const third = responseRecorder();
  limiter(request, third.response, next);
  assert.equal(third.statusCode, 429);
  assert.equal(third.headers.get("retry-after"), "60");
  assert.equal((third.body as { error: { code: string } }).error.code, "RATE_LIMITED");
  assert.equal(nextCalls, 2);

  now += 60_001;
  const afterReset = responseRecorder();
  limiter(request, afterReset.response, next);
  assert.equal(afterReset.statusCode, 200);
  assert.equal(nextCalls, 3);
});

test("rate limiter rejects invalid configuration", () => {
  assert.throws(() => createRateLimiter({ windowMs: 0, maxRequests: 1 }), /positive integers/);
  assert.throws(() => createRateLimiter({ windowMs: 1000, maxRequests: 0 }), /positive integers/);
});
