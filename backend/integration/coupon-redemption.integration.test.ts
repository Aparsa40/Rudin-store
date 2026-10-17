import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import mongoose from 'mongoose';
import { CouponModel } from '../models/coupon.model.js';
import { OrderModel } from '../models/order.model.js';
import { ProductModel } from '../models/product.model.js';
import { UserModel } from '../models/user.model.js';

const enabled = process.env.RUN_MONGODB_INTEGRATION === 'true' && Boolean(process.env.MONGODB_URI);
const port = 4321;
const baseUrl = `http://127.0.0.1:${port}`;
const tokenSecret = 'redemption-integration-token-secret-at-least-32-characters';
const bootstrapSecret = 'redemption-integration-bootstrap-secret-at-least-32-chars';

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function inDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Verifies the transactional coupon-redemption contract under concurrency: one
 * coupon per order with idempotent replays of the recorded claim, single
 * consumption of a usage limit of one across concurrent attempts on different
 * orders, exact discount math (percentage rounding, FIXED capped at the order
 * subtotal, FREE_SHIPPING recorded as a zero monetary benefit while no shipping
 * cost is modeled), and not-yet-valid rejection without consumption.
 */
test(
  'MongoDB-backed transactional coupon redemption under concurrency',
  { skip: !enabled },
  async (t) => {
    const baseUri = process.env.MONGODB_URI!;
    const databaseName = baseUri.split('://')[1]?.split('/')[1]?.split('?')[0];
    assert.equal(
      databaseName,
      'rudin_store_integration_test',
      'The redemption integration suite must start from the dedicated rudin_store_integration_test database.',
    );
    // Parallel suites must not wipe each other's data: this suite owns its own derivation.
    const uri = baseUri.replace(
      'rudin_store_integration_test',
      'rudin_store_integration_test_redemption',
    );
    await mongoose.connect(uri);
    await Promise.all([
      UserModel.deleteMany({}),
      CouponModel.deleteMany({}),
      OrderModel.deleteMany({}),
      ProductModel.deleteMany({}),
      mongoose.connection.collection('adminstates').deleteMany({}),
    ]);

    let serverProcess: ChildProcess | undefined;
    try {
      serverProcess = spawn(
        process.execPath,
        ['node_modules/tsx/dist/cli.mjs', 'backend/server.ts'],
        {
          env: {
            ...process.env,
            PORT: String(port),
            MONGODB_URI: uri,
            AUTH_TOKEN_SECRET: tokenSecret,
            MANAGER_BOOTSTRAP_SECRET: bootstrapSecret,
            WEB_URL: 'http://localhost:3000',
            NODE_ENV: 'test',
          },
          stdio: 'ignore',
        },
      );

      let healthy = false;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        if (serverProcess.exitCode !== null)
          throw new Error(`Test API exited early with code ${serverProcess.exitCode}`);
        try {
          const health = await fetch(`${baseUrl}/api/health`);
          if (health.ok) {
            healthy = true;
            break;
          }
        } catch {
          // The child process may still be connecting to MongoDB.
        }
        await delay(500);
      }
      assert.equal(healthy, true, 'test API should become healthy');

      // NOTE on rate-limit budgets (per IP): bootstrap allows 5 requests per 15 minutes,
      // public registration 8 per hour, and /api/orders and /api/coupons 30 requests per
      // 15 minutes each. This suite performs 1 bootstrap, 1 registration, 7 order
      // requests, and 19 coupon requests, staying within every budget across all subtests.
      const bootstrap = await request('/api/auth/bootstrap-manager', {
        method: 'POST',
        headers: { 'x-manager-bootstrap-secret': bootstrapSecret },
        body: JSON.stringify({
          email: 'manager.redemption@example.test',
          password: 'Redemption-Manager-Password-123!',
          firstName: 'Redemption Manager',
        }),
      });
      assert.equal(bootstrap.response.status, 201);
      const managerToken = bootstrap.body.accessToken as string;

      const customer = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'customer.redemption@example.test',
          password: 'Redemption-Customer-Password-123!',
          firstName: 'Redemption Customer',
        }),
      });
      assert.equal(customer.response.status, 201);
      const customerToken = customer.body.accessToken as string;

      const product = await request('/api/products', {
        method: 'POST',
        headers: { authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          categoryId: 'test-category',
          title: 'Redemption Test Lamp',
          description: 'A published product for the redemption concurrency tests.',
          shortDescription: 'Test lamp',
          price: 24.5,
          stock: 50,
          status: 'PUBLISHED',
          images: [],
        }),
      });
      assert.equal(product.response.status, 201);
      const productId = product.body.product.id as string;

      async function createOrder(): Promise<string> {
        const created = await request('/api/orders', {
          method: 'POST',
          headers: { authorization: `Bearer ${customerToken}` },
          body: JSON.stringify({
            items: [{ productId, quantity: 2 }],
            shippingAddress: {
              fullName: 'Redemption Customer',
              phone: '+15550100',
              street1: '1 Test Street',
              city: 'Testville',
              state: 'Test State',
              postalCode: '12345',
              country: 'Testland',
            },
            paymentMethod: 'CASH_ON_DELIVERY',
          }),
        });
        assert.equal(created.response.status, 201);
        assert.equal(created.body.order.subtotal, 49);
        return created.body.order.id as string;
      }

      async function createCoupon(code: string, extra: Record<string, unknown>): Promise<void> {
        const created = await request('/api/coupons', {
          method: 'POST',
          headers: { authorization: `Bearer ${managerToken}` },
          body: JSON.stringify({ code, validUntil: inDays(30), ...extra }),
        });
        assert.equal(created.response.status, 201);
      }

      await createCoupon('CONC10', { type: 'PERCENTAGE', value: 10, usageLimit: 10 });
      await createCoupon('ONE3', { type: 'FIXED', value: 3, usageLimit: 1 });
      await createCoupon('BIGFIX', { type: 'FIXED', value: 100 });
      await createCoupon('SHIP', { type: 'FREE_SHIPPING' });
      await createCoupon('FUTURE', { type: 'PERCENTAGE', value: 10, validFrom: inDays(2) });

      await t.test(
        'concurrent duplicate redemption for one order consumes the coupon once',
        async () => {
          const orderId = await createOrder();
          const attempts = await Promise.all(
            Array.from({ length: 6 }, () =>
              request('/api/coupons/redeem', {
                method: 'POST',
                headers: { authorization: `Bearer ${customerToken}` },
                body: JSON.stringify({ code: 'CONC10', orderId }),
              }),
            ),
          );
          for (const attempt of attempts) {
            assert.equal(
              attempt.response.status,
              200,
              'every duplicate attempt is an idempotent success',
            );
          }
          const fresh = attempts.filter((attempt) => attempt.body.alreadyRedeemed === false);
          assert.equal(fresh.length, 1, 'exactly one attempt consumes the coupon');
          assert.equal(fresh[0].body.discountAmount, 4.9, 'ten percent of the 49 subtotal');
          assert.equal((await CouponModel.findOne({ code: 'CONC10' }).lean())?.usedCount, 1);
          const stored = await OrderModel.findById(orderId).lean();
          assert.equal(stored?.couponRedemption?.code, 'CONC10');
          assert.equal(stored?.couponRedemption?.discount, 4.9);
        },
      );

      await t.test(
        'a usage limit of one admits a single concurrent consumption across orders',
        async () => {
          const orderIds = [await createOrder(), await createOrder(), await createOrder()];
          const attempts = await Promise.all(
            orderIds.map((orderId) =>
              request('/api/coupons/redeem', {
                method: 'POST',
                headers: { authorization: `Bearer ${customerToken}` },
                body: JSON.stringify({ code: 'ONE3', orderId }),
              }),
            ),
          );
          const successes = attempts.filter((attempt) => attempt.response.status === 200);
          const failures = attempts.filter((attempt) => attempt.response.status !== 200);
          assert.equal(successes.length, 1, 'exactly one order wins the last usage');
          assert.equal(successes[0].body.discountAmount, 3);
          assert.equal(successes[0].body.alreadyRedeemed, false);
          assert.equal(failures.length, 2);
          for (const failure of failures) {
            assert.equal(failure.response.status, 404);
            assert.equal(failure.body.error.code, 'COUPON_NOT_FOUND');
          }
          assert.equal((await CouponModel.findOne({ code: 'ONE3' }).lean())?.usedCount, 1);
          assert.equal(await OrderModel.countDocuments({ 'couponRedemption.code': 'ONE3' }), 1);
        },
      );

      await t.test(
        'discount math, shipping semantics, and future validity are enforced',
        async () => {
          // Percentage discounts are rounded to two decimals.
          const rounding = await request('/api/coupons/validate', {
            method: 'POST',
            body: JSON.stringify({ code: 'CONC10', amount: 33.33 }),
          });
          assert.equal(rounding.response.status, 200);
          assert.equal(rounding.body.discountAmount, 3.33);

          // FIXED discounts are capped at the order subtotal.
          const bigOrderId = await createOrder();
          const bigRedeem = await request('/api/coupons/redeem', {
            method: 'POST',
            headers: { authorization: `Bearer ${customerToken}` },
            body: JSON.stringify({ code: 'BIGFIX', orderId: bigOrderId }),
          });
          assert.equal(bigRedeem.response.status, 200);
          assert.equal(bigRedeem.body.discountAmount, 49);
          assert.equal(bigRedeem.body.discountedTotal, 0);

          // FREE_SHIPPING is not a monetary benefit while no shipping cost is modeled;
          // the redemption is still recorded as the audit trail for checkout.
          const shipOrderId = await createOrder();
          const shipRedeem = await request('/api/coupons/redeem', {
            method: 'POST',
            headers: { authorization: `Bearer ${customerToken}` },
            body: JSON.stringify({ code: 'SHIP', orderId: shipOrderId }),
          });
          assert.equal(shipRedeem.response.status, 200);
          assert.equal(shipRedeem.body.discountAmount, 0);
          assert.equal(shipRedeem.body.discountedTotal, 49);
          const shipClaim = await OrderModel.findById(shipOrderId).lean();
          assert.equal(
            shipClaim?.couponRedemption?.code,
            'SHIP',
            'the free-shipping redemption is still recorded',
          );

          // Not-yet-valid coupons are rejected without consumption and without a claim.
          const futureValidate = await request('/api/coupons/validate', {
            method: 'POST',
            body: JSON.stringify({ code: 'FUTURE', amount: 100 }),
          });
          assert.equal(futureValidate.response.status, 404);
          const futureOrderId = await createOrder();
          const futureRedeem = await request('/api/coupons/redeem', {
            method: 'POST',
            headers: { authorization: `Bearer ${customerToken}` },
            body: JSON.stringify({ code: 'FUTURE', orderId: futureOrderId }),
          });
          assert.equal(futureRedeem.response.status, 404);
          assert.equal((await CouponModel.findOne({ code: 'FUTURE' }).lean())?.usedCount, 0);
          const futureOrder = await OrderModel.findById(futureOrderId).lean();
          assert.equal(
            futureOrder?.couponRedemption,
            undefined,
            'a rejected redemption must not leave a claim',
          );
        },
      );
    } finally {
      if (serverProcess && serverProcess.exitCode === null) {
        serverProcess.kill('SIGTERM');
        await Promise.race([
          new Promise<void>((resolve) => serverProcess!.once('exit', () => resolve())),
          delay(5_000),
        ]);
      }
      await Promise.all([
        UserModel.deleteMany({}),
        CouponModel.deleteMany({}),
        OrderModel.deleteMany({}),
        ProductModel.deleteMany({}),
        mongoose.connection.collection('adminstates').deleteMany({}),
      ]);
      await mongoose.disconnect();
    }
  },
);
