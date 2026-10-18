# Branding

## Asset Map

| Purpose          | Asset                               |
| ---------------- | ----------------------------------- |
| Header           | `/branding/header-logo.svg`         |
| Footer           | `/branding/footer-logo.svg`         |
| Social preview   | `/branding/og-image.svg`            |
| Browser icon     | `/favicon.ico`                      |
| Small favicon    | `/favicon-16x16.png`                |
| Standard favicon | `/favicon-32x32.png`                |
| Apple touch icon | `/apple-touch-icon.png`             |
| Android/PWA icon | `/icons/android-chrome-192x192.png` |
| Android/PWA icon | `/icons/android-chrome-512x512.png` |
| Web manifest     | `/site.webmanifest`                 |

## Usage Rules

- Use the dedicated header logo in the site header and mobile navigation.
- Use the dedicated footer logo in the site footer.
- Keep favicon and PWA assets under `public/` so Vite serves them from the site root.
- Keep manifest icon paths aligned with their actual `public/icons/` location.
- Use `og-image.svg` as the canonical social-preview artwork for the current frontend.
- Product images belong under `public/images/` only while the catalog remains small enough for repository-hosted demo assets.
- Product media should move to object storage/CDN later when catalog size, image weight, cache strategy, or deployment limits make repository storage inappropriate.

## Product Media Storage Boundary

The `public/images/` directory remains intended for lightweight local/demo assets. Seller product media is uploaded to Cloudinary and is not committed to Git or stored as binary data in MongoDB.

The authenticated API issues a signed upload payload through `POST /api/uploads/sign`. The browser then uploads directly to Cloudinary, so large files do not have to pass through the Express process. The API secret is read only on the server and is never exposed to the browser. Signatures are scoped to a user-specific `rudin-store/products/<user-id>` folder and allowed formats.

Supported product media in the seller product form:

- Images: JPEG, PNG, WebP, and GIF (browser-side limit: 20 MB per file)
- Videos: MP4, WebM, and MOV (browser-side limit: 100 MB per file)
- Up to 20 images and 10 videos are accepted by product payload validation.

The browser limits are a usability guard, not a substitute for Cloudinary account controls. Configure Cloudinary upload/security settings and monitor usage before production rollout. Uploaded assets are not automatically deleted when a user removes them from the unsaved product form; orphan cleanup is a separate lifecycle task.

MongoDB stores media metadata, not the file bytes:

- Cloudinary public ID and secure URL
- image alt text, primary-image flag, and display order
- video format, byte size, optional duration, and display order

This keeps Git focused on source code and lightweight branding assets.
