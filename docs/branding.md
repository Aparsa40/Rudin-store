# Branding

## Asset Map

| Purpose | Asset |
|---|---|
| Header | `/branding/header-logo.svg` |
| Footer | `/branding/footer-logo.svg` |
| Social preview | `/branding/og-image.svg` |
| Browser icon | `/favicon.ico` |
| Small favicon | `/favicon-16x16.png` |
| Standard favicon | `/favicon-32x32.png` |
| Apple touch icon | `/apple-touch-icon.png` |
| Android/PWA icon | `/icons/android-chrome-192x192.png` |
| Android/PWA icon | `/icons/android-chrome-512x512.png` |
| Web manifest | `/site.webmanifest` |

## Usage Rules

- Use the dedicated header logo in the site header and mobile navigation.
- Use the dedicated footer logo in the site footer.
- Keep favicon and PWA assets under `public/` so Vite serves them from the site root.
- Keep manifest icon paths aligned with their actual `public/icons/` location.
- Use `og-image.svg` as the canonical social-preview artwork for the current frontend.
- Product images belong under `public/images/` only while the catalog remains small enough for repository-hosted demo assets.
- Product media should move to object storage/CDN later when catalog size, image weight, cache strategy, or deployment limits make repository storage inappropriate.

## Product Image Storage Boundary

The current `public/images/` directory is intended for lightweight local/demo product assets.

When the catalog grows, product media should be externalized to an object-storage or CDN service. The application should then store stable media URLs rather than large binary assets in Git.

The future backend should own product media metadata such as:

- canonical URL
- thumbnail URL
- alt text
- width/height
- media type
- sort order
- optional provider/object key

This keeps Git focused on source code and lightweight branding assets.
