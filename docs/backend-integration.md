# Backend Integration Contract

This document explains how to transition the Rudin Store frontend from the current mock implementation to a production backend (e.g., Node.js + Express + PostgreSQL, or similar).

## Current Architecture

Currently, the UI components request data through service abstractions in `src/services/`.

**Flow:**
`UI Component` → calls `productsService.getProductById(id)` → Returns `Promise<Product>` (resolved from `mockData.ts`).

## Future Architecture

When the API is ready, the service implementations should be updated to make actual HTTP requests.

**Flow:**
`UI Component` → calls `productsService.getProductById(id)` → Makes HTTP `GET /api/products/:id` → Returns `Promise<Product>` from the database.

## Steps to Integrate

1. **Keep the UI Components Unchanged**: Do not modify the React components in `src/pages` or `src/components`. They are already expecting Promises that resolve to the correct domain types.
2. **Setup API Client**: Create a base API client (e.g., using `axios` or native `fetch`) that handles authentication headers and base URLs.
3. **Rewrite Services**:
   Open `src/services/products.service.ts` and replace the mock logic with real HTTP calls.
   
   *Example before (Mock):*
   ```typescript
   export const productsService = {
     getProducts: async (): Promise<Product[]> => {
       await new Promise(resolve => setTimeout(resolve, 500));
       return mockProducts;
     }
   }
   ```
   
   *Example after (Real API):*
   ```typescript
   export const productsService = {
     getProducts: async (): Promise<Product[]> => {
       const response = await fetch('/api/products');
       if (!response.ok) throw new Error('Failed to fetch products');
       return response.json();
     }
   }
   ```

4. **Update Authentication**: 
   The `useAuthStore` in `src/store/authStore.ts` currently handles mock authentication. You will need to wire this up to your real JWT/Session logic. Replace the `setTimeout` mock login with an actual API call to `/api/auth/login`.

5. **Multi-Vendor Consideration**:
   The frontend is already designed to display a multi-vendor cart and vendor-specific storefronts. Ensure your backend returns the nested relations correctly (e.g., `product.vendorId` and resolving the `Vendor` object).
