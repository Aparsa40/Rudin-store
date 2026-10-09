# Backend setup (MongoDB Atlas)

This directory contains the Express API. The React/Vite frontend and API run as separate processes during local development.

## Configure MongoDB Atlas

1. In Atlas, open **Database Access** and create a database user if one does not already exist.
2. Under **Network Access**, allow your current public IP address. Avoid opening access to every IP address except as a temporary, deliberate troubleshooting step.
3. Open your cluster and choose **Connect → Drivers**. Copy the Node.js connection string provided by Atlas.
4. In the repository root, copy `.env.example` to `.env`.
5. Replace the placeholders in `MONGODB_URI` with the Atlas URI, username, password, and cluster host. URL-encode special characters in credentials as required by MongoDB URI syntax.
6. Never commit `.env` or share the real URI/password.

## Start and verify the API

Run from the repository root:

```powershell
npm run server:dev
```

The API waits for MongoDB to connect before it accepts requests. If the URI is missing or Atlas rejects the connection, startup fails instead of reporting a false healthy state.

```powershell
curl.exe http://localhost:4000/api/health
```

The health route pings MongoDB and returns HTTP 503 when the database is disconnected or unavailable.

## Product catalog API

All catalog routes return only products with `status: "PUBLISHED"`. Product IDs remain compatible with the existing frontend's string IDs.

### `GET /api/products`

Supported query parameters:

- `page` (integer, default 1)
- `limit` (integer, default 12, maximum 100)
- `categoryId`, `vendorId`
- `q` (searches title, description, short description, brand, and tags)
- `minPrice`, `maxPrice`, `minRating`
- `inStockOnly=true|false`, `onSaleOnly=true|false`
- `sortBy=featured|price-asc|price-desc|rating|newest`

Example response:

```json
{
  "products": [],
  "pagination": { "page": 1, "limit": 12, "total": 0, "totalPages": 0 }
}
```

Invalid query values return HTTP 400 with a structured error. Page size is capped at 100.

### `GET /api/products/:identifier`

Looks up a published product by its string ID or slug. A missing product returns HTTP 404.

## Current scope and safety

The product model and read-only catalog endpoints are the first marketplace API slice. Product creation/update, vendor authorization, categories/vendors APIs, cart, orders, authentication, stock reservation, payment integration, and review persistence are not implemented by this slice. The frontend still uses mock data until its product service is explicitly connected to these endpoints. Do not store real customer or payment data until those controls are implemented and tested.
