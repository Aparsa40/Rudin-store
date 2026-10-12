import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import mongoose from "mongoose";
import { UserModel } from "../models/user.model.js";

const enabled = process.env.RUN_MONGODB_INTEGRATION === "true" && Boolean(process.env.MONGODB_URI);
const port = 4319;
const baseUrl = `http://127.0.0.1:${port}`;
const tokenSecret = "portals-integration-token-secret-at-least-32-characters";
const bootstrapSecret = "portals-integration-bootstrap-secret-at-least-32-characters";

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

test("MongoDB-backed role-specific portals and manager-owned admin permissions", { skip: !enabled }, async (t) => {
  const baseUri = process.env.MONGODB_URI!;
  const databaseName = baseUri.split("://")[1]?.split("/")[1]?.split("?")[0];
  assert.equal(databaseName, "rudin_store_integration_test",
    "The login-portals suite must start from the dedicated integration-test database.");
  const uri = baseUri.replace("rudin_store_integration_test", "rudin_store_integration_test_portals");
  await mongoose.connect(uri);
  await Promise.all([
    UserModel.deleteMany({}),
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

    const bootstrap = await request("/api/auth/bootstrap-manager", {
      method: "POST",
      headers: { "x-manager-bootstrap-secret": bootstrapSecret },
      body: JSON.stringify({
        email: "manager.portals@example.test",
        password: "Portal-Manager-Password-123!",
        firstName: "Portal Manager",
      }),
    });
    assert.equal(bootstrap.response.status, 201);
    assert.equal(bootstrap.body.user.role, "MANAGER");
    const managerToken = bootstrap.body.accessToken as string;

    const appointed = await request("/api/admin/admins", {
      method: "POST",
      headers: { authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        email: "admin.portals@example.test",
        password: "Portal-Admin-Password-123!",
        firstName: "Portal Admin",
        permissions: ["SELLER_MANAGEMENT"],
      }),
    });
    assert.equal(appointed.response.status, 201);
    assert.deepEqual(appointed.body.admin.permissions, ["SELLER_MANAGEMENT"]);
    const adminToken = (await request("/api/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin.portals@example.test", password: "Portal-Admin-Password-123!" }),
    })).body.accessToken as string;

    const customer = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "customer.portals@example.test",
        password: "Portal-Customer-Password-123!",
        firstName: "Portal Customer",
        role: "MANAGER",
      }),
    });
    assert.equal(customer.response.status, 201);
    assert.equal(customer.body.user.role, "CUSTOMER");

    await t.test("each role-specific portal rejects credentials for another role", async () => {
      const cases = [
        ["/api/auth/customer/login", "customer.portals@example.test", "Portal-Customer-Password-123!", 200],
        ["/api/auth/admin/login", "customer.portals@example.test", "Portal-Customer-Password-123!", 401],
        ["/api/auth/manager/login", "customer.portals@example.test", "Portal-Customer-Password-123!", 401],
        ["/api/auth/admin/login", "admin.portals@example.test", "Portal-Admin-Password-123!", 200],
        ["/api/auth/manager/login", "admin.portals@example.test", "Portal-Admin-Password-123!", 401],
        ["/api/auth/manager/login", "manager.portals@example.test", "Portal-Manager-Password-123!", 200],
        ["/api/auth/admin/login", "manager.portals@example.test", "Portal-Manager-Password-123!", 401],
      ] as const;
      for (const [path, email, password, expected] of cases) {
        const result = await request(path, { method: "POST", body: JSON.stringify({ email, password }) });
        assert.equal(result.response.status, expected, `${path} for ${email}`);
      }
    });

    await t.test("manager owns governance while admins are limited to granted permissions", async () => {
      const adminList = await request("/api/admin/admins", {
        headers: { authorization: `Bearer ${managerToken}` },
      });
      assert.equal(adminList.response.status, 200);
      assert.deepEqual(adminList.body.admins[0].permissions, ["SELLER_MANAGEMENT"]);

      const adminCannotGovern = await request("/api/admin/admins", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      assert.equal(adminCannotGovern.response.status, 403);

      const adminCanReviewVendors = await request("/api/admin/vendors/applications", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      assert.equal(adminCanReviewVendors.response.status, 200);

      const adminCannotManageProducts = await request("/api/products", {
        method: "POST",
        headers: { authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          categoryId: "test-category",
          title: "Forbidden admin product",
          description: "Admin lacks PRODUCT_MANAGEMENT.",
          shortDescription: "Forbidden",
          price: 10,
          stock: 1,
        }),
      });
      assert.equal(adminCannotManageProducts.response.status, 403);

      const managerCanManageProducts = await request("/api/products", {
        method: "POST",
        headers: { authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          categoryId: "test-category",
          title: "Manager-owned lamp",
          description: "Created by the platform manager.",
          shortDescription: "Manager lamp",
          price: 14.99,
          stock: 4,
          status: "PUBLISHED",
          images: [],
        }),
      });
      assert.equal(managerCanManageProducts.response.status, 201);
      assert.equal(managerCanManageProducts.body.product.status, "PUBLISHED");

      const secondBootstrap = await request("/api/auth/bootstrap-manager", {
        method: "POST",
        headers: { "x-manager-bootstrap-secret": bootstrapSecret },
        body: JSON.stringify({
          email: "second-manager.portals@example.test",
          password: "Portal-Manager-Password-123!",
          firstName: "Second Manager",
        }),
      });
      assert.equal(secondBootstrap.response.status, 409);
      assert.equal(secondBootstrap.body.error.code, "BOOTSTRAP_CLOSED");
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
      mongoose.connection.collection("adminstates").deleteMany({}),
    ]);
    await mongoose.disconnect();
  }
});
