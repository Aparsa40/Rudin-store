import { model, Schema } from "mongoose";

const productImageSchema = new Schema(
  {
    id: { type: String, required: true },
    url: { type: String, required: true, trim: true },
    altText: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
    displayOrder: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const productVariantSchema = new Schema(
  {
    id: { type: String, required: true },
    productId: { type: String, required: true },
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stockQuantity: { type: Number, min: 0, default: 0 },
    attributes: { type: Map, of: String, default: {} },
    imageUrl: { type: String, trim: true },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    _id: { type: String, required: true },
    vendorId: { type: String, required: true, index: true },
    categoryId: { type: String, required: true, index: true },
    brandId: { type: String },
    brandName: { type: String, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    images: { type: [productImageSchema], default: [] },
    variants: { type: [productVariantSchema], default: [] },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true },
    tags: { type: [String], default: [] },
    features: { type: [String], default: [] },
    specifications: { type: Map, of: String, default: {} },
    stock: { type: Number, min: 0, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isFlashDeal: { type: Boolean, default: false },
    flashDealEndsAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ status: 1, isFeatured: -1, createdAt: -1 });
productSchema.index({ title: "text", description: "text", shortDescription: "text", tags: "text", brandName: "text" });

export const ProductModel = model("Product", productSchema);
