import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import mongoose from "mongoose";
import { UserModel } from "../models/user.model.js";
import { ProductModel } from "../models/product.model.js";
import { createAccessToken } from "../middleware/auth.js";

const enabled = process.env.RUN_MONGODB_INTEGRATION === "true" && Boolean(process.env.MONGODB_URI);
const port = 4317;
const baseUrl = `http://127.0.0.1:${port}`;
const tokenSecret = "integration-test-token-secret-at-least-32-characters";
const bootstrapSecret = "integration-test-bootstrap-secret-at-least-32-characters";

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

test("MongoDB-backed auth, role boundaries, bootstrap and product lifecycle", { skip: !enabled }, async (t) => {
  const uri = process.env.MONGODB_URI!;
  const databaseName = uri.match(/^mongodb(?:\\+srv)?:\\/\\/[^/]+\\/([^?]+)/i)?.[1];
  assert.equal(
    databaseName,
    "rudin_store_integration_test",
    "Integration tests may only run against the dedicated rudin_store_integration_test database.",
  );
  await mongoose.connect(uri);
  await Promise.all([
    UserModel.deleteMany({}),
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
        ADMIN_BOOTSTRAP_SECRET: bootstrapSecret,
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

    await t.test("rejects unauthenticated and customer access to admin/product mutations", async () => {
      const unauthenticated = await request("/api/admin/admins");
      assert.equal(unauthenticated.response.status, 401);

      const registered = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "customer.integration@example.test",
          password: "Customer-Password-123!",
          firstName: "Integration",
        }),
      });
      assert.equal(registered.response.status, 201);
      assert.equal(registered.body.user.role, "CUSTOMER");
      const customerToken = registered.body.accessToken as string;
      process.env.AUTH_TOKEN_SECRET = tokenSecret;
      const expiredToken = createAccessToken({
        id: registered.body.user.id,
        email: registered.body.user.email,
        role: "CUSTOMER",
      }, -1);
      const expiredAccess = await request("/api/auth/me", {
        headers: { authorization: `Bearer ${expiredToken}` },
      });
      assert.equal(expiredAccess.response.status, 401);

      await UserModel.updateOne(
        { email: "customer.integration@example.test" },
        { $set: { status: "DISABLED" } },
      );
      const disabledAccess = await request("/api/auth/me", {
        headers: { authorization: `Bearer ${customerToken}` },
      });
      assert.equal(disabledAccess.response.status, 401);
      await UserModel.updateOne(
        { email: "customer.integration@example.test" },
        { $set: { status: "ACTIVE", authVersion: 1 } },
      );
      const revokedAccess = await request("/api/auth/me", {
        headers: { authorization: `Bearer ${customerToken}` },
      });
      assert.equal(revokedAccess.response.status, 401);
      await UserModel.updateOne(
        { email: "customer.integration@example.test" },
        { $set: { authVersion: 0 } },
      );

      const adminDenied = await request("/api/admin/admins", {
        headers: { authorization: `Bearer ${customerToken}` },
      });
      assert.equal(adminDenied.response.status, 403);

      const productDenied = await request("/api/products", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          categoryId: "test-category",
          title: "Forbidden product",
          description: "Should not be created.",
          shortDescription: "Forbidden",
          price: 10,
          stock: 1,
        }),
      });
      assert.equal(productDenied.response.status, 403);
    });

    await t.test("bootstraps only one administrator and protects product lifecycle", async () => {
      const firstAdmin = await request("/api/auth/bootstrap-admin", {
        method: "POST",
        headers: { "x-admin-bootstrap-secret": bootstrapSecret },
        body: JSON.stringify({
          email: "admin.integration@example.test",
          password: "Admin-Password-123!",
          firstName: "Integration Admin",
        }),
      });
      assert.equal(firstAdmin.response.status, 201);
      const adminToken = firstAdmin.body.accessToken as string;

      const secondBootstrap = await request("/api/auth/bootstrap-admin", {
        method: "POST",
        headers: { "x-admin-bootstrap-secret": bootstrapSecret },
        body: JSON.stringify({
          email: "second-admin.integration@example.test",
          password: "Admin-Password-456!",
          firstName: "Second Admin",
        }),
      });
      assert.equal(secondBootstrap.response.status, 409);

      const customerLogin = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "customer.integration@example.test", password: "Customer-Password-123!" }),
      });
      assert.equal(customerLogin.response.status, 200);
      const customerToken = customerLogin.body.accessToken as string;

      const application = await request("/api/vendors/apply", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ storeName: "Integration Store", storeDescription: "Test vendor application." }),
      });
      assert.equal(application.response.status, 201);
      assert.equal(application.body.application.status, "PENDING");

      const applications = await request("/api/admin/vendors/applications", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      assert.equal(applications.response.status, 200);
      const applicationId = application.body.application.id as string;
      const approved = await request(`/api/admin/vendors/applications/${encodeURIComponent(applicationId)}`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ decision: "APPROVED" }),
      });
      assert.equal(approved.response.status, 200);
      assert.equal(approved.body.application.role, "VENDOR");

      const vendorLogin = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "customer.integration@example.test", password: "Customer-Password-123!" }),
      });
      assert.equal(vendorLogin.response.status, 200);
      const vendorToken = vendorLogin.body.accessToken as string;
      const vendorProduct = await request("/api/products", {
        method: "POST",
        headers: { authorization: `Bearer ${vendorToken}` },
        body: JSON.stringify({
          categoryId: "test-category",
          title: "Vendor Draft Lamp",
          description: "Draft created by approved vendor.",
          shortDescription: "Vendor draft",
          price: 19.99,
          stock: 2,
          status: "PUBLISHED",
          images: [],
        }),
      });
      assert.equal(vendorProduct.response.status, 201);
      assert.equal(vendorProduct.body.product.status, "DRAFT");
      assert.equal(vendorProduct.body.product.vendorId, applicationId);

      const secondCustomer = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "second-vendor.integration@example.test",
          password: "Second-Customer-Password-123!",
          firstName: "Second Vendor",
        }),
      });
      assert.equal(secondCustomer.response.status, 201);
      const secondCustomerToken = secondCustomer.body.accessToken as string;
      const secondApplication = await request("/api/vendors/apply", {
        method: "POST",
        headers: { authorization: `Bearer ${secondCustomerToken}` },
        body: JSON.stringify({ storeName: "Second Integration Store" }),
      });
      assert.equal(secondApplication.response.status, 201);
      const secondApplicationId = secondApplication.body.application.id as string;
      const secondApproval = await request(`/api/admin/vendors/applications/${encodeURIComponent(secondApplicationId)}`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ decision: "APPROVED" }),
      });
      assert.equal(secondApproval.response.status, 200);
      const secondVendorLogin = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "second-vendor.integration@example.test", password: "Second-Customer-Password-123!" }),
      });
      const secondVendorToken = secondVendorLogin.body.accessToken as string;
      const crossVendorEdit = await request(`/api/products/${encodeURIComponent(vendorProduct.body.product.id as string)}`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${secondVendorToken}` },
        body: JSON.stringify({ price: 1 }),
      });
      assert.equal(crossVendorEdit.response.status, 403);

      const created = await request("/api/products", {
        method: "POST",
        headers: { authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          categoryId: "test-category",
          title: "Integration Test Lamp",
          description: "Product created by integration test.",
          shortDescription: "Integration lamp",
          price: 29.99,
          stock: 3,
          status: "PUBLISHED",
          images: [{ id: "test-image", url: "https://cdn.example.test/test.jpg" }],
        }),
      });
      assert.equal(created.response.status, 201);
      const productId = created.body.product.id as string;
      assert.equal(created.body.product.status, "PUBLISHED");

      const updated = await request(`/api/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ price: 24.99 }),
      });
      assert.equal(updated.response.status, 200);
      assert.equal(updated.body.product.price, 24.99);

      const archived = await request(`/api/products/${encodeURIComponent(productId)}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      assert.equal(archived.response.status, 200);
      assert.equal(archived.body.status, "ARCHIVED");

      const publicLookup = await request(`/api/products/${encodeURIComponent(productId)}`);
      assert.equal(publicLookup.response.status, 404);
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
      mongoose.connection.collection("adminstates").deleteMany({}),
    ]);
    await mongoose.disconnect();
  }
});
