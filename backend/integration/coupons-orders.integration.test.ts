import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import mongoose from "mongoose";
import { CouponModel } from "../models/coupon.model.js";
import { OrderModel } from "../models/order.model.js";
import { ProductModel } from "../models/product.model.js";
import { UserModel } from "../models/user.model.js";

const enabled = process.env.RUN_MONGODB_INTEGRATION === "true" && Boolean(process.env.MONGODB_URI);
const port = 4320;
const baseUrl = `http://127.0.0.1:${port}`;
const tokenSecret = "coupons-integration-token-secret-at-least-32-characters";
const bootstrapSecret = "coupons-integration-bootstrap-secret-at-least-32-characters";

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function inDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Verifies the reconciled coupon and administrative-order capabilities end to end
 * inside the manager-owned permission model: coupon management and admin order
 * visibility are gated by the canonical named permissions (coupons:manage and
 * orders:manage), invalid/inactive/expired/exhausted coupons cannot be used,
 * redemption consumes usage limits atomically and only against the caller's own
 * database order, and customers stay isolated from each other's orders.
 */
test("MongoDB-backed coupons and admin orders inside the manager-owned permission model", { skip: !enabled }, async (t) => {
  const baseUri = process.env.MONGODB_URI!;
  const databaseName = baseUri.split("://")[1]?.split("/")[1]?.split("?")[0];
  assert.equal(
    databaseName,
    "rudin_store_integration_test",
    "The coupons-orders integration suite must start from the dedicated rudin_store_integration_test database.",
  );
  // Parallel suites must not wipe each other's data: this suite owns its own derivation.
  const uri = baseUri.replace("rudin_store_integration_test", "rudin_store_integration_test_coupons");
  await mongoose.connect(uri);
  await Promise.all([
    UserModel.deleteMany({}),
    CouponModel.deleteMany({}),
    OrderModel.deleteMany({}),
    ProductModel.deleteMany({}),
    mongoose.connection.collection("adminstates").deleteMany({}),
  ]);

  let serverProcess: ChildProcess | undefined;
  try {
    serverProcess = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "backend/server.ts"], {
      env: {
        ...process.env,
        PORT: String(port),
        MONGODB_URI: uri,
        AUTH_TOKEN_SECRET: tokenSecret,
        MANAGER_BOOTSTRAP_SECRET: bootstrapSecret,
        WEB_URL: "http://localhost:3000",
        NODE_ENV: "test",
      },
      stdio: "ignore",
    });

    let healthy = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (serverProcess.exitCode !== null) throw new Error(`Test API exited early with code ${serverProcess.exitCode}`);
      try {
        const health = await fetch(`${baseUrl}/api/health`);
        if (health.ok) { healthy = true; break; }
      } catch {
        // The child process may still be connecting to MongoDB.
      }
      await delay(500);
    }
    assert.equal(healthy, true, "test API should become healthy");

    // NOTE on rate-limit budgets (per IP): bootstrap allows 5 requests per 15 minutes,
    // public registration 8 per hour, the admin portal login 10 per 15 minutes,
    // /api/orders and /api/coupons 30 per 15 minutes, and /api/admin/orders 60 per 15
    // minutes. This suite performs 1 bootstrap, 2 registrations, 3 admin-portal
    // logins, 3 order requests, 25 coupon requests, and 11 admin-order requests,
    // staying within every budget across all subtests.
    const bootstrap = await request("/api/auth/bootstrap-manager", {
      method: "POST",
      headers: { "x-manager-bootstrap-secret": bootstrapSecret },
      body: JSON.stringify({
        email: "manager.coupons@example.test",
        password: "Coupons-Manager-Password-123!",
        firstName: "Coupons Manager",
      }),
    });
    assert.equal(bootstrap.response.status, 201);
    const managerToken = bootstrap.body.accessToken as string;

    // Three admins demonstrate the extended vocabulary: one holds coupons:manage only,
    // one holds orders:manage only, and one receives both through the operations preset.
    const appointCouponsAdmin = await request("/api/admin/admins", {
      method: "POST",
      headers: { authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        email: "admin.coupons@example.test",
        password: "Coupons-Admin-Password-123!",
        firstName: "Coupons Admin",
        permission: { allow: ["coupons:manage"] },
      }),
    });
    assert.equal(appointCouponsAdmin.response.status, 201);
    assert.deepEqual(appointCouponsAdmin.body.admin.permissions, ["coupons:manage"]);

    const appointOrdersAdmin = await request("/api/admin/admins", {
      method: "POST",
      headers: { authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        email: "admin.orders@example.test",
        password: "Orders-Admin-Password-123!",
        firstName: "Orders Admin",
        permission: { allow: ["orders:manage"] },
      }),
    });
    assert.equal(appointOrdersAdmin.response.status, 201);
    assert.deepEqual(appointOrdersAdmin.body.admin.permissions, ["orders:manage"]);

    const appointOperationsAdmin = await request("/api/admin/admins", {
      method: "POST",
      headers: { authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        email: "admin.operations@example.test",
        password: "Operations-Admin-Password-123!",
        firstName: "Operations Admin",
        permission: { presets: ["operations"] },
      }),
    });
    assert.equal(appointOperationsAdmin.response.status, 201);
    assert.deepEqual(appointOperationsAdmin.body.admin.permissions, ["coupons:manage", "orders:manage"]);

    const couponsAdminLogin = await request("/api/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin.coupons@example.test", password: "Coupons-Admin-Password-123!" }),
    });
    assert.equal(couponsAdminLogin.response.status, 200);
    const couponsAdminToken = couponsAdminLogin.body.accessToken as string;

    const ordersAdminLogin = await request("/api/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin.orders@example.test", password: "Orders-Admin-Password-123!" }),
    });
    assert.equal(ordersAdminLogin.response.status, 200);
    const ordersAdminToken = ordersAdminLogin.body.accessToken as string;

    const operationsAdminLogin = await request("/api/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin.operations@example.test", password: "Operations-Admin-Password-123!" }),
    });
    assert.equal(operationsAdminLogin.response.status, 200);
    const operationsAdminToken = operationsAdminLogin.body.accessToken as string;

    const customerA = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "customer.a.coupons@example.test",
        password: "Coupons-CustomerA-Password-123!",
        firstName: "Customer A",
      }),
    });
    assert.equal(customerA.response.status, 201);
    const customerAToken = customerA.body.accessToken as string;

    const customerB = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "customer.b.coupons@example.test",
        password: "Coupons-CustomerB-Password-123!",
        firstName: "Customer B",
      }),
    });
    assert.equal(customerB.response.status, 201);
    const customerBToken = customerB.body.accessToken as string;
    const customerBId = customerB.body.user.id as string;

    const product = await request("/api/products", {
      method: "POST",
      headers: { authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        categoryId: "test-category",
        title: "Coupon Test Lamp",
        description: "A published product for the coupon and order reconciliation tests.",
        shortDescription: "Test lamp",
        price: 24.5,
        stock: 10,
        status: "PUBLISHED",
        images: [],
      }),
    });
    assert.equal(product.response.status, 201);
    const productId = product.body.product.id as string;

    const order = await request("/api/orders", {
      method: "POST",
      headers: { authorization: `Bearer ${customerAToken}` },
      body: JSON.stringify({
        items: [{ productId, quantity: 2 }],
        shippingAddress: {
          fullName: "Customer A", phone: "+15550100", street1: "1 Test Street",
          city: "Testville", state: "Test State", postalCode: "12345", country: "Testland",
        },
        paymentMethod: "CASH_ON_DELIVERY",
      }),
    });
    assert.equal(order.response.status, 201);
    assert.equal(order.body.order.subtotal, 49);
    const orderId = order.body.order.id as string;

    await t.test("coupon management requires the coupons:manage permission", async () => {
      const unauthenticated = await request("/api/coupons");
      assert.equal(unauthenticated.response.status, 401);
      const customerListing = await request("/api/coupons", {
        headers: { authorization: `Bearer ${customerAToken}` },
      });
      assert.equal(customerListing.response.status, 403);
      const ordersAdminListing = await request("/api/coupons", {
        headers: { authorization: `Bearer ${ordersAdminToken}` },
      });
      assert.equal(ordersAdminListing.response.status, 403, "an admin holding only orders:manage must not manage coupons");
      const couponsAdminListing = await request("/api/coupons", {
        headers: { authorization: `Bearer ${couponsAdminToken}` },
      });
      assert.equal(couponsAdminListing.response.status, 200);
      assert.deepEqual(couponsAdminListing.body.coupons, []);
      const operationsAdminListing = await request("/api/coupons", {
        headers: { authorization: `Bearer ${operationsAdminToken}` },
      });
      assert.equal(operationsAdminListing.response.status, 200);

      const created = await request("/api/coupons", {
        method: "POST",
        headers: { authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          code: "save5", type: "FIXED", value: 5, minPurchaseAmount: 20,
          description: "Five off", validUntil: inDays(30),
        }),
      });
      assert.equal(created.response.status, 201);
      assert.equal(created.body.coupon.code, "SAVE5", "coupon codes must be normalized to uppercase");
      assert.equal(created.body.coupon.value, 5);

      const duplicate = await request("/api/coupons", {
        method: "POST",
        headers: { authorization: `Bearer ${couponsAdminToken}` },
        body: JSON.stringify({ code: "SAVE5", type: "FIXED", value: 10, validUntil: inDays(30) }),
      });
      assert.equal(duplicate.response.status, 409);
      assert.equal(duplicate.body.error.code, "COUPON_CODE_IN_USE");

      const invalidPercentage = await request("/api/coupons", {
        method: "POST",
        headers: { authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ code: "BADSHP", type: "PERCENTAGE", value: 150, validUntil: inDays(30) }),
      });
      assert.equal(invalidPercentage.response.status, 400);
      assert.equal(await CouponModel.countDocuments({ code: "BADSHP" }), 0, "a rejected coupon must not be persisted");

      const couponId = created.body.coupon.id as string;
      const codeEdit = await request(`/api/coupons/${encodeURIComponent(couponId)}`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${couponsAdminToken}` },
        body: JSON.stringify({ code: "SAVE10" }),
      });
      assert.equal(codeEdit.response.status, 400, "coupon codes must be immutable");

      const update = await request(`/api/coupons/${encodeURIComponent(couponId)}`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${couponsAdminToken}` },
        body: JSON.stringify({ description: "Five off orders above twenty" }),
      });
      assert.equal(update.response.status, 200);
      assert.equal(update.body.coupon.description, "Five off orders above twenty");

      const unauthorizedUpdate = await request(`/api/coupons/${encodeURIComponent(couponId)}`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${ordersAdminToken}` },
        body: JSON.stringify({ description: "Must not apply" }),
      });
      assert.equal(unauthorizedUpdate.response.status, 403);
    });

    await t.test("redemption is owner-scoped and consumes usage limits atomically", async () => {
      const tenPct = await request("/api/coupons", {
        method: "POST",
        headers: { authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          code: "TENPCT", type: "PERCENTAGE", value: 10, maxDiscount: 4,
          usageLimit: 1, validUntil: inDays(30),
        }),
      });
      assert.equal(tenPct.response.status, 201);

      // The maxDiscount cap is applied to the server-side percentage computation.
      const capped = await request("/api/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: "TENPCT", amount: 100 }),
      });
      assert.equal(capped.response.status, 200);
      assert.equal(capped.body.discountAmount, 4);

      const unauthenticatedRedeem = await request("/api/coupons/redeem", {
        method: "POST",
        body: JSON.stringify({ code: "TENPCT", orderId }),
      });
      assert.equal(unauthenticatedRedeem.response.status, 401);

      // Another customer's order is indistinguishable from a missing one, and a
      // rejected redemption must not consume the usage limit.
      const foreignRedeem = await request("/api/coupons/redeem", {
        method: "POST",
        headers: { authorization: `Bearer ${customerBToken}` },
        body: JSON.stringify({ code: "TENPCT", orderId }),
      });
      assert.equal(foreignRedeem.response.status, 404);
      assert.equal(foreignRedeem.body.error.code, "ORDER_NOT_FOUND");
      assert.equal((await CouponModel.findOne({ code: "TENPCT" }).lean())?.usedCount, 0);

      const redeemed = await request("/api/coupons/redeem", {
        method: "POST",
        headers: { authorization: `Bearer ${customerAToken}` },
        body: JSON.stringify({ code: "TENPCT", orderId }),
      });
      assert.equal(redeemed.response.status, 200);
      assert.equal(redeemed.body.orderSubtotal, 49, "the discount base must be the database order subtotal");
      assert.equal(redeemed.body.discountAmount, 4);
      assert.equal(redeemed.body.discountedTotal, 45);
      assert.equal((await CouponModel.findOne({ code: "TENPCT" }).lean())?.usedCount, 1);

      const exhausted = await request("/api/coupons/redeem", {
        method: "POST",
        headers: { authorization: `Bearer ${customerAToken}` },
        body: JSON.stringify({ code: "TENPCT", orderId }),
      });
      assert.equal(exhausted.response.status, 404);
      assert.equal((await CouponModel.findOne({ code: "TENPCT" }).lean())?.usedCount, 1);

      // A redemption against a missing order fails without consuming anything.
      const failedRedeem = await request("/api/coupons/redeem", {
        method: "POST",
        headers: { authorization: `Bearer ${customerAToken}` },
        body: JSON.stringify({ code: "SAVE5", orderId: "ord_does_not_exist_0001" }),
      });
      assert.equal(failedRedeem.response.status, 404);
      assert.equal(failedRedeem.body.error.code, "ORDER_NOT_FOUND");
      assert.equal((await CouponModel.findOne({ code: "SAVE5" }).lean())?.usedCount, 0);

      const saveFive = await request("/api/coupons/redeem", {
        method: "POST",
        headers: { authorization: `Bearer ${customerAToken}` },
        body: JSON.stringify({ code: "SAVE5", orderId }),
      });
      assert.equal(saveFive.response.status, 200);
      assert.equal(saveFive.body.discountAmount, 5);
      assert.equal(saveFive.body.discountedTotal, 44);
    });

    await t.test("inactive, expired, and below-minimum coupons are rejected", async () => {
      const belowMinimum = await request("/api/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: "SAVE5", amount: 10 }),
      });
      assert.equal(belowMinimum.response.status, 404);

      const tenPctCoupon = await CouponModel.findOne({ code: "TENPCT" });
      assert.ok(tenPctCoupon, "the TENPCT coupon must exist");
      const tenPctCouponId = String(tenPctCoupon._id);

      const deactivated = await request(`/api/coupons/${encodeURIComponent(tenPctCouponId)}`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ isActive: false }),
      });
      assert.equal(deactivated.response.status, 200);
      const inactiveValidate = await request("/api/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: "TENPCT", amount: 100 }),
      });
      assert.equal(inactiveValidate.response.status, 404);

      const reactivated = await request(`/api/coupons/${encodeURIComponent(tenPctCouponId)}`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ isActive: true }),
      });
      assert.equal(reactivated.response.status, 200);
      const expiredUpdate = await request(`/api/coupons/${encodeURIComponent(tenPctCouponId)}`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ validUntil: inDays(-1) }),
      });
      assert.equal(expiredUpdate.response.status, 200);
      const expiredValidate = await request("/api/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: "TENPCT", amount: 100 }),
      });
      assert.equal(expiredValidate.response.status, 404);
    });

    await t.test("administrative order visibility requires the orders:manage permission", async () => {
      const unauthenticated = await request("/api/admin/orders");
      assert.equal(unauthenticated.response.status, 401);
      const customerListing = await request("/api/admin/orders", {
        headers: { authorization: `Bearer ${customerAToken}` },
      });
      assert.equal(customerListing.response.status, 403);
      const couponsAdminListing = await request("/api/admin/orders", {
        headers: { authorization: `Bearer ${couponsAdminToken}` },
      });
      assert.equal(couponsAdminListing.response.status, 403, "an admin holding only coupons:manage must not see orders");

      const ordersAdminListing = await request("/api/admin/orders", {
        headers: { authorization: `Bearer ${ordersAdminToken}` },
      });
      assert.equal(ordersAdminListing.response.status, 200);
      assert.equal(ordersAdminListing.body.pagination.total, 1);
      const [summary] = ordersAdminListing.body.orders as Array<Record<string, unknown>>;
      assert.equal(summary.id, orderId);
      assert.equal("shippingAddress" in summary, false, "listings must omit the customer's shipping address");
      assert.equal("idempotencyKey" in summary, false, "listings must omit idempotency keys");

      const operationsAdminListing = await request("/api/admin/orders", {
        headers: { authorization: `Bearer ${operationsAdminToken}` },
      });
      assert.equal(operationsAdminListing.response.status, 200);

      const detail = await request(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        headers: { authorization: `Bearer ${ordersAdminToken}` },
      });
      assert.equal(detail.response.status, 200);
      assert.equal(detail.body.order.id, orderId);
      assert.ok(detail.body.order.shippingAddress, "the detail endpoint exposes the address for order operations");

      const invalidStatus = await request("/api/admin/orders?status=BOGUS", {
        headers: { authorization: `Bearer ${ordersAdminToken}` },
      });
      assert.equal(invalidStatus.response.status, 400);
      assert.equal(invalidStatus.body.error.code, "INVALID_QUERY");
      const invalidPage = await request("/api/admin/orders?page=0", {
        headers: { authorization: `Bearer ${ordersAdminToken}` },
      });
      assert.equal(invalidPage.response.status, 400);

      const deliveredFilter = await request("/api/admin/orders?status=DELIVERED", {
        headers: { authorization: `Bearer ${ordersAdminToken}` },
      });
      assert.equal(deliveredFilter.response.status, 200);
      assert.equal(deliveredFilter.body.pagination.total, 0);

      const foreignUserFilter = await request(`/api/admin/orders?userId=${encodeURIComponent(customerBId)}`, {
        headers: { authorization: `Bearer ${ordersAdminToken}` },
      });
      assert.equal(foreignUserFilter.response.status, 200);
      assert.equal(foreignUserFilter.body.pagination.total, 0);

      const managerListing = await request("/api/admin/orders", {
        headers: { authorization: `Bearer ${managerToken}` },
      });
      assert.equal(managerListing.response.status, 200, "the manager passes every permission check");
    });

    await t.test("customers remain isolated from each other's orders", async () => {
      const foreignDetail = await request(`/api/orders/${encodeURIComponent(orderId)}`, {
        headers: { authorization: `Bearer ${customerBToken}` },
      });
      assert.equal(foreignDetail.response.status, 404);

      const ownHistory = await request("/api/orders", {
        headers: { authorization: `Bearer ${customerBToken}` },
      });
      assert.equal(ownHistory.response.status, 200);
      const listedIds = (ownHistory.body.orders as Array<{ id: string }>).map((entry) => entry.id);
      assert.equal(listedIds.includes(orderId), false);
    });
  } finally {
    if (serverProcess && serverProcess.exitCode === null) {
      serverProcess.kill("SIGTERM");
      await Promise.race([
        new Promise<void>((resolve) => serverProcess!.once("exit", () => resolve())),
        delay(5_000),
      ]);
    }
    await Promise.all([
      UserModel.deleteMany({}),
      CouponModel.deleteMany({}),
      OrderModel.deleteMany({}),
      ProductModel.deleteMany({}),
      mongoose.connection.collection("adminstates").deleteMany({}),
    ]);
    await mongoose.disconnect();
  }
});
