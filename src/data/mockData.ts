import { Product, Vendor, Category, Review, Order } from '../types';

export const mockCategories: Category[] = [
  { id: 'c1', slug: 'electronics', name: 'Electronics', description: 'Gadgets and devices' },
  { id: 'c2', slug: 'clothing', name: 'Clothing', description: 'Apparel for men and women' },
  { id: 'c3', slug: 'home-garden', name: 'Home & Garden', description: 'Furniture and decor' },
  { id: 'c4', slug: 'sports', name: 'Sports & Outdoors', description: 'Equipment and gear' },
  { id: 'c5', slug: 'beauty', name: 'Beauty & Health', description: 'Skincare and cosmetics' },
];

export const mockVendors: Vendor[] = [
  {
    id: 'v1',
    userId: 'u2',
    storeName: 'TechHaven',
    slug: 'techhaven',
    description: 'Premium electronics and accessories from top brands.',
    rating: 4.8,
    reviewCount: 1240,
    followerCount: 5200,
    isVerified: true,
    createdAt: '2023-01-15T00:00:00Z',
    logoUrl: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&q=80&w=200&h=200'
  },
  {
    id: 'v2',
    userId: 'u3',
    storeName: 'StyleStudio',
    slug: 'stylestudio',
    description: 'Modern apparel for the conscious consumer.',
    rating: 4.6,
    reviewCount: 850,
    followerCount: 3100,
    isVerified: true,
    createdAt: '2023-03-22T00:00:00Z',
    logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=200&h=200'
  },
  {
    id: 'v3',
    userId: 'u4',
    storeName: 'LuxeLiving',
    slug: 'luxeliving',
    description: 'Elevate your home with our curated decor.',
    rating: 4.9,
    reviewCount: 420,
    followerCount: 1500,
    isVerified: false,
    createdAt: '2023-06-10T00:00:00Z'
  }
];

