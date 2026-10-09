# Backend setup (MongoDB Atlas)

This directory contains the Express API. The React/Vite frontend and API run as separate processes during local development.

## 1. Configure MongoDB Atlas

1. In Atlas, open **Database & Network Access** and create a database user if one does not already exist.
2. Under **Network Access**, allow your current public IP address. Avoid opening access to every IP address except as a temporary, deliberate troubleshooting step.
3. Open your cluster and choose **Connect → Drivers**. Copy the Node.js connection string provided by Atlas.
4. In the repository root, copy `.env.example` to `.env`.
5. Replace the placeholders in `MONGODB_URI` with the Atlas URI, username, password, cluster host, and database name. URL-encode special characters in the username/password as required by MongoDB URI syntax.
6. Never commit `.env` or send the real URI/password in chat.

Example local settings (use the real Atlas URI only in your ignored `.env` file):

```env
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority"
PORT=4000
NODE_ENV=development
WEB_URL="http://localhost:3000"
API_URL="http://localhost:4000"
```

## 2. Start the API

Install dependencies from the repository root if needed, then run:

```powershell
npm run server:dev
```

The API waits for MongoDB to connect before it starts accepting requests. If the URI is missing or Atlas rejects the connection, the startup process reports the error and exits rather than pretending the API is ready.

## 3. Verify the live database connection

Open:

`http://localhost:4000/api/health`

A healthy response is:

```json
{
  "status": "ok",
  "service": "Rudin-Store API",
  "database": "connected"
}
```

The health endpoint runs a MongoDB ping. It returns HTTP 503 if the database is disconnected or unavailable.

## Current scope

This is the connection/bootstrap foundation, not yet the complete marketplace API. Product, category, vendor, cart, order, authentication, authorization, validation, and database indexes must be implemented as separate modules and tested before production use. Do not store real customer or payment data until those modules and security controls are in place.
