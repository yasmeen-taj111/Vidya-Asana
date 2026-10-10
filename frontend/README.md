# Vidya Asana — Frontend

Production web client for **Vidya Asana**, a modern library seat allocation, conflict recovery, and study management platform.

Built with **React 18 + TypeScript + Vite + Tailwind CSS**, React Router v6, TanStack Query, Zustand, Leaflet.js, and Recharts.

---

## Quick Start (Mock Mode Default)

The frontend is equipped with a high-fidelity **MSW (Mock Service Worker)** layer mirroring `contract/API_CONTRACT.md` and seed fixtures. You can run and demo the entire application without needing MySQL or a running backend server.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173).

---

## Switching to Real Backend

When the Node.js Express backend is running on `http://localhost:4000`:

1. Open `.env` (or set environment variables):
   ```env
   VITE_API_URL=http://localhost:4000/api/v1
   VITE_SOCKET_URL=http://localhost:4000
   VITE_USE_MOCKS=false
   ```
2. Restart the Vite dev server (`npm run dev`).
3. Switching requires **zero code changes**.

---

## Seed Test Accounts (Preloaded in Mocks & Backend Seed)

| Role | Email | Password | Dashboard URL |
|---|---|---|---|
| **Site Owner** | `owner@vidyaasana.test` | `Owner@1234` | `/owner` |
| **Library Admin (Approved)** | `admin@vidyaasana.test` | `Admin@1234` | `/admin` |
| **Library Admin (Pending)** | `pending@vidyaasana.test` | `Admin@1234` | `/admin` (Gated) |
| **Student (User)** | `student@vidyaasana.test` | `Student@1234` | `/app` |

*Tip: Use the floating **Dev / Demo Panel** at the bottom-left of the screen to switch roles with a single click or simulate 409 conflict errors.*

---

## Scripts

- `npm run dev`: Launch Vite dev server on port `5173`.
- `npm run build`: Type-check with `tsc` and produce optimized bundle in `dist/`.
- `npm test`: Run unit tests via `vitest`.

---

## Demo Walkthrough

See [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) for a click-by-click judging demonstration guide.