export const mockProducts: Product[] = [
  {
    id: 'p1',
    vendorId: 'v1',
    categoryId: 'c1',
    slug: 'wireless-noise-cancelling-headphones',
    title: 'Aura Wireless Noise Cancelling Headphones',
    shortDescription: 'Premium over-ear headphones with active noise cancellation and 30-hour battery life.',
    description: 'Experience unparalleled sound quality with the Aura Wireless Headphones. Featuring industry-leading active noise cancellation, custom 40mm drivers, and up to 30 hours of continuous playback. The ergonomic design ensures all-day comfort, while the built-in microphone allows for crystal clear calls.',
    price: 299.99,
    compareAtPrice: 349.99,
    images: [
      { id: 'img1', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000', isPrimary: true, displayOrder: 1 },
      { id: 'img2', url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=1000', isPrimary: false, displayOrder: 2 }
    ],
    variants: [
      { id: 'var1', productId: 'p1', sku: 'AURA-BLK', name: 'Black', price: 299.99, stockQuantity: 45, attributes: { color: 'Black' } },
      { id: 'var2', productId: 'p1', sku: 'AURA-SLV', name: 'Silver', price: 299.99, stockQuantity: 12, attributes: { color: 'Silver' } }
    ],
    rating: 4.8,
    reviewCount: 342,
    status: 'PUBLISHED',
    tags: ['audio', 'headphones', 'wireless', 'noise-cancelling'],
    features: ['Active Noise Cancellation', '30-hour battery life', 'Bluetooth 5.2', 'Multipoint connection'],
    createdAt: '2023-08-15T00:00:00Z',
    updatedAt: '2023-11-20T00:00:00Z'
  },
  {
    id: 'p2',
    vendorId: 'v2',
    categoryId: 'c2',
    slug: 'minimalist-cotton-tshirt',
    title: 'Essential Minimalist Cotton T-Shirt',
    shortDescription: 'Ultra-soft, sustainably sourced organic cotton t-shirt.',
    description: 'The perfect everyday tee. Made from 100% GOTS-certified organic cotton, this t-shirt offers a relaxed fit, exceptional breathability, and durability that lasts wash after wash.',
    price: 28.00,
    images: [
      { id: 'img3', url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=1000', isPrimary: true, displayOrder: 1 },
      { id: 'img4', url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=1000', isPrimary: false, displayOrder: 2 }
    ],
    variants: [
      { id: 'var3', productId: 'p2', sku: 'TS-WHT-M', name: 'White / M', price: 28.00, stockQuantity: 100, attributes: { color: 'White', size: 'M' } },
      { id: 'var4', productId: 'p2', sku: 'TS-WHT-L', name: 'White / L', price: 28.00, stockQuantity: 80, attributes: { color: 'White', size: 'L' } },
      { id: 'var5', productId: 'p2', sku: 'TS-BLK-M', name: 'Black / M', price: 28.00, stockQuantity: 50, attributes: { color: 'Black', size: 'M' } }
    ],
    rating: 4.5,
    reviewCount: 128,
    status: 'PUBLISHED',
    tags: ['apparel', 't-shirt', 'organic', 'minimalist'],
    features: ['100% Organic Cotton', 'Pre-shrunk', 'Relaxed fit', 'Sustainably made'],
    createdAt: '2023-09-01T00:00:00Z',
    updatedAt: '2023-10-15T00:00:00Z'
  },
  {
    id: 'p3',
    vendorId: 'v3',
    categoryId: 'c3',
    slug: 'ceramic-pour-over-coffee-maker',
    title: 'Artisan Ceramic Pour-Over Set',
    shortDescription: 'Handcrafted ceramic coffee dripper and carafe.',
    description: 'Elevate your morning ritual with this beautifully crafted ceramic pour-over set. The ribbed dripper design ensures optimal water flow for a perfect extraction every time. Includes a matching 500ml carafe.',
    price: 65.00,
    compareAtPrice: 85.00,
    images: [
      { id: 'img5', url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=1000', isPrimary: true, displayOrder: 1 }
    ],
    variants: [
      { id: 'var6', productId: 'p3', sku: 'COF-CER-MAT', name: 'Matte Black', price: 65.00, stockQuantity: 15, attributes: { color: 'Matte Black' } }
    ],
    rating: 4.9,
    reviewCount: 56,
    status: 'PUBLISHED',
    tags: ['coffee', 'home', 'kitchen', 'ceramic'],
    features: ['Hand-thrown ceramic', 'Heat retaining', 'Dishwasher safe', 'Includes 100 filters'],
    createdAt: '2023-10-10T00:00:00Z',
    updatedAt: '2023-11-05T00:00:00Z'
  },
  {
    id: 'p4',
    vendorId: 'v1',
    categoryId: 'c1',
    slug: 'ultrawide-curved-monitor',
    title: 'Vision 34" Ultrawide Curved Monitor',
    shortDescription: 'Immersive WQHD display for productivity and gaming.',
    description: 'Transform your workspace with the Vision 34" Ultrawide Monitor. With a 21:9 aspect ratio, 144Hz refresh rate, and 99% sRGB color accuracy, it is perfect for multitasking professionals and avid gamers alike.',
    price: 499.00,
    images: [
      { id: 'img6', url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d4acf?auto=format&fit=crop&q=80&w=1000', isPrimary: true, displayOrder: 1 }
    ],
    variants: [
      { id: 'var7', productId: 'p4', sku: 'MON-34-UW', name: 'Standard', price: 499.00, stockQuantity: 8, attributes: {} }
    ],
    rating: 4.6,
    reviewCount: 89,
    status: 'PUBLISHED',
    tags: ['monitor', 'electronics', 'workspace', 'gaming'],
    features: ['34-inch WQHD (3440 x 1440)', '144Hz Refresh Rate', '1ms Response Time', 'USB-C Hub'],
    createdAt: '2023-11-01T00:00:00Z',
    updatedAt: '2023-11-25T00:00:00Z'
  },
  {
    id: 'p5',
    vendorId: 'v2',
    categoryId: 'c2',
    slug: 'classic-denim-jacket',
    title: 'Vintage Wash Denim Jacket',
    shortDescription: 'Timeless style with a comfortable, broken-in feel.',
    description: 'A wardrobe staple. This classic denim jacket features a vintage wash, relaxed fit, and durable brass hardware. Layer it over a t-shirt or a hoodie for effortless style year-round.',
    price: 89.99,
    images: [
      { id: 'img7', url: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&q=80&w=1000', isPrimary: true, displayOrder: 1 }
    ],
    variants: [
      { id: 'var8', productId: 'p5', sku: 'JAC-DEN-S', name: 'Small', price: 89.99, stockQuantity: 25, attributes: { size: 'S' } },
      { id: 'var9', productId: 'p5', sku: 'JAC-DEN-M', name: 'Medium', price: 89.99, stockQuantity: 30, attributes: { size: 'M' } },
      { id: 'var10', productId: 'p5', sku: 'JAC-DEN-L', name: 'Large', price: 89.99, stockQuantity: 15, attributes: { size: 'L' } }
    ],
    rating: 4.7,
    reviewCount: 210,
    status: 'PUBLISHED',
    tags: ['apparel', 'jacket', 'denim', 'vintage'],
    features: ['100% Cotton Denim', 'Button closure', '4 pockets', 'Adjustable hem'],
    createdAt: '2023-08-20T00:00:00Z',
    updatedAt: '2023-10-30T00:00:00Z'
  },
  {
    id: 'p6',
    vendorId: 'v3',
    categoryId: 'c3',
    slug: 'mid-century-lounge-chair',
    title: 'Mid-Century Modern Lounge Chair',
    shortDescription: 'Iconic design meets exceptional comfort.',
    description: 'Bring a touch of retro elegance to your living space. This lounge chair features a solid walnut frame and premium top-grain leather upholstery. The ergonomic angle provides perfect support for reading or relaxing.',
    price: 799.00,
    compareAtPrice: 950.00,
    images: [
      { id: 'img8', url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&q=80&w=1000', isPrimary: true, displayOrder: 1 }
    ],
    variants: [
      { id: 'var11', productId: 'p6', sku: 'CHR-LOU-BRN', name: 'Cognac Leather', price: 799.00, stockQuantity: 5, attributes: { color: 'Cognac' } }
    ],
    rating: 4.9,
    reviewCount: 42,
    status: 'PUBLISHED',
    tags: ['furniture', 'chair', 'home', 'mid-century'],
    features: ['Solid walnut frame', 'Top-grain leather', 'High-density foam', 'No assembly required'],
    createdAt: '2023-07-15T00:00:00Z',
    updatedAt: '2023-11-10T00:00:00Z'
  }
];

export const mockReviews: Review[] = [
  {
    id: 'r1',
    productId: 'p1',
    userId: 'u1',
    rating: 5,
    title: 'Best headphones I have ever owned',
    comment: 'The noise cancellation is magical. I work in a busy office and these block out everything. Sound quality is crisp and balanced.',
    helpfulCount: 24,
    createdAt: '2023-09-10T14:30:00Z'
  },
  {
    id: 'r2',
    productId: 'p1',
    userId: 'u5',
    rating: 4,
    title: 'Great sound, slightly heavy',
    comment: 'Love the audio profile and battery life. They do get a little heavy after wearing them for 5+ hours straight, but overall fantastic.',
    helpfulCount: 8,
    createdAt: '2023-10-05T09:15:00Z'
  },
  {
    id: 'r3',
    productId: 'p2',
    userId: 'u6',
    rating: 5,
    title: 'Perfect fit',
    comment: 'Finally a t-shirt that fits right out of the box and doesn\'t shrink weirdly in the wash. Very soft material.',
    helpfulCount: 12,
    createdAt: '2023-10-20T11:45:00Z'
  }
];
