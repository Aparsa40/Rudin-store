export type Role = 'CUSTOMER' | 'VENDOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
}

export interface Address {
  id: string;
  userId: string;
  fullName: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface Vendor {
  id: string;
  userId: string;
  storeName: string;
  slug: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  rating: number;
  reviewCount: number;
  followerCount: number;
  isVerified: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  parentId?: string | null;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string; // e.g., "Red, Large"
  price: number;
  compareAtPrice?: number;
  stockQuantity: number;
  attributes: Record<string, string>; // e.g., { color: "Red", size: "L" }
}

export interface Product {
  id: string;
  vendorId: string;
  categoryId: string;
  brandId?: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  price: number;
  compareAtPrice?: number;
  images: ProductImage[];
  variants: ProductVariant[];
  rating: number;
  reviewCount: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  tags: string[];
  features: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  addedAt: string;
}

// Frontend specific cart structure with resolved product data
export interface ResolvedCartItem extends CartItem {
  product: Product;
  variant?: ProductVariant;
  vendor: Vendor;
}

export interface Cart {
  id: string;
  userId?: string;
  items: CartItem[];
  updatedAt: string;
}

export interface WishlistItem {
  id: string;
  productId: string;
  addedAt: string;
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string;
  vendorId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddress: Address;
  billingAddress: Address;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  vendorId?: string; // If reviewing a vendor
  rating: number;
  title?: string;
  comment: string;
  helpfulCount: number;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchaseAmount?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}
