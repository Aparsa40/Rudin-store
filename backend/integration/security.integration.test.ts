import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import mongoose from "mongoose";
import { UserModel } from "../models/user.model.js";
import { ProductModel } from "../models/product.model.js";

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

test("MongoDB-backed manager bootstrap, permission boundaries and product lifecycle", { skip: !enabled }, async (t) => {
  const uri = process.env.MONGODB_URI!;
  const databaseName = uri.split("://")[1]?.split("/")[1]?.split("?")[0];
  assert.equal(databaseName, "rudin_store_integration_test",
    "Integration tests may only run against the dedicated rudin_store_integration_test database.");
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
      } catch { /* The child may still be connecting to MongoDB. */ }
      await delay(500);
    }
    assert.equal(healthy, true, "test API should become healthy");

    await t.test("bootstrap hides itself without the correct secret and validates input", async () => {
      const noSecret = await request("/api/auth/bootstrap-manager", {
        method: "POST",
        body: JSON.stringify({ email: "no-secret@example.test", password: "Admin-Password-123!", firstName: "No Secret" }),
      });
      assert.equal(noSecret.response.status, 404);

      const missingFields = await request("/api/auth/bootstrap-manager", {
        method: "POST",
        headers: { "x-manager-bootstrap-secret": bootstrapSecret },
        body: JSON.stringify({}),
      });
      assert.equal(missingFields.response.status, 400);
      assert.equal(missingFields.body.error.code, "INVALID_MANAGER");
    });

    await t.test("bootstrap creates exactly one manager and rejects duplicates", async () => {
      const duplicateEmailOwner = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "duplicate-email.bootstrap@example.test",
          password: "Duplicate-Email-Password-123!",
          firstName: "Duplicate Email",
        }),
      });
      assert.equal(duplicateEmailOwner.response.status, 201);

      const emailInUse = await request("/api/auth/bootstrap-manager", {
        method: "POST",
        headers: { "x-manager-bootstrap-secret": bootstrapSecret },
        body: JSON.stringify({
          email: "duplicate-email.bootstrap@example.test",
          password: "Manager-Password-123!",
          firstName: "Email In Use",
        }),
      });
      assert.equal(emailInUse.response.status, 409);
      assert.equal(emailInUse.body.error.code, "EMAIL_IN_USE");

      const concurrent = await Promise.all([
        request("/api/auth/bootstrap-manager", {
          method: "POST",
          headers: { "x-manager-bootstrap-secret": bootstrapSecret },
          body: JSON.stringify({
            email: "manager.integration@example.test",
            password: "Manager-Password-123!",
            firstName: "Integration Manager",
          }),
        }),
        request("/api/auth/bootstrap-manager", {
          method: "POST",
          headers: { "x-manager-bootstrap-secret": bootstrapSecret },
          body: JSON.stringify({
            email: "second-manager.integration@example.test",
            password: "Second-Manager-Password-123!",
            firstName: "Second Manager",
          }),
        }),
      ]);
      assert.deepEqual(concurrent.map((r) => r.response.status).sort((a, b) => a - b), [201, 409]);
      const winner = concurrent.find((r) => r.response.status === 201)!;
      const loser = concurrent.find((r) => r.response.status === 409)!;
      assert.equal(winner.body.user.role, "MANAGER");
      assert.equal(loser.body.error.code, "BOOTSTRAP_CLOSED");
    });

    await t.test("public registration cannot assign privileged roles", async () => {
      const registered = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "role-escalation@example.test",
          password: "Customer-Password-123!",
          firstName: "Role Escalation",
          role: "ADMIN",
          permissions: ["PRODUCT_MANAGEMENT", "ORDER_MANAGEMENT"],
        }),
      });
      assert.equal(registered.response.status, 201);
      assert.equal(registered.body.user.role, "CUSTOMER");
      assert.deepEqual(registered.body.user.permissions, []);
    });

    await t.test("manager permission grants are validated and enforced server-side", async () => {
      const managerLogin = await request("/api/auth/manager/login", {
        method: "POST",
        body: JSON.stringify({ email: "manager.integration@example.test", password: "Manager-Password-123!" }),
      });
      assert.equal(managerLogin.response.status, 200);
      const managerToken = managerLogin.body.accessToken as string;

      const invalidAdmin = await request("/api/admin/admins", {
        method: "POST",
        headers: { authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          email: "invalid-permission@example.test",
          password: "Admin-Password-123!",
          firstName: "Invalid Permission",
          permissions: ["NOT_A_PERMISSION"],
        }),
      });
      assert.equal(invalidAdmin.response.status, 400);
      assert.equal(invalidAdmin.body.error.code, "INVALID_PERMISSIONS");

      const appointedAdmin = await request("/api/admin/admins", {
        method: "POST",
        headers: { authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          email: "catalog-admin@example.test",
          password: "Catalog-Admin-Password-123!",
          firstName: "Catalog Admin",
          permissions: ["PRODUCT_MANAGEMENT"],
        }),
      });
      assert.equal(appointedAdmin.response.status, 201);
      assert.deepEqual(appointedAdmin.body.admin.permissions, ["PRODUCT_MANAGEMENT"]);
      const adminLogin = await request("/api/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: "catalog-admin@example.test", password: "Catalog-Admin-Password-123!" }),
      });
      assert.equal(adminLogin.response.status, 200);
      const adminToken = adminLogin.body.accessToken as string;

      const created = await request("/api/products", {
        method: "POST",
        headers: { authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          categoryId: "test-category",
          title: "Integration Test Lamp",
          description: "Product created by an authorized admin.",
          shortDescription: "Integration lamp",
          price: 29.99,
          stock: 3,
          status: "PUBLISHED",
          images: [],
        }),
      });
      assert.equal(created.response.status, 201);
      assert.equal(created.body.product.status, "PUBLISHED");

      const ungranted = await request("/api/admin/orders", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      assert.equal(ungranted.response.status, 403);

      const customer = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "customer-product@example.test",
          password: "Customer-Password-123!",
          firstName: "Customer",
        }),
      });
      assert.equal(customer.response.status, 201);
      const customerToken = customer.body.accessToken as string;
      const customerProduct = await request("/api/products", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          categoryId: "test-category",
          title: "Forbidden Product",
          description: "Customer must not create products.",
          shortDescription: "Forbidden",
          price: 10,
          stock: 1,
        }),
      });
      assert.equal(customerProduct.response.status, 403);
    });
  } finally {
    if (serverProcess && serverProcess.exitCode === null) {
      serverProcess.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 3000);
        serverProcess!.once("exit", () => { clearTimeout(timeout); resolve(); });
      });
    }
    await Promise.all([
      UserModel.deleteMany({}),
      ProductModel.deleteMany({}),
      mongoose.connection.collection("adminstates").deleteMany({}),
    ]);
    await mongoose.disconnect();
  }
});
