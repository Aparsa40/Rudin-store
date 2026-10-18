import assert from 'node:assert/strict';
import test from 'node:test';
import { ordersService } from './ordersService.js';
import { Address, PaymentMethod, Product, ResolvedCartItem, Vendor } from '../../types';

const address: Address = {
  id: 'addr_test',
  userId: 'user_test',
  fullName: 'Test Customer',
  phone: '+1 555 000 0000',
  street1: '1 Test Street',
  city: 'Testville',
  state: 'TS',
  postalCode: '00000',
  country: 'United States',
  isDefault: true,
};

const product: Product = {
  id: 'prod_test',
  vendorId: 'vendor_test',
  categoryId: 'cat_test',
  slug: 'test-product',
  title: 'Test Product',
  description: 'A test product.',
  shortDescription: 'A test product.',
  price: 100,
  images: [],
  variants: [],
  rating: 5,
  reviewCount: 1,
  status: 'PUBLISHED',
  tags: [],
  features: [],
  specifications: {},
  stock: 10,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const vendor: Vendor = {
  id: 'vendor_test',
  userId: 'user_vendor',
  storeName: 'Test Store',
  slug: 'test-store',
  description: 'A test vendor.',
  logoUrl: '',
  bannerUrl: '',
  rating: 5,
  reviewCount: 1,
  followerCount: 1,
  isVerified: true,
  responseTime: '< 1 hour',
  policies: {
    shipping: 'Test shipping policy.',
    returns: 'Test returns policy.',
    processingTime: '1 day',
  },
  location: 'Test City',
  categories: [],
  createdAt: '2026-01-01T00:00:00Z',
};

const item: ResolvedCartItem = {
  id: 'cart_item_test',
  productId: product.id,
  quantity: 2,
  addedAt: '2026-01-02T00:00:00Z',
  product,
  vendor,
};

const createOrder = (paymentMethod: PaymentMethod) =>
  ordersService.createOrder({
    userId: 'user_test',
    items: [item],
    shippingAddress: address,
    billingAddress: address,
    shippingMethod: 'Standard Courier (3-5 Days)',
    paymentMethod,
    subtotal: 200,
    discount: 0,
    shippingCost: 0,
    tax: 16,
    total: 216,
  });

test('creates orders as PENDING with unpaid payment status', async () => {
  for (const method of ['CREDIT_CARD', 'PAYPAL', 'APPLE_PAY', 'CASH_ON_DELIVERY'] as const) {
    const order = await createOrder(method);
    assert.equal(order.status, 'PENDING', `${method} order must start PENDING`);
    assert.equal(order.paymentStatus, 'PENDING', `${method} order must start unpaid`);
  }
});

test('never fabricates tracking numbers or carriers on creation', async () => {
  const order = await createOrder('CREDIT_CARD');
  assert.equal(order.trackingNumber, undefined);
  assert.equal(order.carrier, undefined);
});

test('reuses one order identifier across the order and its items', async () => {
  const order = await createOrder('CREDIT_CARD');
  assert.ok(order.items.length > 0);
  for (const orderItem of order.items) {
    assert.equal(orderItem.orderId, order.id);
  }
});

test('describes payment state honestly in the order timeline', async () => {
  const cod = await createOrder('CASH_ON_DELIVERY');
  assert.match(cod.timeline[0].description, /collected on delivery/);
  assert.ok(!cod.timeline[0].description.includes('verified'));

  const online = await createOrder('CREDIT_CARD');
  assert.match(online.timeline[0].description, /awaiting payment confirmation/);
  assert.ok(!online.timeline[0].description.includes('verified'));
});

test('does not fabricate order history from mock data', async () => {
  // With no stored order, the history must be empty. Previously this returned
  // mock orders belonging to a demo user.
  const orders = await ordersService.getOrders('user_test');
  assert.equal(orders.length, 0);
  assert.equal(
    orders.some((o) => o.userId === 'u1'),
    false,
  );
});

test('stores created orders when localStorage is available', async () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );

  const values = new Map<string, string>();

  const storage = {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, String(value));
    },
  } as Storage;

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });

  try {
    storage.removeItem('rudin_orders');

    const created = await createOrder('CREDIT_CARD');
    const after = await ordersService.getOrders('user_test');

    assert.equal(after.length, 1);
    assert.equal(after[0].id, created.id);
    assert.equal(after[0].userId, 'user_test');

    const stored = storage.getItem('rudin_orders');
    assert.ok(stored);

    const parsed = JSON.parse(stored) as Array<{ id: string }>;
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].id, created.id);
  } finally {
    storage.removeItem('rudin_orders');

    if (originalDescriptor) {
      Object.defineProperty(
        globalThis,
        'localStorage',
        originalDescriptor,
      );
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  }
});
