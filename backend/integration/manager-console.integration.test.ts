import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import mongoose from 'mongoose';
import { UserModel } from '../models/user.model.js';
import { ProductModel } from '../models/product.model.js';
import { AdminInvitationModel } from '../models/admin-invitation.model.js';
import { AuditLogModel } from '../models/audit-log.model.js';
import { createIntegrationAdmin } from './admin-fixtures.js';

const enabled = process.env.RUN_MONGODB_INTEGRATION === 'true' && Boolean(process.env.MONGODB_URI);
const port = 4320;
const baseUrl = `http://127.0.0.1:${port}`;
const tokenSecret = 'manager-console-integration-token-secret-at-least-32-characters';
const bootstrapSecret = 'manager-console-integration-bootstrap-secret-32-chars';

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

/**
 * Verifies the Phase 1 Manager console endpoints end to end against a live
 * API and MongoDB replica set: MANAGER-only access to metrics, the customer
 * directory, and audit history; products:manage scoping for catalog
 * oversight; server-side role validation for customer status changes with
 * session revocation; reliable audit coupling for sensitive actions; and the
 * invitation resend state machine with its configuration gating.
 */
test(
  'MongoDB-backed Manager console: metrics, customers, products, audit logs, resend',
  { skip: !enabled },
  async (t) => {
    const baseUri = process.env.MONGODB_URI!;
    const databaseName = baseUri.split('://')[1]?.split('/')[1]?.split('?')[0];
    assert.equal(
      databaseName,
      'rudin_store_integration_test',
      'The manager-console integration suite must start from the dedicated rudin_store_integration_test database.',
    );
    // Parallel suites must not wipe each other's data: this suite owns its own derivation.
    const uri = baseUri.replace(
      'rudin_store_integration_test',
      'rudin_store_integration_test_manager_console',
    );
    await mongoose.connect(uri);
    await Promise.all([
      UserModel.deleteMany({}),
      ProductModel.deleteMany({}),
      AdminInvitationModel.deleteMany({}),
      AuditLogModel.deleteMany({}),
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
            RESEND_API_KEY: '',
            EMAIL_FROM: '',
          },
          stdio: 'inherit',
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

      // NOTE on rate-limit budgets (per IP): bootstrap allows 5 per 15 minutes,
      // registration 8 per hour, each login portal 10 per 15 minutes. This suite
      // performs 1 bootstrap, 3 registrations, 2 admin logins, and 1 customer
      // login, and stays within every budget across all subtests.

      const bootstrap = await request('/api/auth/bootstrap-manager', {
        method: 'POST',
        headers: { 'x-manager-bootstrap-secret': bootstrapSecret },
        body: JSON.stringify({
          email: 'manager.console@example.test',
          password: 'Console-Manager-Password-123!',
          firstName: 'Console Manager',
        }),
      });
      assert.equal(bootstrap.response.status, 201);
      assert.equal(bootstrap.body.user.role, 'MANAGER');
      const managerToken = bootstrap.body.accessToken as string;
      const managerId = bootstrap.body.user.id as string;

      const adminNoPerms = await createIntegrationAdmin({
        email: 'admin.no-perms.console@example.test',
        password: 'Console-Admin-Password-123!',
        firstName: 'Console Admin NoPerms',
        createdBy: managerId,
        permissions: [],
      });
      const adminNoPermsId = adminNoPerms._id as string;
      const adminCatalog = await createIntegrationAdmin({
        email: 'admin.catalog.console@example.test',
        password: 'Console-Catalog-Password-123!',
        firstName: 'Console Admin Catalog',
        createdBy: managerId,
        permissions: ['products:manage'],
      });
      const adminCatalogId = adminCatalog._id as string;

      const adminNoPermsLogin = await request('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin.no-perms.console@example.test',
          password: 'Console-Admin-Password-123!',
        }),
      });
      assert.equal(adminNoPermsLogin.response.status, 200);
      const adminNoPermsToken = adminNoPermsLogin.body.accessToken as string;

      const adminCatalogLogin = await request('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin.catalog.console@example.test',
          password: 'Console-Catalog-Password-123!',
        }),
      });
      assert.equal(adminCatalogLogin.response.status, 200);
      assert.deepEqual(adminCatalogLogin.body.user.adminPermissions, ['products:manage']);
      const adminCatalogToken = adminCatalogLogin.body.accessToken as string;

      const customerTarget = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'customer.target.console@example.test',
          password: 'Console-Customer-Password-123!',
          firstName: 'Console Target',
        }),
      });
      assert.equal(customerTarget.response.status, 201);
      const customerToken = customerTarget.body.accessToken as string;
      const customerTargetId = customerTarget.body.user.id as string;

      const customerFiller = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'customer.filler.console@example.test',
          password: 'Console-Filler-Password-123!',
          firstName: 'Console Filler',
        }),
      });
      assert.equal(customerFiller.response.status, 201);

      const vendorApplicant = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'vendor.applicant.console@example.test',
          password: 'Console-Vendor-Password-123!',
          firstName: 'Console Vendor',
        }),
      });
      assert.equal(vendorApplicant.response.status, 201);
      const vendorApplicantToken = vendorApplicant.body.accessToken as string;
      const vendorApplicantId = vendorApplicant.body.user.id as string;
      const vendorApplication = await request('/api/vendors/apply', {
        method: 'POST',
        headers: { authorization: `Bearer ${vendorApplicantToken}` },
        body: JSON.stringify({
          storeName: 'Console Applicant Store',
          storeDescription: 'Awaiting manager review.',
        }),
      });
      assert.equal(vendorApplication.response.status, 201);
      assert.equal(vendorApplication.body.application.status, 'PENDING');
      assert.equal(vendorApplication.body.application.id, vendorApplicantId);

      await ProductModel.create([
        {
          _id: 'prd_mc_published_1',
          vendorId: 'usr_mc_vendor_placeholder',
          categoryId: 'cat_mc_test',
          slug: 'manager-console-published-product',
          title: 'Manager Console Published Product',
          description: 'A published product for the manager console oversight test.',
          shortDescription: 'Published test product.',
          price: 42,
          stock: 7,
          status: 'PUBLISHED',
        },
        {
          _id: 'prd_mc_draft_1',
          vendorId: 'usr_mc_vendor_placeholder',
          categoryId: 'cat_mc_test',
          slug: 'manager-console-draft-product',
          title: 'Manager Console Draft Product',
          description: 'A draft product for the manager console oversight test.',
          shortDescription: 'Draft test product.',
          price: 13,
          stock: 2,
          status: 'DRAFT',
        },
      ]);

      await AdminInvitationModel.create({
        _id: 'inv_mc_active',
        email: 'active.console@example.test',
        firstName: 'Active Console',
        status: 'ACTIVE',
        createdBy: managerId,
      });
      await AdminInvitationModel.create({
        _id: 'inv_mc_invited',
        email: 'invited.console@example.test',
        activeEmail: 'invited.console@example.test',
        firstName: 'Invited Console',
        status: 'INVITED',
        tokenHash: 'seeded-token-hash-aaaa',
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdBy: managerId,
      });

      await t.test('metrics are MANAGER-only and computed server-side', async () => {
        const unauthenticated = await request('/api/admin/metrics');
        assert.equal(unauthenticated.response.status, 401);
        assert.equal(unauthenticated.body.error.code, 'UNAUTHENTICATED');

        const asCustomer = await request('/api/admin/metrics', {
          headers: { authorization: `Bearer ${customerToken}` },
        });
        assert.equal(asCustomer.response.status, 403);
        assert.equal(asCustomer.body.error.code, 'FORBIDDEN');

        const asAdmin = await request('/api/admin/metrics', {
          headers: { authorization: `Bearer ${adminCatalogToken}` },
        });
        assert.equal(asAdmin.response.status, 403);
        assert.equal(asAdmin.body.error.code, 'FORBIDDEN');

        const asManager = await request('/api/admin/metrics', {
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(asManager.response.status, 200);
        const metrics = asManager.body.metrics;
        assert.equal(metrics.customers.active, 3);
        assert.equal(metrics.customers.disabled, 0);
        assert.equal(metrics.vendors.total, 0);
        assert.equal(metrics.vendors.applicationsPending, 1);
        assert.equal(metrics.products.published, 1);
        assert.equal(metrics.products.draft, 1);
        assert.equal(metrics.products.archived, 0);
        assert.deepEqual(metrics.orders.byStatus, {
          PENDING: 0,
          PROCESSING: 0,
          SHIPPED: 0,
          DELIVERED: 0,
          CANCELLED: 0,
        });
        assert.equal(metrics.orders.nonCancelled, 0);
        assert.equal(metrics.orders.revenue, 0);
        assert.equal(metrics.coupons.active, 0);
        assert.ok(typeof metrics.generatedAt === 'string');
      });

      await t.test('customer directory is MANAGER-only with search and status filters', async () => {
        const unauthenticated = await request('/api/admin/customers');
        assert.equal(unauthenticated.response.status, 401);

        const asAdmin = await request('/api/admin/customers', {
          headers: { authorization: `Bearer ${adminCatalogToken}` },
        });
        assert.equal(asAdmin.response.status, 403);

        const listing = await request('/api/admin/customers', {
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(listing.response.status, 200);
        assert.equal(listing.body.pagination.page, 1);
        assert.equal(listing.body.pagination.total, 3);
        assert.ok(
          (listing.body.customers as Array<{ id: string }>).some(
            (customer) => customer.id === customerTargetId,
          ),
        );

        const searched = await request(
          `/api/admin/customers?search=${encodeURIComponent('target.console')}`,
          { headers: { authorization: `Bearer ${managerToken}` } },
        );
        assert.equal(searched.response.status, 200);
        assert.equal(searched.body.pagination.total, 1);
        assert.equal(searched.body.customers[0].id, customerTargetId);

        const invalidStatus = await request('/api/admin/customers?status=BANNED', {
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(invalidStatus.response.status, 400);
        assert.equal(invalidStatus.body.error.code, 'INVALID_QUERY');

        const filtered = await request('/api/admin/customers?status=DISABLED', {
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(filtered.response.status, 200);
        assert.equal(filtered.body.pagination.total, 0);
      });

      await t.test('customer status changes enforce server-side role scoping', async () => {
        const unauthenticated = await request(`/api/admin/customers/${customerTargetId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'DISABLED' }),
        });
        assert.equal(unauthenticated.response.status, 401);

        const asCustomer = await request(`/api/admin/customers/${customerTargetId}/status`, {
          method: 'PATCH',
          headers: { authorization: `Bearer ${customerToken}` },
          body: JSON.stringify({ status: 'DISABLED' }),
        });
        assert.equal(asCustomer.response.status, 403);

        const asAdmin = await request(`/api/admin/customers/${customerTargetId}/status`, {
          method: 'PATCH',
          headers: { authorization: `Bearer ${adminNoPermsToken}` },
          body: JSON.stringify({ status: 'DISABLED' }),
        });
        assert.equal(asAdmin.response.status, 403);

        const invalidStatus = await request(`/api/admin/customers/${customerTargetId}/status`, {
          method: 'PATCH',
          headers: { authorization: `Bearer ${managerToken}` },
          body: JSON.stringify({ status: 'BANNED' }),
        });
        assert.equal(invalidStatus.response.status, 400);
        assert.equal(invalidStatus.body.error.code, 'INVALID_STATUS');

        const nonObject = await request(`/api/admin/customers/${customerTargetId}/status`, {
          method: 'PATCH',
          headers: { authorization: `Bearer ${managerToken}` },
          body: JSON.stringify('not-an-object'),
        });
        assert.equal(nonObject.response.status, 400);
        assert.equal(nonObject.body.error.code, 'INVALID_STATUS');

        const missing = await request('/api/admin/customers/usr_mc_does_not_exist/status', {
          method: 'PATCH',
          headers: { authorization: `Bearer ${managerToken}` },
          body: JSON.stringify({ status: 'DISABLED' }),
        });
        assert.equal(missing.response.status, 404);
        assert.equal(missing.body.error.code, 'CUSTOMER_NOT_FOUND');

        // ADMIN accounts can never be managed through the customer route.
        const adminTarget = await request(`/api/admin/customers/${adminNoPermsId}/status`, {
          method: 'PATCH',
          headers: { authorization: `Bearer ${managerToken}` },
          body: JSON.stringify({ status: 'DISABLED' }),
        });
        assert.equal(adminTarget.response.status, 403);
        assert.equal(adminTarget.body.error.code, 'NOT_A_CUSTOMER');

        const adminAfterAttempt = await UserModel.findById(adminNoPermsId).lean();
        assert.equal(adminAfterAttempt?.status, 'ACTIVE');
        assert.equal(adminAfterAttempt?.role, 'ADMIN');
      });

      await t.test('vendor approval keeps its existing flow and audits the decision', async () => {
        const approval = await request(
          `/api/admin/vendors/applications/${encodeURIComponent(vendorApplicantId)}`,
          {
            method: 'PATCH',
            headers: { authorization: `Bearer ${managerToken}` },
            body: JSON.stringify({ decision: 'APPROVED' }),
          },
        );
        assert.equal(approval.response.status, 200);
        assert.equal(approval.body.application.role, 'VENDOR');
        assert.equal(approval.body.application.status, 'APPROVED');

        const decisionAudit = await AuditLogModel.findOne({
          action: 'admin.vendor_application.decision',
          targetId: vendorApplicantId,
        }).lean();
        assert.ok(decisionAudit, 'vendor decision audit record must exist');
        assert.equal(decisionAudit.actorId, managerId);
        assert.equal((decisionAudit.metadata as Record<string, unknown>).decision, 'APPROVED');
      });

      await t.test('VENDOR accounts cannot be managed through the customer route', async () => {
        const vendorTarget = await request(`/api/admin/customers/${vendorApplicantId}/status`, {
          method: 'PATCH',
          headers: { authorization: `Bearer ${managerToken}` },
          body: JSON.stringify({ status: 'DISABLED' }),
        });
        assert.equal(vendorTarget.response.status, 403);
        assert.equal(vendorTarget.body.error.code, 'NOT_A_CUSTOMER');
      });

      await t.test('disabling a customer revokes sessions and audits reliably', async () => {
        const disable = await request(`/api/admin/customers/${customerTargetId}/status`, {
          method: 'PATCH',
          headers: { authorization: `Bearer ${managerToken}` },
          body: JSON.stringify({ status: 'DISABLED' }),
        });
        assert.equal(disable.response.status, 200);
        assert.equal(disable.body.customer.status, 'DISABLED');

        // The authVersion bump must invalidate the previously issued token.
        const revokedSession = await request('/api/auth/me', {
          headers: { authorization: `Bearer ${customerToken}` },
        });
        assert.equal(revokedSession.response.status, 401);

        const repeatDisable = await request(`/api/admin/customers/${customerTargetId}/status`, {
          method: 'PATCH',
          headers: { authorization: `Bearer ${managerToken}` },
          body: JSON.stringify({ status: 'DISABLED' }),
        });
        assert.equal(repeatDisable.response.status, 409);
        assert.equal(repeatDisable.body.error.code, 'STATUS_CONFLICT');

        const reenable = await request(`/api/admin/customers/${customerTargetId}/status`, {
          method: 'PATCH',
          headers: { authorization: `Bearer ${managerToken}` },
          body: JSON.stringify({ status: 'ACTIVE' }),
        });
        assert.equal(reenable.response.status, 200);
        assert.equal(reenable.body.customer.status, 'ACTIVE');

        const relogin = await request('/api/auth/customer/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'customer.target.console@example.test',
            password: 'Console-Customer-Password-123!',
          }),
        });
        assert.equal(relogin.response.status, 200);
        assert.equal(relogin.body.user.status, 'ACTIVE');

        // Reliable tier: both status changes must have produced audit records
        // coupled to the same transaction.
        const auditRecords = await AuditLogModel.find({
          action: 'admin.customer.status_changed',
          targetId: customerTargetId,
        })
          .sort({ createdAt: 1 })
          .lean();
        assert.equal(auditRecords.length, 2);
        assert.equal((auditRecords[0].metadata as Record<string, unknown>).to, 'DISABLED');
        assert.equal((auditRecords[1].metadata as Record<string, unknown>).to, 'ACTIVE');
        for (const record of auditRecords) {
          assert.equal(record.actorId, managerId);
          assert.equal(record.actorRole, 'MANAGER');
          assert.equal(record.targetType, 'user');
        }
      });

      await t.test('audit history is MANAGER-only with filters', async () => {
        const unauthenticated = await request('/api/admin/audit-logs');
        assert.equal(unauthenticated.response.status, 401);

        const asAdmin = await request('/api/admin/audit-logs', {
          headers: { authorization: `Bearer ${adminCatalogToken}` },
        });
        assert.equal(asAdmin.response.status, 403);

        const listing = await request('/api/admin/audit-logs', {
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(listing.response.status, 200);
        assert.ok((listing.body.pagination.total as number) >= 2);

        const filtered = await request(
          '/api/admin/audit-logs?action=admin.customer.status_changed',
          { headers: { authorization: `Bearer ${managerToken}` } },
        );
        assert.equal(filtered.response.status, 200);
        assert.equal(filtered.body.pagination.total, 2);
        assert.equal(filtered.body.logs.length, 2);
        assert.equal(filtered.body.logs[0].actorRole, 'MANAGER');
        assert.ok(filtered.body.logs[0].createdAt);
        assert.ok(filtered.body.logs[0].id);

        const ranged = await request(
          `/api/admin/audit-logs?action=admin.customer.status_changed&from=${encodeURIComponent(
            new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          )}&to=${encodeURIComponent(new Date(Date.now() + 60 * 60 * 1000).toISOString())}`,
          { headers: { authorization: `Bearer ${managerToken}` } },
        );
        assert.equal(ranged.response.status, 200);
        assert.equal(ranged.body.pagination.total, 2);

        const invalidPage = await request('/api/admin/audit-logs?page=0', {
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(invalidPage.response.status, 400);
        assert.equal(invalidPage.body.error.code, 'INVALID_QUERY');
      });

      await t.test('catalog oversight is gated by products:manage and read-only', async () => {
        const unauthenticated = await request('/api/admin/products');
        assert.equal(unauthenticated.response.status, 401);

        const asCustomer = await request('/api/admin/products', {
          headers: { authorization: `Bearer ${customerToken}` },
        });
        assert.equal(asCustomer.response.status, 403);

        const asAdminWithoutPermission = await request('/api/admin/products', {
          headers: { authorization: `Bearer ${adminNoPermsToken}` },
        });
        assert.equal(asAdminWithoutPermission.response.status, 403);

        const asAdminWithPermission = await request('/api/admin/products', {
          headers: { authorization: `Bearer ${adminCatalogToken}` },
        });
        assert.equal(asAdminWithPermission.response.status, 200);
        assert.ok(
          (asAdminWithPermission.body.products as Array<{ id: string }>).some(
            (product) => product.id === 'prd_mc_published_1',
          ),
        );

        const asManager = await request('/api/admin/products?status=DRAFT', {
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(asManager.response.status, 200);
        const drafts = asManager.body.products as Array<{ id: string; status: string }>;
        assert.equal(drafts.length, 1);
        assert.equal(drafts[0].id, 'prd_mc_draft_1');
        assert.equal(drafts[0].status, 'DRAFT');

        const searched = await request(
          `/api/admin/products?search=${encodeURIComponent('manager-console')}`,
          { headers: { authorization: `Bearer ${managerToken}` } },
        );
        assert.equal(searched.response.status, 200);
        assert.equal(searched.body.pagination.total, 2);

        const invalidStatus = await request('/api/admin/products?status=DELETED', {
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(invalidStatus.response.status, 400);
        assert.equal(invalidStatus.body.error.code, 'INVALID_QUERY');

        const invalidLimit = await request('/api/admin/products?limit=0', {
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(invalidLimit.response.status, 400);
        assert.equal(invalidLimit.body.error.code, 'INVALID_QUERY');
      });

      await t.test('invitation resend validates state before email configuration', async () => {
        const unauthenticated = await request('/api/admin/invitations/inv_mc_invited/resend', {
          method: 'POST',
        });
        assert.equal(unauthenticated.response.status, 401);

        const asCustomer = await request('/api/admin/invitations/inv_mc_invited/resend', {
          method: 'POST',
          headers: { authorization: `Bearer ${customerToken}` },
        });
        assert.equal(asCustomer.response.status, 403);

        const missing = await request('/api/admin/invitations/inv_mc_missing/resend', {
          method: 'POST',
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(missing.response.status, 404);
        assert.equal(missing.body.error.code, 'INVITATION_NOT_FOUND');

        // An ACTIVE invitation is unresendable even though email is not
        // configured: the state check runs first.
        const activeResend = await request('/api/admin/invitations/inv_mc_active/resend', {
          method: 'POST',
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(activeResend.response.status, 409);
        assert.equal(activeResend.body.error.code, 'INVITATION_NOT_RESENDABLE');

        // A resendable invitation stops at the configuration gate without
        // rotating the token and without producing an audit record.
        const invitedResend = await request('/api/admin/invitations/inv_mc_invited/resend', {
          method: 'POST',
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(invitedResend.response.status, 503);
        assert.equal(invitedResend.body.error.code, 'EMAIL_NOT_CONFIGURED');

        const invitationAfter = await AdminInvitationModel.findById('inv_mc_invited')
          .select('+tokenHash +tokenExpiresAt')
          .lean();
        assert.ok(invitationAfter);
        assert.equal(invitationAfter.tokenHash, 'seeded-token-hash-aaaa');
        assert.ok(
          (invitationAfter.tokenExpiresAt as Date).getTime() > Date.now() + 30 * 60 * 1000,
          'the seeded expiry window must remain untouched',
        );

        const resentAudit = await AuditLogModel.findOne({
          action: 'admin.invitation.resent',
        }).lean();
        assert.equal(resentAudit, null);
      });

      await t.test('existing Manager flows are unaffected', async () => {
        const admins = await request('/api/admin/admins', {
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(admins.response.status, 200);
        const adminIds = (admins.body.admins as Array<{ id: string }>).map((admin) => admin.id);
        assert.ok(adminIds.includes(adminNoPermsId));
        assert.ok(adminIds.includes(adminCatalogId));

        const invitations = await request('/api/admin/invitations', {
          headers: { authorization: `Bearer ${managerToken}` },
        });
        assert.equal(invitations.response.status, 200);
        const invitationIds = (invitations.body.invitations as Array<{ id: string }>).map(
          (invitation) => invitation.id,
        );
        assert.ok(invitationIds.includes('inv_mc_active'));
        assert.ok(invitationIds.includes('inv_mc_invited'));

        const adminNoPerms2 = await request('/api/auth/admin/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'admin.no-perms.console@example.test',
            password: 'Console-Admin-Password-123!',
          }),
        });
        assert.equal(adminNoPerms2.response.status, 200);
      });
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
        AdminInvitationModel.deleteMany({}),
        AuditLogModel.deleteMany({}),
        mongoose.connection.collection('adminstates').deleteMany({}),
      ]);
      await mongoose.disconnect();
    }
  },
);
