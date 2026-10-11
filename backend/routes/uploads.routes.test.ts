import assert from "node:assert/strict";
import test from "node:test";
import { decodeImageDataUrl } from "./uploads.routes.js";

test("accepts a supported image with a matching file signature", () => {
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const decoded = decodeImageDataUrl(`data:image/png;base64,${pngHeader.toString("base64")}`);
  assert.equal(decoded?.mimeType, "image/png");
  assert.equal(decoded?.extension, "png");
});

test("rejects unsupported formats and mismatched image signatures", () => {
  assert.equal(decodeImageDataUrl("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(decodeImageDataUrl("data:image/png;base64,aGVsbG8="), null);
  assert.equal(decodeImageDataUrl("not-a-data-url"), null);
});

test("rejects image payloads over the upload limit", () => {
  const oversized = Buffer.alloc(4 * 1024 * 1024 + 1, 1).toString("base64");
  assert.equal(decodeImageDataUrl(`data:image/png;base64,${oversized}`), null);
});
