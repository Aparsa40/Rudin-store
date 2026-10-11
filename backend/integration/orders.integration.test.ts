import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import mongoose from "mongoose";
import { UserModel } from "../models/user.model.js";
import { ProductModel } from "../models/product.model.js";
import { OrderModel } from "../models/order.model.js";

const enabled = process.env.RUN_MONGODB_INTEGRATION === "true" && Boolean(process.env.MONGODB_URI);
const port = 4318;
const baseUrl = `http://127.0.0.1:${port}`;
const tokenSecret = "orders-integration-token-secret-at-least-32-characters";

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

const shippingAddress = {
  fullName: "Order Customer",
  phone: "+1 555 000 1111",
  street1: "1 Order Street",
  city: "Order City",
  state: "OS",
  postalCode: "11111",
  country: "United States",
};

async function registerUser(email: string) {
  const registered = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password: "Order-Password-123!", firstName: "Order" }),
  });
  assert.equal(registered.response.status, 201);
  return registered.body.accessToken as string;
}

test("Server-authoritative order creation, pricing, stock and idempotency", { skip: !enabled }, async (t) => {
  // The Node test runner executes test files in parallel. The security suite uses
  // rudin_store_integration_test, so this suite derives its own dedicated database
  // from the same cluster to avoid the two suites wiping each other's data.
  const baseUri = process.env.MONGODB_URI!;
  const databaseName = baseUri.split("://")[1]?.split("/")[1]?.split("?")[0];
  assert.equal(
    databaseName,
    "rudin_store_integration_test",
    "Integration tests may only run against the dedicated rudin_store_integration_test database.",
  );
  const uri = baseUri.replace(databaseName, `${databaseName}_orders`);
  await mongoose.connect(uri);
  await Promise.all([
    UserModel.deleteMany({}),
    ProductModel.deleteMany({}),
    OrderModel.deleteMany({}),
  ]);

  let serverProcess: ChildProcess | undefined;
  try {
    serverProcess = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "backend/server.ts"], {
      env: {
        ...process.env,
        PORT: String(port),
        MONGODB_URI: uri,
        AUTH_TOKEN_SECRET: tokenSecret,
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

    const customerToken = await registerUser("orders.customer@example.test");
    const otherToken = await registerUser("orders.other@example.test");

    // Products are inserted directly: order tests do not need the vendor approval chain.
    await ProductModel.create([
      { _id: "prd_orders_a", vendorId: "vendor_orders", categoryId: "cat_orders", slug: "order-test-product-a", title: "Order Test A", description: "A", shortDescription: "A", price: 10.5, stock: 5, status: "PUBLISHED" },
      { _id: "prd_orders_b", vendorId: "vendor_orders", categoryId: "cat_orders", slug: "order-test-product-b", title: "Order Test B", description: "B", shortDescription: "B", price: 3, stock: 2, status: "PUBLISHED" },
      { _id: "prd_orders_draft", vendorId: "vendor_orders", categoryId: "cat_orders", slug: "order-test-draft", title: "Order Draft", description: "D", shortDescription: "D", price: 1, stock: 9, status: "DRAFT" },
      { _id: "prd_orders_variant", vendorId: "vendor_orders", categoryId: "cat_orders", slug: "order-test-variant", title: "Order Variant", description: "V", shortDescription: "V", price: 99, stock: 99, status: "PUBLISHED", variants: [{ id: "var_a", productId: "prd_orders_variant", sku: "SKU-A", name: "Small", price: 4.25, stockQuantity: 3 }] },
      // var_high comes FIRST on purpose: with the historical non-elemMatch decrement the
      // bare stock condition matched var_high, so the positional operator decremented the
      // wrong variant when var_low (insufficient) was requested.
      { _id: "prd_orders_variant2", vendorId: "vendor_orders", categoryId: "cat_orders", slug: "order-test-variant-2", title: "Order Variant Two", description: "V2", shortDescription: "V2", price: 99, stock: 99, status: "PUBLISHED", variants: [
        { id: "var_high", productId: "prd_orders_variant2", sku: "SKU-HIGH", name: "High", price: 5, stockQuantity: 10 },
        { id: "var_low", productId: "prd_orders_variant2", sku: "SKU-LOW", name: "Low", price: 2, stockQuantity: 1 },
      ] },
    ]);

    await t.test("rejects unauthenticated access and invalid payloads", async () => {
      const unauthenticated = await request("/api/orders", { method: "POST", body: JSON.stringify({ items: [] }) });
      assert.equal(unauthenticated.response.status, 401);

      const listDenied = await request("/api/orders");
      assert.equal(listDenied.response.status, 401);

      const noItems = await request("/api/orders", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ items: [], shippingAddress, paymentMethod: "CASH_ON_DELIVERY" }),
      });
      assert.equal(noItems.response.status, 400);
      assert.equal(noItems.body.error.code, "INVALID_ORDER");

      const badQuantity = await request("/api/orders", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ items: [{ productId: "prd_orders_a", quantity: 0 }], shippingAddress, paymentMethod: "CASH_ON_DELIVERY" }),
      });
      assert.equal(badQuantity.response.status, 400);

      const badMethod = await request("/api/orders", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ items: [{ productId: "prd_orders_a", quantity: 1 }], shippingAddress, paymentMethod: "CRYPTO" }),
      });
      assert.equal(badMethod.response.status, 400);

      const badAddress = await request("/api/orders", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ items: [{ productId: "prd_orders_a", quantity: 1 }], shippingAddress: { fullName: "" }, paymentMethod: "CASH_ON_DELIVERY" }),
      });
      assert.equal(badAddress.response.status, 400);
    });

    await t.test("computes totals from database prices and ignores client totals", async () => {
      const created = await request("/api/orders", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          items: [
            { productId: "prd_orders_a", quantity: 2 },
            { productId: "prd_orders_variant", variantId: "var_a", quantity: 1 },
          ],
          shippingAddress,
          paymentMethod: "CREDIT_CARD",
          // Client-supplied monetary fields must be ignored entirely.
          subtotal: 0.01, shippingCost: 0.01, tax: 0.01, total: 0.01,
        }),
      });
      assert.equal(created.response.status, 201);
      const order = created.body.order;
      assert.equal(order.status, "PENDING");
      assert.equal(order.paymentStatus, "PENDING", "no payment gateway exists, so orders can never be created PAID");
      assert.equal(order.subtotal, 25.25); // 2 * 10.50 + 1 * 4.25
      assert.equal(order.shippingCost, 0);
      assert.equal(order.tax, 0);
      assert.equal(order.total, 25.25);
      assert.equal(order.items.length, 2);
      assert.ok(
        order.items.every((item: { orderId?: string }) => item.orderId === undefined),
        "serialized order items must not leak an orderId field",
      );

      const stock = await ProductModel.find({ _id: { $in: ["prd_orders_a", "prd_orders_variant"] } }).select("_id stock variants");
      const a = stock.find((p) => p._id === "prd_orders_a")!;
      const v = stock.find((p) => p._id === "prd_orders_variant")!;
      assert.equal(a.stock, 3, "product stock must be decremented by the ordered quantity");
      assert.equal(v.variants![0].stockQuantity, 2, "variant stock must be decremented by the ordered quantity");
    });

    await t.test("rejects draft products and out-of-stock orders without consuming stock", async () => {
      const draft = await request("/api/orders", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ items: [{ productId: "prd_orders_draft", quantity: 1 }], shippingAddress, paymentMethod: "CASH_ON_DELIVERY" }),
      });
      assert.equal(draft.response.status, 400);
      assert.equal(draft.body.error.code, "PRODUCT_NOT_FOUND");

      const variantRequired = await request("/api/orders", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ items: [{ productId: "prd_orders_variant", quantity: 1 }], shippingAddress, paymentMethod: "CASH_ON_DELIVERY" }),
      });
      assert.equal(variantRequired.response.status, 400);
      assert.equal(variantRequired.body.error.code, "VARIANT_REQUIRED");

      // prd_orders_a has stock 3, prd_orders_b has stock 2: the second decrement must
      // fail and the transaction must roll the first decrement back.
      const outOfStock = await request("/api/orders", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ items: [{ productId: "prd_orders_a", quantity: 2 }, { productId: "prd_orders_b", quantity: 5 }], shippingAddress, paymentMethod: "CASH_ON_DELIVERY" }),
      });
      assert.equal(outOfStock.response.status, 409);
      assert.equal(outOfStock.body.error.code, "OUT_OF_STOCK");

      const after = await ProductModel.find({ _id: { $in: ["prd_orders_a", "prd_orders_b"] } }).select("_id stock");
      assert.equal(after.find((p) => p._id === "prd_orders_a")!.stock, 3, "failed orders must not consume stock");
      assert.equal(after.find((p) => p._id === "prd_orders_b")!.stock, 2);
    });

    await t.test("rejects variant orders when only another variant has enough stock", async () => {
      const ordersBefore = await OrderModel.countDocuments({});

      // var_low has 1 unit, var_high has 10. A non-elemMatch decrement would satisfy
      // the bare stock condition through var_high and decrement the wrong variant;
      // $elemMatch must reject the whole order instead.
      const mismatch = await request("/api/orders", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ items: [{ productId: "prd_orders_variant2", variantId: "var_low", quantity: 2 }], shippingAddress, paymentMethod: "CASH_ON_DELIVERY" }),
      });
      assert.equal(mismatch.response.status, 409);
      assert.equal(mismatch.body.error.code, "OUT_OF_STOCK");

      const afterMismatch = (await ProductModel.findById("prd_orders_variant2").select("variants"))!;
      assert.equal(afterMismatch.variants!.find((v) => v.id === "var_low")!.stockQuantity, 1, "the insufficient variant must not be decremented");
      assert.equal(afterMismatch.variants!.find((v) => v.id === "var_high")!.stockQuantity, 10, "another variant with sufficient stock must never absorb the decrement");
      assert.equal(await OrderModel.countDocuments({}), ordersBefore, "a rejected variant order must not be persisted");

      // The same product must remain orderable through the variant that does have stock.
      const sufficient = await request("/api/orders", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ items: [{ productId: "prd_orders_variant2", variantId: "var_high", quantity: 2 }], shippingAddress, paymentMethod: "CASH_ON_DELIVERY" }),
      });
      assert.equal(sufficient.response.status, 201);
      const afterSufficient = (await ProductModel.findById("prd_orders_variant2").select("variants"))!;
      assert.equal(afterSufficient.variants!.find((v) => v.id === "var_low")!.stockQuantity, 1, "the other variant must be untouched");
      assert.equal(afterSufficient.variants!.find((v) => v.id === "var_high")!.stockQuantity, 8, "the ordered variant must be decremented exactly");
    });

    await t.test("replays idempotent requests without re-decrementing stock", async () => {
      const first = await request("/api/orders", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}`, "idempotency-key": "order-key-12345678" },
        body: JSON.stringify({ items: [{ productId: "prd_orders_b", quantity: 1 }], shippingAddress, paymentMethod: "CASH_ON_DELIVERY" }),
      });
      assert.equal(first.response.status, 201);
      const stockBefore = (await ProductModel.findById("prd_orders_b").select("stock"))!.stock;

      const replay = await request("/api/orders", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}`, "idempotency-key": "order-key-12345678" },
        body: JSON.stringify({ items: [{ productId: "prd_orders_b", quantity: 1 }], shippingAddress, paymentMethod: "CASH_ON_DELIVERY" }),
      });
      assert.equal(replay.response.status, 200);
      assert.equal(replay.body.idempotentReplay, true);
      assert.equal(replay.body.order.id, first.body.order.id);

      const stockAfter = (await ProductModel.findById("prd_orders_b").select("stock"))!.stock;
      assert.equal(stockAfter, stockBefore, "replayed requests must not decrement stock twice");

      const badKey = await request("/api/orders", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}`, "idempotency-key": "short" },
        body: JSON.stringify({ items: [{ productId: "prd_orders_b", quantity: 1 }], shippingAddress, paymentMethod: "CASH_ON_DELIVERY" }),
      });
      assert.equal(badKey.response.status, 400);
      assert.equal(badKey.body.error.code, "INVALID_IDEMPOTENCY_KEY");
    });

    await t.test("concurrent same-key requests produce one order and one decrement", async () => {
      const key = "order-key-concurrent-4711";
      const options: RequestInit = {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}`, "idempotency-key": key },
        body: JSON.stringify({ items: [{ productId: "prd_orders_a", quantity: 1 }], shippingAddress, paymentMethod: "CASH_ON_DELIVERY" }),
      };
      const [first, second] = await Promise.all([
        request("/api/orders", options),
        request("/api/orders", options),
      ]);

      const statuses = [first.response.status, second.response.status].sort();
      assert.deepEqual(statuses, [200, 201], "exactly one request must create the order and the other must replay it");
      const created = first.response.status === 201 ? first : second;
      const replayed = first.response.status === 201 ? second : first;
      assert.equal(replayed.body.idempotentReplay, true);
      assert.equal(replayed.body.order.id, created.body.order.id, "the replay must return the committed order");
      assert.equal((await ProductModel.findById("prd_orders_a").select("stock"))!.stock, 2, "stock must be decremented exactly once despite the race");
      assert.equal(await OrderModel.countDocuments({ idempotencyKey: key }), 1, "exactly one order must exist for the shared idempotency key");
    });

    await t.test("rolls back stock and persists nothing when order insertion fails", async () => {
      const ordersBefore = await OrderModel.countDocuments({});

      // Sabotage the orders collection so the INSERT fails after the stock decrements:
      // the validator rejects every insert. The transaction must roll the decrement
      // back, so stock is unchanged and no order is left behind.
      await mongoose.connection.db!.command({
        collMod: "orders",
        validationLevel: "strict",
        validationAction: "error",
        validator: { $jsonSchema: { bsonType: "object", required: ["__forced_insert_failure__"] } },
      });
      try {
        const failed = await request("/api/orders", {
          method: "POST",
          headers: { authorization: `Bearer ${customerToken}` },
          body: JSON.stringify({ items: [{ productId: "prd_orders_b", quantity: 1 }], shippingAddress, paymentMethod: "CASH_ON_DELIVERY" }),
        });
        assert.equal(failed.response.status, 500);
        assert.equal(failed.body.error.code, "INTERNAL_SERVER_ERROR");
        assert.equal((await ProductModel.findById("prd_orders_b").select("stock"))!.stock, 1, "stock decremented before the failed insert must be rolled back");
        assert.equal(await OrderModel.countDocuments({}), ordersBefore, "no order may be left behind after a failed insert");
      } finally {
        await mongoose.connection.db!.command({ collMod: "orders", validator: {} });
      }
    });

    await t.test("isolates order history between users", async () => {
      const list = await request("/api/orders", { headers: { authorization: `Bearer ${customerToken}` } });
      assert.equal(list.response.status, 200);
      const orders = list.body.orders as Array<{ id: string; userId: string }>;
      assert.ok(orders.length >= 2);
      assert.ok(
        orders.every((order) => typeof order.id === "string" && order.id.length > 0),
        "every listed order must expose its id",
      );
      assert.equal(new Set(orders.map((order) => order.id)).size, orders.length, "listed order ids must be unique");
      for (const order of orders) {
        const fetched = await request(`/api/orders/${encodeURIComponent(order.id)}`, { headers: { authorization: `Bearer ${otherToken}` } });
        assert.equal(fetched.response.status, 404, "other users' orders must not be readable");
      }
      const own = await request(`/api/orders/${encodeURIComponent(orders[0].id)}`, { headers: { authorization: `Bearer ${customerToken}` } });
      assert.equal(own.response.status, 200);

      const otherList = await request("/api/orders", { headers: { authorization: `Bearer ${otherToken}` } });
      assert.equal((otherList.body.orders as unknown[]).length, 0);
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
      ProductModel.deleteMany({}),
      OrderModel.deleteMany({}),
    ]);
    await mongoose.disconnect();
  }
});
