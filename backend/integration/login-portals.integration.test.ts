import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import mongoose from "mongoose";
import { UserModel } from "../models/user.model.js";
import { createAccessToken } from "../middleware/auth.js";

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

/**
 * Verifies the role-specific login portals end to end:
 * every portal accepts only its own role, pending/rejected vendor applicants
 * cannot enter the vendor portal, public registration can never assign
 * ADMIN or MANAGER, and the MANAGER role stays limited to the documented
 * permission matrix (vendor application review only).
 */
test("MongoDB-backed role-specific login portals and least-privilege manager role", { skip: !enabled }, async (t) => {
  const baseUri = process.env.MONGODB_URI!;
  const databaseName = baseUri.split("://")[1]?.split("/")[1]?.split("?")[0];
  assert.equal(
    databaseName,
    "rudin_store_integration_test",
    "The login-portals integration suite must start from the dedicated rudin_store_integration_test database.",
  );
  // Parallel suites must not wipe each other's data: this suite owns its own derivation.
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

    // NOTE on rate-limit budgets (per IP): each portal login path allows 10 requests
    // per 15 minutes, public registration allows 8 per hour, and bootstrap allows 5
    // per 15 minutes. This suite performs 1 bootstrap, 6 registrations, and stays
    // within every portal budget counted across all subtests.
    const bootstrap = await request("/api/auth/bootstrap-admin", {
      method: "POST",
      headers: { "x-admin-bootstrap-secret": bootstrapSecret },
      body: JSON.stringify({
        email: "admin.portals@example.test",
        password: "Portal-Admin-Password-123!",
        firstName: "Portal Admin",
      }),
    });
    assert.equal(bootstrap.response.status, 201);
    const adminToken = bootstrap.body.accessToken as string;

    const registeredCustomer = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "customer.portals@example.test",
        password: "Portal-Customer-Password-123!",
        firstName: "Portal Customer",
      }),
    });
    assert.equal(registeredCustomer.response.status, 201);
    assert.equal(registeredCustomer.body.user.role, "CUSTOMER");
    const customerToken = registeredCustomer.body.accessToken as string;

    const pendingVendor = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "vendor.portals@example.test",
        password: "Portal-Vendor-Password-123!",
        firstName: "Portal Vendor",
      }),
    });
    assert.equal(pendingVendor.response.status, 201);
    const pendingVendorToken = pendingVendor.body.accessToken as string;
    const pendingApplication = await request("/api/vendors/apply", {
      method: "POST",
      headers: { authorization: `Bearer ${pendingVendorToken}` },
      body: JSON.stringify({ storeName: "Portal Pending Store", storeDescription: "Awaiting review." }),
    });
    assert.equal(pendingApplication.response.status, 201);
    assert.equal(pendingApplication.body.application.status, "PENDING");

    const rejectedVendor = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "rejected.portals@example.test",
        password: "Portal-Rejected-Password-123!",
        firstName: "Portal Rejected",
      }),
    });
    assert.equal(rejectedVendor.response.status, 201);
    const rejectedVendorToken = rejectedVendor.body.accessToken as string;
    const rejectedApplication = await request("/api/vendors/apply", {
      method: "POST",
      headers: { authorization: `Bearer ${rejectedVendorToken}` },
      body: JSON.stringify({ storeName: "Portal Rejected Store" }),
    });
    assert.equal(rejectedApplication.response.status, 201);
    const rejection = await request(
      `/api/admin/vendors/applications/${encodeURIComponent(rejectedApplication.body.application.id as string)}`,
      {
        method: "PATCH",
        headers: { authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ decision: "REJECTED" }),
      },
    );
    assert.equal(rejection.response.status, 200);
    assert.equal(rejection.body.application.status, "REJECTED");

    const reviewVendor = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "review.portals@example.test",
        password: "Portal-Review-Password-123!",
        firstName: "Portal Review",
      }),
    });
    assert.equal(reviewVendor.response.status, 201);
    const reviewVendorToken = reviewVendor.body.accessToken as string;
    const reviewApplication = await request("/api/vendors/apply", {
      method: "POST",
      headers: { authorization: `Bearer ${reviewVendorToken}` },
      body: JSON.stringify({ storeName: "Portal Review Store" }),
    });
    assert.equal(reviewApplication.response.status, 201);
    assert.equal(reviewApplication.body.application.status, "PENDING");

    // Public registration must ignore any client-supplied privileged role.
    const escalationAdmin = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "escalation-admin.portals@example.test",
        password: "Portal-Escalation-Password-123!",
        firstName: "Escalation Admin",
        role: "ADMIN",
      }),
    });
    assert.equal(escalationAdmin.response.status, 201);
    assert.equal(escalationAdmin.body.user.role, "CUSTOMER", "public registration must never assign ADMIN");
    const escalationManager = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "escalation-manager.portals@example.test",
        password: "Portal-Escalation-Password-123!",
        firstName: "Escalation Manager",
        role: "MANAGER",
      }),
    });
    assert.equal(escalationManager.response.status, 201);
    assert.equal(escalationManager.body.user.role, "CUSTOMER", "public registration must never assign MANAGER");

    // Managers are provisioned exclusively by an authenticated administrator.
    const managerCreated = await request("/api/admin/managers", {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        email: "manager.portals@example.test",
        password: "Portal-Manager-Password-123!",
        firstName: "Portal Manager",
      }),
    });
    assert.equal(managerCreated.response.status, 201);
    assert.equal(managerCreated.body.manager.status, "ACTIVE");
    const managerLogin = await request("/api/auth/manager/login", {
      method: "POST",
      body: JSON.stringify({ email: "manager.portals@example.test", password: "Portal-Manager-Password-123!" }),
    });
    assert.equal(managerLogin.response.status, 200);
    assert.equal(managerLogin.body.user.role, "MANAGER");
    const managerToken = managerLogin.body.accessToken as string;
    const managerId = managerCreated.body.manager.id as string;

    await t.test("vendor portal admits only approved vendor accounts", async () => {
      const pendingOnVendorPortal = await request("/api/auth/vendor/login", {
        method: "POST",
        body: JSON.stringify({ email: "vendor.portals@example.test", password: "Portal-Vendor-Password-123!" }),
      });
      assert.equal(pendingOnVendorPortal.response.status, 401);
      assert.equal(pendingOnVendorPortal.body.error.code, "INVALID_CREDENTIALS");

      // A pending applicant is still a customer, so the customer portal keeps working.
      const pendingOnCustomerPortal = await request("/api/auth/customer/login", {
        method: "POST",
        body: JSON.stringify({ email: "vendor.portals@example.test", password: "Portal-Vendor-Password-123!" }),
      });
      assert.equal(pendingOnCustomerPortal.response.status, 200);
      assert.equal(pendingOnCustomerPortal.body.user.role, "CUSTOMER");

      const approval = await request(
        `/api/admin/vendors/applications/${encodeURIComponent(pendingApplication.body.application.id as string)}`,
        {
          method: "PATCH",
          headers: { authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ decision: "APPROVED" }),
        },
      );
      assert.equal(approval.response.status, 200);
      assert.equal(approval.body.application.role, "VENDOR");

      const approvedOnVendorPortal = await request("/api/auth/vendor/login", {
        method: "POST",
        body: JSON.stringify({ email: "vendor.portals@example.test", password: "Portal-Vendor-Password-123!" }),
      });
      assert.equal(approvedOnVendorPortal.response.status, 200);
      assert.equal(approvedOnVendorPortal.body.user.role, "VENDOR");

      const approvedOnCustomerPortal = await request("/api/auth/customer/login", {
        method: "POST",
        body: JSON.stringify({ email: "vendor.portals@example.test", password: "Portal-Vendor-Password-123!" }),
      });
      assert.equal(approvedOnCustomerPortal.response.status, 401);

      const approvedOnAdminPortal = await request("/api/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: "vendor.portals@example.test", password: "Portal-Vendor-Password-123!" }),
      });
      assert.equal(approvedOnAdminPortal.response.status, 401);

      const approvedOnManagerPortal = await request("/api/auth/manager/login", {
        method: "POST",
        body: JSON.stringify({ email: "vendor.portals@example.test", password: "Portal-Vendor-Password-123!" }),
      });
      assert.equal(approvedOnManagerPortal.response.status, 401);

      const rejectedOnVendorPortal = await request("/api/auth/vendor/login", {
        method: "POST",
        body: JSON.stringify({ email: "rejected.portals@example.test", password: "Portal-Rejected-Password-123!" }),
      });
      assert.equal(rejectedOnVendorPortal.response.status, 401);

      const rejectedOnCustomerPortal = await request("/api/auth/customer/login", {
        method: "POST",
        body: JSON.stringify({ email: "rejected.portals@example.test", password: "Portal-Rejected-Password-123!" }),
      });
      assert.equal(rejectedOnCustomerPortal.response.status, 200);
      assert.equal(rejectedOnCustomerPortal.body.user.role, "CUSTOMER");
    });

    await t.test("each portal accepts only its own role", async () => {
      const customerOnCustomerPortal = await request("/api/auth/customer/login", {
        method: "POST",
        body: JSON.stringify({ email: "customer.portals@example.test", password: "Portal-Customer-Password-123!" }),
      });
      assert.equal(customerOnCustomerPortal.response.status, 200);
      assert.equal(customerOnCustomerPortal.body.user.role, "CUSTOMER");

      const vendorOnCustomerPortal = await request("/api/auth/customer/login", {
        method: "POST",
        body: JSON.stringify({ email: "vendor.portals@example.test", password: "Portal-Vendor-Password-123!" }),
      });
      assert.equal(vendorOnCustomerPortal.response.status, 401);
      const adminOnCustomerPortal = await request("/api/auth/customer/login", {
        method: "POST",
        body: JSON.stringify({ email: "admin.portals@example.test", password: "Portal-Admin-Password-123!" }),
      });
      assert.equal(adminOnCustomerPortal.response.status, 401);
      const managerOnCustomerPortal = await request("/api/auth/customer/login", {
        method: "POST",
        body: JSON.stringify({ email: "manager.portals@example.test", password: "Portal-Manager-Password-123!" }),
      });
      assert.equal(managerOnCustomerPortal.response.status, 401);

      const customerOnVendorPortal = await request("/api/auth/vendor/login", {
        method: "POST",
        body: JSON.stringify({ email: "customer.portals@example.test", password: "Portal-Customer-Password-123!" }),
      });
      assert.equal(customerOnVendorPortal.response.status, 401);
      const adminOnVendorPortal = await request("/api/auth/vendor/login", {
        method: "POST",
        body: JSON.stringify({ email: "admin.portals@example.test", password: "Portal-Admin-Password-123!" }),
      });
      assert.equal(adminOnVendorPortal.response.status, 401);
      const managerOnVendorPortal = await request("/api/auth/vendor/login", {
        method: "POST",
        body: JSON.stringify({ email: "manager.portals@example.test", password: "Portal-Manager-Password-123!" }),
      });
      assert.equal(managerOnVendorPortal.response.status, 401);

      const adminOnAdminPortal = await request("/api/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: "admin.portals@example.test", password: "Portal-Admin-Password-123!" }),
      });
      assert.equal(adminOnAdminPortal.response.status, 200);
      assert.equal(adminOnAdminPortal.body.user.role, "ADMIN");
      const customerOnAdminPortal = await request("/api/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: "customer.portals@example.test", password: "Portal-Customer-Password-123!" }),
      });
      assert.equal(customerOnAdminPortal.response.status, 401);
      const vendorOnAdminPortal = await request("/api/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: "vendor.portals@example.test", password: "Portal-Vendor-Password-123!" }),
      });
      assert.equal(vendorOnAdminPortal.response.status, 401);
      const managerOnAdminPortal = await request("/api/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: "manager.portals@example.test", password: "Portal-Manager-Password-123!" }),
      });
      assert.equal(managerOnAdminPortal.response.status, 401);

      const managerOnManagerPortal = await request("/api/auth/manager/login", {
        method: "POST",
        body: JSON.stringify({ email: "manager.portals@example.test", password: "Portal-Manager-Password-123!" }),
      });
      assert.equal(managerOnManagerPortal.response.status, 200);
      assert.equal(managerOnManagerPortal.body.user.role, "MANAGER");
      const customerOnManagerPortal = await request("/api/auth/manager/login", {
        method: "POST",
        body: JSON.stringify({ email: "customer.portals@example.test", password: "Portal-Customer-Password-123!" }),
      });
      assert.equal(customerOnManagerPortal.response.status, 401);
      const vendorOnManagerPortal = await request("/api/auth/manager/login", {
        method: "POST",
        body: JSON.stringify({ email: "vendor.portals@example.test", password: "Portal-Vendor-Password-123!" }),
      });
      assert.equal(vendorOnManagerPortal.response.status, 401);
      const adminOnManagerPortal = await request("/api/auth/manager/login", {
        method: "POST",
        body: JSON.stringify({ email: "admin.portals@example.test", password: "Portal-Admin-Password-123!" }),
      });
      assert.equal(adminOnManagerPortal.response.status, 401);
    });

    await t.test("customers cannot reach administrator or manager capabilities", async () => {
      const escalationToken = escalationAdmin.body.accessToken as string;
      const adminDenied = await request("/api/admin/admins", {
        headers: { authorization: `Bearer ${escalationToken}` },
      });
      assert.equal(adminDenied.response.status, 403);
      const managerListDenied = await request("/api/admin/managers", {
        headers: { authorization: `Bearer ${escalationToken}` },
      });
      assert.equal(managerListDenied.response.status, 403);
      const applicationsDenied = await request("/api/admin/vendors/applications", {
        headers: { authorization: `Bearer ${escalationToken}` },
      });
      assert.equal(applicationsDenied.response.status, 403);
      const managerCreationDenied = await request("/api/admin/managers", {
        method: "POST",
        headers: { authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          email: "unauthorized-manager.portals@example.test",
          password: "Portal-Manager-Password-123!",
          firstName: "Unauthorized",
        }),
      });
      assert.equal(managerCreationDenied.response.status, 403);
    });

    await t.test("manager permissions stay limited to the permission matrix", async () => {
      // Allowed: listing and reviewing vendor applications.
      const applications = await request("/api/admin/vendors/applications?status=ALL", {
        headers: { authorization: `Bearer ${managerToken}` },
      });
      assert.equal(applications.response.status, 200);
      const listed = applications.body.applications as Array<{ id: string; status: string }>;
      assert.ok(listed.some((a) => a.id === reviewApplication.body.application.id && a.status === "PENDING"));

      const managerApproval = await request(
        `/api/admin/vendors/applications/${encodeURIComponent(reviewApplication.body.application.id as string)}`,
        {
          method: "PATCH",
          headers: { authorization: `Bearer ${managerToken}` },
          body: JSON.stringify({ decision: "APPROVED" }),
        },
      );
      assert.equal(managerApproval.response.status, 200);
      assert.equal(managerApproval.body.application.role, "VENDOR");

      // Denied: every administrative capability outside the permission matrix.
      const adminListDenied = await request("/api/admin/admins", {
        headers: { authorization: `Bearer ${managerToken}` },
      });
      assert.equal(adminListDenied.response.status, 403);
      const managerListDenied = await request("/api/admin/managers", {
        headers: { authorization: `Bearer ${managerToken}` },
      });
      assert.equal(managerListDenied.response.status, 403);
      const managerCreationDenied = await request("/api/admin/managers", {
        method: "POST",
        headers: { authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          email: "manager-created-manager.portals@example.test",
          password: "Portal-Manager-Password-123!",
          firstName: "Must Not Exist",
        }),
      });
      assert.equal(managerCreationDenied.response.status, 403);
      const productDenied = await request("/api/products", {
        method: "POST",
        headers: { authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          categoryId: "test-category",
          title: "Forbidden manager product",
          description: "Managers may not create products.",
          shortDescription: "Forbidden",
          price: 10,
          stock: 1,
        }),
      });
      assert.equal(productDenied.response.status, 403);

      // Administrators keep full manager administration.
      const adminManagerList = await request("/api/admin/managers", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      assert.equal(adminManagerList.response.status, 200);
      const managers = adminManagerList.body.managers as Array<{ id: string; email: string }>;
      assert.equal(managers.length, 1);
      assert.equal(managers[0].id, managerId);
      assert.equal(managers[0].email, "manager.portals@example.test");
    });

    await t.test("expired tokens and disabled managers are rejected", async () => {
      process.env.AUTH_TOKEN_SECRET = tokenSecret;
      const expiredManagerToken = createAccessToken(
        { id: managerId, email: "manager.portals@example.test", role: "MANAGER" },
        -1,
      );
      const expiredAccess = await request("/api/auth/me", {
        headers: { authorization: `Bearer ${expiredManagerToken}` },
      });
      assert.equal(expiredAccess.response.status, 401);

      const managerMe = await request("/api/auth/me", {
        headers: { authorization: `Bearer ${managerToken}` },
      });
      assert.equal(managerMe.response.status, 200);
      assert.equal(managerMe.body.user.role, "MANAGER");

      const disabled = await request(`/api/admin/managers/${encodeURIComponent(managerId)}/status`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: "DISABLED" }),
      });
      assert.equal(disabled.response.status, 200);
      assert.equal(disabled.body.manager.status, "DISABLED");

      const disabledManagerLogin = await request("/api/auth/manager/login", {
        method: "POST",
        body: JSON.stringify({ email: "manager.portals@example.test", password: "Portal-Manager-Password-123!" }),
      });
      assert.equal(disabledManagerLogin.response.status, 401);

      const revokedAccess = await request("/api/auth/me", {
        headers: { authorization: `Bearer ${managerToken}` },
      });
      assert.equal(revokedAccess.response.status, 401);
    });

    await t.test("password reset rotates credentials and revokes old sessions", async () => {
      // The email delivery step requires RESEND_API_KEY and is therefore not exercised
      // here; the confirm endpoint is verified with a token staged directly in the
      // isolated test database, exactly as a user would receive it by email.
      const rawToken = "portals-reset-token-0123456789abcdef0123456789abcdef";
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      await UserModel.updateOne(
        { email: "customer.portals@example.test" },
        {
          $set: {
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        },
      );

      const confirm = await request("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({
          email: "customer.portals@example.test",
          token: rawToken,
          password: "Portal-New-Password-123!",
        }),
      });
      assert.equal(confirm.response.status, 200);

      const oldPasswordLogin = await request("/api/auth/customer/login", {
        method: "POST",
        body: JSON.stringify({ email: "customer.portals@example.test", password: "Portal-Customer-Password-123!" }),
      });
      assert.equal(oldPasswordLogin.response.status, 401);

      const newPasswordLogin = await request("/api/auth/customer/login", {
        method: "POST",
        body: JSON.stringify({ email: "customer.portals@example.test", password: "Portal-New-Password-123!" }),
      });
      assert.equal(newPasswordLogin.response.status, 200);
      assert.equal(newPasswordLogin.body.user.role, "CUSTOMER");

      // Completing a reset increments authVersion, so tokens issued before the
      // reset must stop working immediately.
      const oldSession = await request("/api/auth/me", {
        headers: { authorization: `Bearer ${customerToken}` },
      });
      assert.equal(oldSession.response.status, 401);
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
      mongoose.connection.collection("adminstates").deleteMany({}),
    ]);
    await mongoose.disconnect();
  }
});
