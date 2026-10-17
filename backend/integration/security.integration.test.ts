import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import mongoose from 'mongoose';
import { UserModel } from '../models/user.model.js';
import { ProductModel } from '../models/product.model.js';
import { createAccessToken } from '../middleware/auth.js';

const enabled = process.env.RUN_MONGODB_INTEGRATION === 'true' && Boolean(process.env.MONGODB_URI);
const port = 4317;
const baseUrl = `http://127.0.0.1:${port}`;
const tokenSecret = 'integration-test-token-secret-at-least-32-characters';
const bootstrapSecret = 'integration-test-bootstrap-secret-at-least-32-characters';

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

test(
  'MongoDB-backed auth, role boundaries, bootstrap and product lifecycle',
  { skip: !enabled },
  async (t) => {
    const uri = process.env.MONGODB_URI!;
    const databaseName = uri.split('://')[1]?.split('/')[1]?.split('?')[0];
    assert.equal(
      databaseName,
      'rudin_store_integration_test',
      'Integration tests may only run against the dedicated rudin_store_integration_test database.',
    );
    await mongoose.connect(uri);
    await Promise.all([
      UserModel.deleteMany({}),
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

      await t.test(
        'rejects unauthenticated and customer access to admin/product mutations',
        async () => {
          const unauthenticated = await request('/api/admin/admins');
          assert.equal(unauthenticated.response.status, 401);

          const registered = await request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              email: 'customer.integration@example.test',
              password: 'Customer-Password-123!',
              firstName: 'Integration',
            }),
          });
          assert.equal(registered.response.status, 201);
          assert.equal(registered.body.user.role, 'CUSTOMER');
          const customerToken = registered.body.accessToken as string;
          process.env.AUTH_TOKEN_SECRET = tokenSecret;
          const expiredToken = createAccessToken(
            {
              id: registered.body.user.id,
              email: registered.body.user.email,
              role: 'CUSTOMER',
            },
            -1,
          );
          const expiredAccess = await request('/api/auth/me', {
            headers: { authorization: `Bearer ${expiredToken}` },
          });
          assert.equal(expiredAccess.response.status, 401);

          await UserModel.updateOne(
            { email: 'customer.integration@example.test' },
            { $set: { status: 'DISABLED' } },
          );
          const disabledAccess = await request('/api/auth/me', {
            headers: { authorization: `Bearer ${customerToken}` },
          });
          assert.equal(disabledAccess.response.status, 401);
          await UserModel.updateOne(
            { email: 'customer.integration@example.test' },
            { $set: { status: 'ACTIVE', authVersion: 1 } },
          );
          const revokedAccess = await request('/api/auth/me', {
            headers: { authorization: `Bearer ${customerToken}` },
          });
          assert.equal(revokedAccess.response.status, 401);
          await UserModel.updateOne(
            { email: 'customer.integration@example.test' },
            { $set: { authVersion: 0 } },
          );

          const adminDenied = await request('/api/admin/admins', {
            headers: { authorization: `Bearer ${customerToken}` },
          });
          assert.equal(adminDenied.response.status, 403);

          const productDenied = await request('/api/products', {
            method: 'POST',
            headers: { authorization: `Bearer ${customerToken}` },
            body: JSON.stringify({
              categoryId: 'test-category',
              title: 'Forbidden product',
              description: 'Should not be created.',
              shortDescription: 'Forbidden',
              price: 10,
              stock: 1,
            }),
          });
          assert.equal(productDenied.response.status, 403);
        },
      );

      await t.test(
        'bootstraps only one manager, appoints admins and protects product lifecycle',
        async () => {
          // NOTE: the server rate-limits POST /api/auth/bootstrap-manager to 5 requests per
          // 15-minute window per IP. Keep the total number of bootstrap requests in this
          // subtest at or below 5; overlapping branches are intentionally merged.
          // Missing bootstrap secret (the incorrect-secret branch returns the same 404).
          const noSecret = await request('/api/auth/bootstrap-manager', {
            method: 'POST',
            body: JSON.stringify({
              email: 'no-secret.admin@example.test',
              password: 'Admin-Password-123!',
              firstName: 'No Secret',
            }),
          });
          assert.equal(noSecret.response.status, 404);

          // Missing request fields (the short-password branch returns the same 400 INVALID_MANAGER).
          const missingFields = await request('/api/auth/bootstrap-manager', {
            method: 'POST',
            headers: { 'x-manager-bootstrap-secret': bootstrapSecret },
            body: JSON.stringify({}),
          });
          assert.equal(missingFields.response.status, 400);
          assert.equal(missingFields.body.error.code, 'INVALID_MANAGER');

          // Regression: bootstrapping with an email that already belongs to an account must
          // return the precise EMAIL_IN_USE error, not the generic DUPLICATE_RESOURCE error.
          // Self-contained setup: this subtest registers its own dedicated account instead of
          // relying on a user created by an earlier subtest.
          const duplicateEmailOwner = await request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              email: 'duplicate-email.bootstrap@example.test',
              password: 'Duplicate-Email-Password-123!',
              firstName: 'Duplicate Email',
            }),
          });
          assert.equal(duplicateEmailOwner.response.status, 201);
          const emailInUse = await request('/api/auth/bootstrap-manager', {
            method: 'POST',
            headers: { 'x-manager-bootstrap-secret': bootstrapSecret },
            body: JSON.stringify({
              email: 'duplicate-email.bootstrap@example.test',
              password: 'Admin-Password-123!',
              firstName: 'Email In Use',
            }),
          });
          assert.equal(emailInUse.response.status, 409);
          assert.equal(emailInUse.body.error.code, 'EMAIL_IN_USE');

          // Concurrent bootstrap attempts: the admin-state transaction must allow exactly one
          // manager; the loser reports BOOTSTRAP_CLOSED.
          const concurrent = await Promise.all([
            request('/api/auth/bootstrap-manager', {
              method: 'POST',
              headers: { 'x-manager-bootstrap-secret': bootstrapSecret },
              body: JSON.stringify({
                email: 'manager.integration@example.test',
                password: 'Manager-Password-123!',
                firstName: 'Integration Manager',
              }),
            }),
            request('/api/auth/bootstrap-manager', {
              method: 'POST',
              headers: { 'x-manager-bootstrap-secret': bootstrapSecret },
              body: JSON.stringify({
                email: 'second-manager.integration@example.test',
                password: 'Manager-Password-456!',
                firstName: 'Second Manager',
              }),
            }),
          ]);
          const concurrentStatuses = concurrent
            .map((result) => result.response.status)
            .sort((a, b) => a - b);
          assert.deepEqual(concurrentStatuses, [201, 409]);
          const winner = concurrent.find((result) => result.response.status === 201)!;
          const loser = concurrent.find((result) => result.response.status === 409)!;
          assert.equal(loser.body.error.code, 'BOOTSTRAP_CLOSED');
          assert.equal(winner.body.user.role, 'MANAGER');
          const managerToken = winner.body.accessToken as string;

          // The primary manager appoints an admin with the catalog-curator preset; the
          // server resolves the preset and stores the effective permission list on the
          // account instead of trusting client-supplied permission strings.
          const appointedAdmin = await request('/api/admin/admins', {
            method: 'POST',
            headers: { authorization: `Bearer ${managerToken}` },
            body: JSON.stringify({
              email: 'admin.integration@example.test',
              password: 'Admin-Password-123!',
              firstName: 'Integration Admin',
              permission: { presets: ['catalog-curator'] },
            }),
          });
          assert.equal(appointedAdmin.response.status, 201);
          assert.deepEqual(appointedAdmin.body.admin.permissions, [
            'products:manage',
            'vendors:review',
          ]);
          const adminId = appointedAdmin.body.admin.id as string;

          const invalidPermission = await request('/api/admin/admins', {
            method: 'POST',
            headers: { authorization: `Bearer ${managerToken}` },
            body: JSON.stringify({
              email: 'invalid-permission.integration@example.test',
              password: 'Admin-Password-123!',
              firstName: 'Invalid Permission',
              permission: { allow: ['not-a-permission'] },
            }),
          });
          assert.equal(invalidPermission.response.status, 400);
          assert.equal(invalidPermission.body.error.code, 'INVALID_PERMISSIONS');

          const adminLogin = await request('/api/auth/admin/login', {
            method: 'POST',
            body: JSON.stringify({
              email: 'admin.integration@example.test',
              password: 'Admin-Password-123!',
            }),
          });
          assert.equal(adminLogin.response.status, 200);
          assert.equal(adminLogin.body.user.role, 'ADMIN');
          const adminToken = adminLogin.body.accessToken as string;

          // Appointed admins cannot reach manager-only governance, even with permissions.
          const adminGovernanceDenied = await request('/api/admin/admins', {
            headers: { authorization: `Bearer ${adminToken}` },
          });
          assert.equal(adminGovernanceDenied.response.status, 403);
          const adminCreationDenied = await request('/api/admin/admins', {
            method: 'POST',
            headers: { authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
              email: 'self-appointed.integration@example.test',
              password: 'Admin-Password-456!',
              firstName: 'Self Appointed',
            }),
          });
          assert.equal(adminCreationDenied.response.status, 403);
          const selfEscalationDenied = await request(
            `/api/admin/admins/${encodeURIComponent(adminId)}/permissions`,
            {
              method: 'PATCH',
              headers: { authorization: `Bearer ${adminToken}` },
              body: JSON.stringify({ allow: ['products:manage'] }),
            },
          );
          assert.equal(selfEscalationDenied.response.status, 403);

          const customerLogin = await request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              email: 'customer.integration@example.test',
              password: 'Customer-Password-123!',
            }),
          });
          assert.equal(customerLogin.response.status, 200);
          const customerToken = customerLogin.body.accessToken as string;

          const application = await request('/api/vendors/apply', {
            method: 'POST',
            headers: { authorization: `Bearer ${customerToken}` },
            body: JSON.stringify({
              storeName: 'Integration Store',
              storeDescription: 'Test vendor application.',
            }),
          });
          assert.equal(application.response.status, 201);
          assert.equal(application.body.application.status, 'PENDING');

          const applications = await request('/api/admin/vendors/applications', {
            headers: { authorization: `Bearer ${adminToken}` },
          });
          assert.equal(applications.response.status, 200);
          const applicationId = application.body.application.id as string;
          const approved = await request(
            `/api/admin/vendors/applications/${encodeURIComponent(applicationId)}`,
            {
              method: 'PATCH',
              headers: { authorization: `Bearer ${adminToken}` },
              body: JSON.stringify({ decision: 'APPROVED' }),
            },
          );
          assert.equal(approved.response.status, 200);
          assert.equal(approved.body.application.role, 'VENDOR');

          const vendorLogin = await request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              email: 'customer.integration@example.test',
              password: 'Customer-Password-123!',
            }),
          });
          assert.equal(vendorLogin.response.status, 200);
          const vendorToken = vendorLogin.body.accessToken as string;
          const vendorProduct = await request('/api/products', {
            method: 'POST',
            headers: { authorization: `Bearer ${vendorToken}` },
            body: JSON.stringify({
              categoryId: 'test-category',
              title: 'Vendor Draft Lamp',
              description: 'Draft created by approved vendor.',
              shortDescription: 'Vendor draft',
              price: 19.99,
              stock: 2,
              status: 'PUBLISHED',
              images: [],
            }),
          });
          assert.equal(vendorProduct.response.status, 201);
          assert.equal(vendorProduct.body.product.status, 'DRAFT');
          assert.equal(vendorProduct.body.product.vendorId, applicationId);

          const secondCustomer = await request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              email: 'second-vendor.integration@example.test',
              password: 'Second-Customer-Password-123!',
              firstName: 'Second Vendor',
            }),
          });
          assert.equal(secondCustomer.response.status, 201);
          const secondCustomerToken = secondCustomer.body.accessToken as string;
          const secondApplication = await request('/api/vendors/apply', {
            method: 'POST',
            headers: { authorization: `Bearer ${secondCustomerToken}` },
            body: JSON.stringify({ storeName: 'Second Integration Store' }),
          });
          assert.equal(secondApplication.response.status, 201);
          const secondApplicationId = secondApplication.body.application.id as string;
          const secondApproval = await request(
            `/api/admin/vendors/applications/${encodeURIComponent(secondApplicationId)}`,
            {
              method: 'PATCH',
              headers: { authorization: `Bearer ${adminToken}` },
              body: JSON.stringify({ decision: 'APPROVED' }),
            },
          );
          assert.equal(secondApproval.response.status, 200);
          const secondVendorLogin = await request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              email: 'second-vendor.integration@example.test',
              password: 'Second-Customer-Password-123!',
            }),
          });
          const secondVendorToken = secondVendorLogin.body.accessToken as string;
          const crossVendorEdit = await request(
            `/api/products/${encodeURIComponent(vendorProduct.body.product.id as string)}`,
            {
              method: 'PATCH',
              headers: { authorization: `Bearer ${secondVendorToken}` },
              body: JSON.stringify({ price: 1 }),
            },
          );
          assert.equal(crossVendorEdit.response.status, 403);

          // Public vendor directory must list approved vendors without private user fields.
          const vendorDirectory = await request('/api/vendors');
          assert.equal(vendorDirectory.response.status, 200);
          const listedVendors = vendorDirectory.body.vendors as Array<Record<string, unknown>>;
          const integrationVendor = listedVendors.find((v) => v.id === applicationId);
          assert.ok(integrationVendor, 'approved vendor should be listed publicly');
          assert.equal(integrationVendor.storeName, 'Integration Store');
          assert.ok(!('email' in integrationVendor), 'public vendor listing must not expose email');
          assert.ok(!('phone' in integrationVendor), 'public vendor listing must not expose phone');
          assert.ok(
            !('passwordHash' in integrationVendor),
            'public vendor listing must not expose password data',
          );

          const vendorBySlug = await request(
            `/api/vendors?slug=${encodeURIComponent(String(integrationVendor.slug))}`,
          );
          assert.equal(vendorBySlug.response.status, 200);
          assert.equal((vendorBySlug.body.vendors as Array<Record<string, unknown>>).length, 1);

          const vendorProfile = await request(`/api/vendors/${encodeURIComponent(applicationId)}`);
          assert.equal(vendorProfile.response.status, 200);
          assert.equal(vendorProfile.body.vendor.storeName, 'Integration Store');
          assert.ok(
            !('email' in vendorProfile.body.vendor),
            'vendor profile must not expose email',
          );

          // Non-vendor accounts must not be reachable through the public vendor profile API.
          const adminProfile = await request(
            `/api/vendors/${encodeURIComponent(winner.body.user.id as string)}`,
          );
          assert.equal(adminProfile.response.status, 404);

          // Draft products must never appear in the public catalog.
          const publicCatalog = await request('/api/products?limit=100');
          assert.equal(publicCatalog.response.status, 200);
          const publicProducts = publicCatalog.body.products as Array<{
            id: string;
            status: string;
          }>;
          assert.ok(
            publicProducts.every((p) => p.status === 'PUBLISHED'),
            'public catalog may only contain published products',
          );
          assert.ok(
            !publicProducts.some((p) => p.id === vendorProduct.body.product.id),
            'draft products must not be publicly listed',
          );

          const created = await request('/api/products', {
            method: 'POST',
            headers: { authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
              categoryId: 'test-category',
              title: 'Integration Test Lamp',
              description: 'Product created by integration test.',
              shortDescription: 'Integration lamp',
              price: 29.99,
              stock: 3,
              status: 'PUBLISHED',
              images: [{ id: 'test-image', url: 'https://cdn.example.test/test.jpg' }],
            }),
          });
          assert.equal(created.response.status, 201);
          const productId = created.body.product.id as string;
          assert.equal(created.body.product.status, 'PUBLISHED');

          const updated = await request(`/api/products/${encodeURIComponent(productId)}`, {
            method: 'PATCH',
            headers: { authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({ price: 24.99 }),
          });
          assert.equal(updated.response.status, 200);
          assert.equal(updated.body.product.price, 24.99);

          const archived = await request(`/api/products/${encodeURIComponent(productId)}`, {
            method: 'DELETE',
            headers: { authorization: `Bearer ${adminToken}` },
          });
          assert.equal(archived.response.status, 200);
          assert.equal(archived.body.status, 'ARCHIVED');

          const publicLookup = await request(`/api/products/${encodeURIComponent(productId)}`);
          assert.equal(publicLookup.response.status, 404);

          // Only the manager can revoke or re-grant an admin's permission, and the
          // change applies immediately because requireAuth re-reads adminPermissions.
          const revoked = await request(
            `/api/admin/admins/${encodeURIComponent(adminId)}/permissions`,
            {
              method: 'PATCH',
              headers: { authorization: `Bearer ${managerToken}` },
              body: JSON.stringify({ presets: ['catalog-curator'], deny: ['products:manage'] }),
            },
          );
          assert.equal(revoked.response.status, 200);
          assert.deepEqual(revoked.body.admin.permissions, ['vendors:review']);
          const publishDenied = await request('/api/products', {
            method: 'POST',
            headers: { authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
              categoryId: 'test-category',
              title: 'Forbidden after revocation',
              description: 'Admins without products:manage may not manage the catalog.',
              shortDescription: 'Forbidden',
              price: 9.99,
              stock: 1,
            }),
          });
          assert.equal(publishDenied.response.status, 403);
          const regranted = await request(
            `/api/admin/admins/${encodeURIComponent(adminId)}/permissions`,
            {
              method: 'PATCH',
              headers: { authorization: `Bearer ${managerToken}` },
              body: JSON.stringify({ presets: ['catalog-curator'] }),
            },
          );
          assert.equal(regranted.response.status, 200);
          assert.deepEqual(regranted.body.admin.permissions, ['products:manage', 'vendors:review']);
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
        ProductModel.deleteMany({}),
        mongoose.connection.collection('adminstates').deleteMany({}),
      ]);
      await mongoose.disconnect();
    }
  },
);
