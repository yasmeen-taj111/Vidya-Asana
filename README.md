# Vidya Asana (विद्या आसन) 📚✨

> **Smart Library Seat Allocation, Intelligent Reservation Matrix & Focus Productivity Platform**  
> *Built for CBC 2.0 Hackathon — Team CB049*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg?logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479a1.svg?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101.svg?logo=socket.io&logoColor=white)](https://socket.io/)
[![Vitest](https://img.shields.io/badge/Tests-67%20Passed-brightgreen.svg?logo=vitest&logoColor=white)](https://vitest.dev/)

---

## 📖 Executive Summary

Public libraries, municipal reading rooms, and university study halls frequently suffer from:
1. **Unfair Desk Hogging & Seat Abandonment:** Users leave belongings on desks for hours without studying.
2. **Double-Booking & Queue Disputes:** Physical paper registers or disconnected systems result in reservation collisions.
3. **No-Show Inefficiency:** Desks remain empty while other students are turned away.
4. **Lack of Discovery & Transparency:** Students have no easy way to find quiet reading spaces, check free vs. paid admissions, or locate amenities like power outlets and natural lighting.

**Vidya Asana** is a comprehensive, production-grade web platform solving these challenges through an ACID-compliant reservation engine, interactive timeline slot slider, tamper-proof QR check-in workflows, real-time waitlist automation, and built-in focus productivity tools.

---

## 🌟 Key Highlights & Features

### 1. Interactive Timeline Slot Slider & Dynamic Overlap Detection
- **Timeline Ruler:** 30-minute granularity, customizable duration (1 to 8 hours), with auto-disabled past hours for today.
- **Dynamic Overlap Alerting:** Evaluates user reservations in real-time as the slider is dragged. If a conflict occurs, the overlapping session is highlighted directly on the timeline ruler, an alert card details the existing booking, and the proceed button is safely locked.
- **Blackout Closure Overlays:** Administrative closures and sanitization intervals appear as clear blackout zones on the slider.

### 2. Intelligent Seat Selection & ACID Isolation
- **Visual Floor Grid:** Interactive seat maps displaying individual desks, computer workstations, quiet zones, and accessible seating.
- **Zero Double-Booking Guarantee:** Protected via MySQL transactions with row-level `FOR UPDATE` locking and composite unique constraints (`uq_seat_active_slot`).
- **Conflict Alternative Recommendations:** Preference-weighted scoring algorithm (considering natural light, quiet zones, and power outlets) recommending alternative desks when preferred seats are occupied.

### 3. Geocoding & Interactive Map Discovery
- **Mapbox Geocoding Integration:** Auto-resolves latitude and longitude coordinates from library street addresses and landmarks.
- **Interactive Pin Adjustment:** Administrators can drag entrance pins on interactive maps for exact GPS placement.
- **Public Discovery & Permanent Indicators:** Interactive maps and listings display permanent library name indicators, distance calculations, and transparent Free vs. Paid admission badges.

### 4. Digital QR Passes, Buffer Automation & No-Show Recovery
- **HMAC-SHA256 Signed Passes:** Cryptographically tamper-proof QR codes and human-readable codes (e.g., `VA-8F3K2`).
- **Arrival Confirmation & 15-Minute Buffer:** Automatic popup notifications allow users to confirm arrival during active slots. If a student fails to check in within the grace buffer, the system automatically cancels the seat.
- **Automated Waitlist Chain:** Released desks are automatically offered to the next waitlisted student with a 10-minute priority claiming window.

### 5. Multi-Role Management & Governance
- **Student Portal:** Discovery map, slot selection, interactive seat grid, digital QR pass, waitlists, focus room (Pomodoro timer), and streaks leaderboard.
- **Library Admin Portal:** Overview with live occupancy metrics, visual floor grid editor, unbookable intervals management, walk-in ticket issuer, QR pass camera scanner, and CSV/PDF report downloads.
- **Platform Owner Portal:** Network governance, library application reviews, physical verification controls, and cross-library metrics.
- **VidyaBot AI Assistant:** Context-aware study companion for navigation, study tips, and slot queries.

---

## 🏗️ System Architecture

```
Vidya-Asana/
├── contract/                       # API Contract v1.0 specifications & JSON fixtures
├── frontend/                       # Vite + React 18 + TypeScript + Tailwind CSS
│   ├── src/api/                    # Axios API clients with typed schemas
│   ├── src/components/             # SlotSlider, SeatGrid, QRScanner, LocationPicker, Map
│   ├── src/layouts/                # UserLayout, AdminLayout, OwnerLayout, PublicLayout
│   ├── src/pages/                  # Discover, Book, Study, Analytics, Overview, Register
│   ├── src/mocks/                  # Complete MSW mock layer (enables 100% offline demo mode)
│   ├── src/realtime/               # Socket.IO client hooks for live seat updates
│   └── src/tests/                  # 43 Vitest automated unit & integration tests
└── backend/                        # Node.js + Express + TypeScript + MySQL 8 + Socket.IO
    ├── db/                         # SQL schema (12 tables), init script, and seed data
    ├── src/config/                 # Database pool connection & environment config
    ├── src/middleware/             # JWT auth, rate limiting, and global error handling
    ├── src/modules/                # Auth, Discovery, Bookings, Waitlist, Admin, Owner, Study
    ├── src/realtime/               # Socket.IO server broadcasting live seat updates
    ├── src/jobs/                   # Node-cron scheduler for no-show releases & waitlist claims
    └── tests/                      # 24 Vitest automated unit tests
```

---

## 🚀 Quick Start Guide

### Option A: Instant Frontend Demo (100% Offline with MSW)
The frontend includes a built-in Mock Service Worker (MSW) layer containing all contract fixtures. You can evaluate the entire application immediately without configuring MySQL:

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open **`http://localhost:5173`** in your browser.
> **Tip:** Use the floating **Dev Panel** in the bottom-right corner to toggle between roles (`STUDENT`, `LIBRARY_ADMIN`, `SITE_OWNER`) and simulate seat conflicts with a single click.

---

### Option B: Full-Stack Setup (Frontend + Backend + MySQL)

#### Prerequisites
- Node.js 18+ & npm
- MySQL Server 8.0+ running on `localhost:3306`

#### 1. Backend Configuration
Create or verify `backend/.env`:
```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=vidya_asana
JWT_SECRET=super_secret_jwt_key_vidya_asana_2026
QR_HMAC_SECRET=super_secret_qr_hmac_key_2026
```

#### 2. Initialize Database & Seed Sample Data
```bash
cd backend
npm install

# Initialize MySQL tables (12 relational tables)
npm run db:init

# Seed initial libraries, floors, seats, slots, and demo accounts
npm run seed
```

#### 3. Start Backend Server
```bash
npm run dev
```
- **REST API Base:** `http://localhost:4000/api/v1`
- **Health Check:** `http://localhost:4000/api/v1/health`
- **WebSocket (Socket.IO):** `http://localhost:4000`

#### 4. Start Frontend Client
```bash
cd ../frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 👥 Demo Credentials

| Role | Email | Password | Primary Capabilities |
|---|---|---|---|
| **Site Owner** | `owner@vidyaasana.test` | `Owner@1234` | Approve/reject library registrations, network health |
| **Library Admin** | `admin@vidyaasana.test` | `Admin@1234` | Floor layout designer, unbookable slots, QR scanner, reports |
| **Student (Primary)** | `student@vidyaasana.test` | `Student@1234` | Slider booking, seat selection, QR pass, Pomodoro room |
| **Student (Secondary)**| `student2@vidyaasana.test` | `Student@1234` | Multi-user booking tests & real-time waitlist claiming |
| **Pending Admin** | `pending@vidyaasana.test` | `Admin@1234` | Verifies pending approval status guard screen |

---

## 🧪 Automated Testing & Quality Assurance

Vidya Asana maintains automated test coverage across both client and server:

```bash
# Run Frontend Tests (43 tests)
cd frontend
npm test

# Run Backend Tests (24 tests)
cd backend
npm test
```

### Verified Test Suites (67 Passing Tests)
- **Frontend (43 tests):**
  - Error code mappings & UI notification triggers.
  - Interactive timeline slot interval calculation & negative booking validation.
  - Multi-criteria recommendation scoring & preference matching.
  - Floor grid cell layout parsing and status transitions.
- **Backend (24 tests):**
  - Cryptographic HMAC-SHA256 QR token verification and tamper resistance.
  - Haversine geographical distance calculations for nearby library searches.
  - ACID transaction isolation and duplicate key prevention.
  - Waitlist position queue sorting and claim expiry logic.

---

## 📡 REST API Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/health` | Service health & uptime status | Public |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue JWT | Public |
| `POST` | `/api/v1/auth/register` | Register new student account | Public |
| `GET` | `/api/v1/libraries` | Discover libraries with geo-filtering | Public |
| `GET` | `/api/v1/libraries/:id/grid` | Live floor seat matrix for date & slot | Public |
| `POST` | `/api/v1/bookings` | Create atomic seat reservation | Student |
| `GET` | `/api/v1/bookings/my` | Retrieve active & past bookings | Student |
| `POST` | `/api/v1/waitlist/join` | Join waitlist queue for occupied seat | Student |
| `POST` | `/api/v1/admin/scan-qr` | Scan & verify attendee QR entry pass | Library Admin |
| `PATCH`| `/api/v1/admin/bookings/:id`| Update booking status (Check-in, No-show) | Library Admin |
| `POST` | `/api/v1/owner/libraries/:id/approve` | Approve library registration | Site Owner |

---

## 🛡️ Security & Reliability Measures

- **ACID Transactions:** MySQL transactions with `FOR UPDATE` locks prevent concurrent booking collisions.
- **Idempotency Safeguards:** Unique reservation idempotency keys prevent duplicate charges or multi-clicks.
- **Tamper-Proof QR Codes:** HMAC-SHA256 cryptographic signatures prevent forged passes.
- **Rate Limiting:** IP-based and user-based sliding-window rate limiters defend against automated scraping and booking bots.
- **Grace Period Scheduling:** Node-cron background jobs handle no-show releases and waitlist notifications reliably.

---

## 📜 Team & Hackathon Information

- **Event:** CBC 2.0 Hackathon
- **Team ID:** CB049
- **Project:** Vidya Asana (विद्या आसन)
- **License:** MIT License
