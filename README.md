# Club Portal — Member (Student) App

React + Vite + TypeScript. Deploy the `firebase-backend/` project first.

## Deploying

This is a static Vite build (`npm run build` → `dist/`) — deploy it to Vercel, Netlify, Firebase Hosting, or any static host. `vercel.json` and `public/_redirects` are already included for Vercel/Netlify so client-side routes (e.g. `/events/abc123`) don't 404 on refresh.

**Whichever domain you deploy to, add it to Firebase Console → Authentication → Settings → Authorized domains** — sign-in silently fails on any origin not in that list. `localhost` is there by default; your production domain (e.g. `my-club-student.vercel.app`) is not, until you add it.

## Setup

```bash
npm install
cp .env.example .env   # fill in Firebase web config (Console -> Project Settings -> Your apps)
npm run dev
```

## Build

```bash
npm run build   # outputs to dist/
```
Deploy `dist/` to Firebase Hosting, Vercel, Netlify, or any static host.

## Pages

- `/login` — email/password sign in
- `/` — dashboard: attendance rate, upcoming meetings/events, announcements
- `/meetings` — all meetings (view only)
- `/attendance` — own meeting attendance history + stats (view only, cannot edit)
- `/events` — published club events with attendance status
- `/events/:eventId` — event details and personal attendance record for the logged-in student


All writes go through Cloud Functions (see `firebase-backend/functions/src`) —
this app never writes to Firestore directly.
