export type ProductInput = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function normalizeProductSlug(value: unknown, title: string): string {
  const source = typeof value === "string" && value.trim() ? value.trim() : title;
  return source
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** Returns a client-safe validation message, or null when the payload is valid. */
export function validateProductInput(body: ProductInput): string | null {
  for (const key of ["categoryId", "title", "description", "shortDescription"] as const) {
    if (typeof body[key] !== "string" || !body[key].trim()) {
      return `${key} must be a non-empty string.`;
    }
  }

  const title = body.title as string;
  const description = body.description as string;
  const shortDescription = body.shortDescription as string;
  const categoryId = body.categoryId as string;
  if (title.trim().length > 200) return "title must be 200 characters or fewer.";
  if (description.trim().length > 20000) return "description must be 20000 characters or fewer.";
  if (shortDescription.trim().length > 500) return "shortDescription must be 500 characters or fewer.";
  if (categoryId.trim().length > 120) return "categoryId must be 120 characters or fewer.";

  if (typeof body.price !== "number" || !Number.isFinite(body.price) || body.price < 0) {
    return "price must be a finite, non-negative number.";
  }
  if (body.stock !== undefined && (!Number.isInteger(body.stock) || (body.stock as number) < 0)) {
    return "stock must be a non-negative integer.";
  }
  if (body.compareAtPrice !== undefined &&
      (typeof body.compareAtPrice !== "number" || !Number.isFinite(body.compareAtPrice) || body.compareAtPrice < 0)) {
    return "compareAtPrice must be a finite, non-negative number.";
  }
  if (body.slug !== undefined && (typeof body.slug !== "string" || body.slug.length > 200)) {
    return "slug must be a string of 200 characters or fewer.";
  }
  for (const key of ["brandId", "brandName"] as const) {
    if (body[key] !== undefined && (typeof body[key] !== "string" || body[key].length > 120)) {
      return `${key} must be a string of 120 characters or fewer.`;
    }
  }

  if (body.images !== undefined) {
    if (!Array.isArray(body.images) || body.images.length > 20) {
      return "images must be an array containing at most 20 image objects.";
    }
    for (const [index, image] of body.images.entries()) {
      if (!isPlainObject(image) ||
          typeof image.id !== "string" || !image.id.trim() ||
          typeof image.url !== "string" || !/^https?:\/\//i.test(image.url.trim())) {
        return `images[${index}] must include a non-empty id and an absolute HTTP(S) url.`;
      }
      if (image.altText !== undefined && (typeof image.altText !== "string" || image.altText.length > 300)) {
        return `images[${index}].altText must be a string of 300 characters or fewer.`;
      }
      if (image.isPrimary !== undefined && typeof image.isPrimary !== "boolean") {
        return `images[${index}].isPrimary must be a boolean.`;
      }
      if (image.displayOrder !== undefined &&
          (!Number.isInteger(image.displayOrder) || (image.displayOrder as number) < 0)) {
        return `images[${index}].displayOrder must be a non-negative integer.`;
      }
    }
  }

  for (const key of ["tags", "features"] as const) {
    if (body[key] !== undefined) {
      const maxItems = key === "tags" ? 30 : 50;
      const maxLength = key === "tags" ? 80 : 300;
      if (!Array.isArray(body[key]) || body[key].length > maxItems ||
          body[key].some((item) => typeof item !== "string" || !item.trim() || item.length > maxLength)) {
        return `${key} must contain at most ${maxItems} non-empty strings (maximum ${maxLength} characters each).`;
      }
    }
  }

  if (body.specifications !== undefined) {
    if (!isPlainObject(body.specifications) ||
        Object.entries(body.specifications).length > 100 ||
        Object.entries(body.specifications).some(([key, value]) =>
          !key.trim() || key.length > 100 || typeof value !== "string" || value.length > 500)) {
      return "specifications must be an object with at most 100 string values.";
    }
  }

  return null;
}
