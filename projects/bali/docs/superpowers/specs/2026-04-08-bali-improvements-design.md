# Bali Trip Planner — Improvements Design

**Date:** 2026-04-08
**Status:** Approved

## Overview

Improve the Bali 2026 trip planner with password protection, better editing UX, and photo/link support on cards.

## 1. Authentication

### Password Gate
- Server-side middleware on all `/bali/*` routes (except `/bali/login`)
- `GET /bali/login` — serves login page (password field only, no username)
- `POST /bali/login` — validates password against `BALI_PASSWORD` env var
- On success: sets signed cookie `bali_auth` with 90-day expiry
- On failure: re-renders login page with error message
- All other `/bali/*` routes check cookie — redirect to `/bali/login` if missing/invalid

### Implementation Details
- Password: `matheo2025` (set as `BALI_PASSWORD` env var on Railway)
- Cookie signed with `COOKIE_SECRET` env var
- Password compared using `bcrypt` (store bcrypt hash of password, compare on login)
- Login page matches existing dark theme — centered card with password input and "Logg inn" button
- No logout button needed (cookie expires after 90 days)

### Dependencies
- `bcrypt` — password hashing
- `cookie-parser` — signed cookie parsing

## 2. Editing UX

### Click-to-Edit Fields
- Replace inline `<input>` elements with display-mode text
- On click: text becomes an editable input/textarea with visible border
- Auto-size: inputs grow with content, textareas auto-grow vertically
- Save on blur or Enter key, cancel on Escape
- Visual states: display (plain text) → hover (subtle underline hint) → editing (bordered input)

### Drag-to-Reorder
- Library: SortableJS via CDN (~3kb gzipped, zero dependencies)
- Draggable items: stops, hotels, activities, budget rows
- Each card gets a drag handle (grip icon on the left side)
- Visual feedback: card lifts with shadow on drag, drop indicator shows target position
- After drop: DATA array is reordered, auto-save triggers

### General UX
- Minimum 44px tap targets on mobile
- Delete action moves from visible "x" to a "..." overflow menu on each card
- Grab cursor on drag handle area

## 3. Photos & Links

### R2 Storage Setup
- Cloudflare R2 bucket: `bali-photos`
- Server endpoint: `POST /bali/api/upload`
  - Accepts multipart form data (image file)
  - Validates: max 10MB, accepts jpg/png/webp only
  - Streams to R2, returns `{ url: "https://..." }`
  - Requires auth cookie (same middleware)
- Server endpoint: `DELETE /bali/api/upload?key=<key>`
  - Deletes photo from R2
  - Requires auth cookie

### R2 Environment Variables (Railway)
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME` (default: `bali-photos`)
- Public access via R2 public bucket (enable public access in Cloudflare dashboard, photos served directly via `https://pub-<hash>.r2.dev/<key>`)

### Data Model Changes
Each stop, hotel, and activity object gains two new fields:
```json
{
  "photos": ["https://r2-url/photo1.jpg", "https://r2-url/photo2.webp"],
  "links": [{"label": "Booking", "url": "https://booking.com/..."}]
}
```
Stored in existing JSONB column — backward compatible (missing fields default to `[]`).

### Photo UI
- Photo strip at bottom of each card: horizontal row of thumbnails (80x80, object-fit cover)
- Click thumbnail → fullscreen lightbox overlay (dark bg, click/Escape to close)
- "+" button at end of strip opens file picker
- Upload shows progress bar on the thumbnail placeholder
- Hover on thumbnail shows "x" delete button (confirms before deleting from R2)
- Drag-and-drop: can drop image files onto a card to upload

### Links UI
- Links section below photo strip
- Each link rendered as a clickable pill: `[label → url]`
- "+" button to add link: inline form with label + URL fields
- Hover shows "x" to delete link

### New Dependency
- `@aws-sdk/client-s3` — R2 uses S3-compatible API
- `multer` — multipart file upload parsing

## 4. Misc Fixes

### Port
- Change default from `3000` to `4820`
- Keeps `process.env.PORT` override (Railway sets this automatically)

### CORS
- Remove `Access-Control-Allow-Origin: *`
- Restrict to Railway domain only
- Cookie `SameSite: lax` for auth protection

## File Changes Summary

| File | Changes |
|------|---------|
| `server.js` | Auth middleware, login routes, upload endpoint, port fix, CORS fix |
| `public/index.html` | Click-to-edit, SortableJS, photo/link UI, lightbox, drag-drop upload |
| `public/login.html` | New file — login page |
| `package.json` | Add bcrypt, cookie-parser, @aws-sdk/client-s3, multer |

## Environment Variables (Railway)

| Variable | Value |
|----------|-------|
| `BALI_PASSWORD` | `matheo2025` |
| `COOKIE_SECRET` | Random 32+ char string |
| `R2_ACCOUNT_ID` | From Cloudflare dashboard |
| `R2_ACCESS_KEY_ID` | From R2 API tokens |
| `R2_SECRET_ACCESS_KEY` | From R2 API tokens |
| `R2_BUCKET_NAME` | `bali-photos` |
