import { createHash } from "node:crypto";
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const uploadsRouter = Router();
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function decodeImageDataUrl(value: unknown): { mimeType: string; bytes: Buffer; extension: string } | null {
  if (typeof value !== "string") return null;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return null;

  const mimeType = `image/${match[1]}`;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null;

  const validSignature =
    (mimeType === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (mimeType === "image/jpeg" && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (mimeType === "image/webp" && bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP");
  if (!validSignature) return null;

  const extension = mimeType === "image/jpeg" ? "jpg" : match[1];
  return { mimeType, bytes, extension };
}

uploadsRouter.post("/images", requireAuth, requireRole("ADMIN", "VENDOR"), async (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    res.status(503).json({ error: { code: "IMAGE_UPLOAD_UNAVAILABLE", message: "Image storage is not configured on this server." } });
    return;
  }

  const image = decodeImageDataUrl(req.body?.dataUrl);
  if (!image) {
    res.status(400).json({ error: { code: "INVALID_IMAGE", message: "Upload a valid PNG, JPEG, or WebP image no larger than 4 MB." } });
    return;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `rudin-store/products/${req.authUser!.id}`;
    const signatureInput = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash("sha1").update(signatureInput).digest("hex");
    const form = new FormData();
    const blobBuffer = new ArrayBuffer(image.bytes.length);
    new Uint8Array(blobBuffer).set(image.bytes);
    form.set("file", new Blob([blobBuffer], { type: image.mimeType }), `product-image.${image.extension}`);
    form.set("api_key", apiKey);
    form.set("timestamp", String(timestamp));
    form.set("folder", folder);
    form.set("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) {
      res.status(502).json({ error: { code: "IMAGE_UPLOAD_FAILED", message: "Image storage could not accept this upload. Please try again." } });
      return;
    }

    const result = await response.json() as { secure_url?: string; public_id?: string };
    if (typeof result.secure_url !== "string" || typeof result.public_id !== "string") {
      res.status(502).json({ error: { code: "IMAGE_UPLOAD_FAILED", message: "Image storage returned an invalid response." } });
      return;
    }
    res.status(201).json({ image: { id: result.public_id, url: result.secure_url, mimeType: image.mimeType } });
  } catch {
    res.status(502).json({ error: { code: "IMAGE_UPLOAD_FAILED", message: "Image storage could not accept this upload. Please try again." } });
  }
});

export default uploadsRouter;
