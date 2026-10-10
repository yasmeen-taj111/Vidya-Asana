# Vidya Asana (विद्या आसन) 📚🪑

> **Smart Library Seat Allocation & Focus Platform**  
> *Built for CBC 2.0 Hackathon (Team CB049)*

---

## Overview

**Vidya Asana** is a comprehensive, production-ready library seat allocation and study productivity system designed for modern campuses and public reading rooms. It solves physical queues, unfair desk hogging, and no-shows with:
- **Visual Floor Grid Editor & Booking Matrix** (desks, computer terminals, quiet pods, group pods)
- **Zero Double-Booking Guarantee** (MySQL generated column `active_key` constraint)
- **Intelligent Conflict Alternative Recommendations** (scored matching on natural light, quiet zones, outlets)
- **HMAC-SHA256 Digital QR Passes & Scanner** with 30-minute grace window enforcement
- **Real-Time FIFO Waitlist Queue** with automatic 10-minute priority claiming window
- **Integrated Pomodoro & Study Room** with daily streaks, focus consistency metrics, and leaderboards
- **Administrator Analytics Hub** with live occupancy charts, walk-in management, and PDF/CSV audits
- **AsanaBot AI Study Assistant** with contextual quick actions

---

## Architecture

```
Vidya-Asana/
├── contract/             # API Contract (v1.0) & data fixtures
├── frontend/             # Vite + React 18 + TypeScript + Tailwind CSS
│   ├── src/mocks/        # Full MSW mock layer (runs 100% offline without backend)
│   ├── src/components/   # SeatGrid, GridEditor, QRScanner, ChatWidget, Analytics
│   └── src/pages/        # Public, Student, Admin, and Owner portals
└── backend/              # Node.js + Express + TypeScript + MySQL 8 + Socket.IO
    ├── db/               # MySQL schema (12 tables) + Seeder + Init scripts
    ├── src/modules/      # Auth, Discovery, Bookings, Waitlist, Users, Study, Admin, Owner
    ├── src/realtime/     # Socket.IO live seat & waitlist broadcasts
    └── src/jobs/         # Node-cron scheduler for no-show grace window & waitlist automation
```

---

## Quick Start

### 1. Frontend (Offline Demo Mode with Mock Service Worker)
The frontend is pre-configured with MSW mock handlers matching the API contract fixtures. You can run and evaluate all roles immediately without setting up MySQL:

```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

- Toggle between test accounts in the **Dev Panel** (bottom-right floating badge).
- Test seat conflict resolution anytime by enabling **"Simulate Seat Conflict"** in the Dev Panel!

---

### 2. Backend (Live API & Realtime Server)

#### Prerequisites
- Node.js 18+
- MySQL 8.0+ running on `localhost:3306`

#### Configuration
Verify `backend/.env` (configured for default local MySQL):
```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=vidya_asana
```

#### Database Setup & Seeding
```bash
cd backend
npm install
npm run db:init   # Creates database and all 12 tables from schema.sql
npm run seed      # Seeds Central Study Hub, floors, grid cells, and test users
```

#### Start Server
```bash
# Development (with hot-reload)
npm run dev

# Production
npm run build
npm start
```

Backend will be available at:
- **REST API Base:** `http://localhost:4000/api/v1`
- **Health Check:** `http://localhost:4000/api/v1/health`
- **Socket.IO:** `ws://localhost:4000`

---

## Demo Test Accounts

| Role | Email | Password | Features Accessible |
|---|---|---|---|
| **SITE_OWNER** | `owner@vidyaasana.test` | `Owner@1234` | Approve/reject library registrations, system stats |
| **LIBRARY_ADMIN** | `admin@vidyaasana.test` | `Admin@1234` | Visual floor grid designer, QR check-in scanner, walk-ins, PDF/CSV reports |
| **PENDING ADMIN** | `pending@vidyaasana.test` | `Admin@1234` | Tests the `LIBRARY_NOT_APPROVED` guard screen |
| **STUDENT** | `student@vidyaasana.test` | `Student@1234` | Desk discovery, booking, QR pass, waitlist, Pomodoro timer, leaderboard |
| **STUDENT 2** | `student2@vidyaasana.test` | `Student@1234` | Multi-user booking & waitlist priority testing |

---

## Running Automated Tests

### Frontend Unit Tests (4 passing)
```bash
cd frontend
npm test
```
*Verifies error code mapper, floor grid layout generator, and slot overlap interval logic.*

### Backend Unit Tests (5 passing)
```bash
cd backend
npm test
```
*Verifies UUID & booking code generators, tamper-proof HMAC-SHA256 QR tokens, Haversine geographic distance calculations, seat recommendation scoring algorithms, and library proximity weights.*

---

## Key Features Demonstrated

1. **Conflict Resolution & Alternative Desks**
   - When a desk is taken or conflict toggle is stimulated, the system prevents double-booking and returns up to 5 scored alternatives based on student preferences (window light, quiet zone, AC, power sockets).
2. **Digital QR Pass with Grace Window**
   - Every booking produces a signed HMAC QR token valid for the slot duration.
   - Built-in reminder cron and "Confirm Arrival (+30 min)" button prevent premature seat release.
3. **Automated Waitlist Chain**
   - When a booking expires (no-show) or is cancelled by admin/user, the next waitlisted student is notified in real time with a 10-minute priority claiming window.
4. **Visual Floor Grid Editor**
   - Administrators can design floor layouts in seconds with an interactive grid builder (place doors, windows, aisles, and configure individual, computer, group, or accessible desks).
5. **Study Focus & Gamification**
   - Integrated Pomodoro and stopwatch timers sync focus hours to user dashboard streaks and global/library leaderboards.
