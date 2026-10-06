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
  phone: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  label?: 'Home' | 'Work' | 'Other';
  isDefault: boolean;
}

export interface VendorPolicies {
  shipping: string;
  returns: string;
  processingTime: string;
}

export interface Vendor {
  id: string;
  userId: string;
  storeName: string;
  slug: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  rating: number;
  reviewCount: number;
  followerCount: number;
  isVerified: boolean;
  responseTime: string;
  policies: VendorPolicies;
  location: string;
  categories: string[];
  createdAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  icon?: string;
  parentId?: string | null;
  featured?: boolean;
  productCount?: number;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  description?: string;
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
  name: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity: number;
  attributes: Record<string, string>;
  imageUrl?: string;
}

export interface Product {
  id: string;
  vendorId: string;
  categoryId: string;
  brandId?: string;
  brandName?: string;
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
  specifications: Record<string, string>;
  stock: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isFlashDeal?: boolean;
  flashDealEndsAt?: string;
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

export interface ResolvedCartItem extends CartItem {
  product: Product;
  variant?: ProductVariant;
  vendor: Vendor;
}

export interface VendorCartGroup {
  vendor: Vendor;
  items: ResolvedCartItem[];
  subtotal: number;
  shipping: number;
  estimatedDelivery: string;
}

export interface WishlistItem {
  id: string;
  productId: string;
  addedAt: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'CREDIT_CARD' | 'PAYPAL' | 'APPLE_PAY' | 'CASH_ON_DELIVERY';

export interface TimelineEvent {
  title: string;
  description: string;
  date: string;
  completed: boolean;
  current?: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  productImage: string;
  variantId?: string;
  variantName?: string;
  vendorId: string;
  vendorName: string;
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
  paymentMethod: PaymentMethod;
  shippingAddress: Address;
  billingAddress: Address;
  shippingMethod: string;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  timeline: TimelineEvent[];
  trackingNumber?: string;
  carrier?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  vendorId?: string;
  rating: number;
  title: string;
  comment: string;
  helpfulCount: number;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface RatingBreakdown {
  average: number;
  totalReviews: number;
  counts: Record<number, number>; // 5: count, 4: count, etc.
  percentages: Record<number, number>;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  value: number;
  minPurchaseAmount?: number;
  maxDiscount?: number;
  description: string;
  validUntil: string;
  isActive: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ORDER' | 'PROMO' | 'SYSTEM' | 'SECURITY';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface ProductFilterParams {
  categoryId?: string;
  categorySlug?: string;
  vendorId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  searchQuery?: string;
  sortBy?: 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';
  page?: number;
  limit?: number;
}
