# Vidya Asana (विद्या आसन) 

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

## About the Project

**Vidya Asana** is a smart library seat reservation and study productivity platform designed to simplify study-space discovery, eliminate booking conflicts, and improve library resource utilization.

Students can discover nearby libraries, select seats based on their preferences, reserve study spaces for specific time slots, and track their productivity. Library administrators can manage floor layouts, monitor occupancy, handle walk-ins, and automate reservation workflows.

The platform combines intelligent seat matching, secure QR-based check-ins, real-time availability, automated waitlists, and AI-powered assistance in one application.

## Key Features

### Student Dashboard
- Discover nearby libraries and explore their facilities.
- Filter seats by type, availability, duration, and preferences.
- View interactive floor grids and reserve suitable seats.
- Receive QR-based booking confirmations.
- Cancel reservations and join waitlists.
- Receive reservation reminders and status notifications.
- Use Pomodoro timers, focus sessions, streaks, and leaderboards.
- Interact with AsanaBot for library and study assistance.

### Library Administrator Dashboard
- Create and manage library floors and seating arrangements.
- Automatically generate seat grids and customize individual seats.
- Configure individual desks, computer-enabled seats, group tables, and accessible spaces.
- Manage operating hours, time slots, pricing, and facilities.
- Scan QR passes and manage student check-ins.
- Handle walk-in bookings and release occupied seats when appropriate.
- Monitor occupancy, reservations, and utilization analytics.
- Export reports in PDF and CSV formats.

### Website Owner Dashboard
- Review library registration requests.
- Approve or reject library applications.
- Notify library administrators of approval decisions.
- Monitor registered libraries and platform-level statistics.

### Intelligent Reservation Engine
- Match seat requirements with available spaces.
- Recommend alternatives based on natural light, quiet zones, AC, power outlets, and other preferences.
- Prevent overlapping reservations.
- Handle simultaneous booking attempts safely.
- Release eligible seats after cancellation or no-show.
- Notify eligible students when waitlisted seats become available.

### Security and Real-Time Features
- JWT-based authentication and role-based access.
- HMAC-SHA256-signed QR passes.
- Transactional reservation processing.
- Rate limiting for sensitive endpoints.
- Socket.IO updates for live seat availability and waitlist events.
- Scheduled background jobs for reservation expiry and waitlist processing.

---

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | MySQL 8 |
| Real-time Communication | Socket.IO |
| Mock API | Mock Service Worker (MSW) |
| Background Jobs | node-cron |
| Authentication | JSON Web Tokens (JWT) |
| QR Security | HMAC-SHA256 |
| Maps | Leaflet.js |
| Testing | Vitest and project-specific unit tests |
| Reporting | PDF and CSV export |

---

## Project Structure

```text
Vidya-Asana/
├── contract/                  # API contracts and fixtures
├── frontend/
│   └── src/
│       ├── mocks/             # MSW mock handlers
│       ├── components/        # Reusable UI components
│       └── pages/             # Application dashboards
└── backend/
    ├── db/                    # Schema, initialization and seeding
    └── src/
        ├── modules/           # Auth, discovery, bookings, waitlist,
        │                      # study, admin and owner modules
        ├── realtime/          # Socket.IO events
        └── jobs/              # Scheduled background jobs
```

---

## Getting Started

### Prerequisites

Install the following before running the application:

- Node.js 18 or later
- npm
- MySQL 8.0 or later for backend mode
- Git

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd Vidya-Asana
```

Replace the repository URL with your actual GitHub repository URL.

### 2. Configure the Backend

Create `backend/.env` and configure the required environment variables.

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=vidya_asana

JWT_SECRET=replace_with_a_secure_random_secret
QR_HMAC_SECRET=replace_with_another_secure_random_secret
```

**Important:** The variable names above must match those read by your backend code. If the application uses separate access-token and refresh-token secrets, configure those instead of assuming `JWT_SECRET` is sufficient.

Generate strong secrets locally with:

```bash
openssl rand -hex 32
```

Keep real credentials in `.env`. Never commit your actual secrets to GitHub.

### 3. Initialize the Database

Ensure MySQL is running, then execute:

```bash
cd backend
npm install
npm run db:init
npm run seed
```

These commands initialize the database schema and populate sample libraries, floors, seats, time slots, and demonstration accounts.

The database initialization and seeding scripts must exist in the backend package configuration for these commands to work.

### 4. Start the Backend

From the `backend` directory:

```bash
npm run dev
```

The backend is expected to expose the following endpoints:

| Service | URL |
|---|---|
| REST API | `http://localhost:4000/api/v1` |
| Health Check | `http://localhost:4000/api/v1/health` |
| Socket.IO | `http://localhost:4000` |

### 5. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

If mock mode is enabled, you can explore the frontend using the MSW handlers without starting the backend. Use the Dev Panel, if available, to switch demo accounts and simulate seat conflicts.

---

## Demo Credentials

The following credentials are intended for local demonstrations when the database seed or mock configuration supports them.

| Role | Email | Password |
|---|---|---|
| Site Owner | `owner@vidyaasana.test` | `Owner@1234` |
| Library Admin | `admin@vidyaasana.test` | `Admin@1234` |
| Student | `student@vidyaasana.test` | `Student@1234` |
| Student 2 | `student2@vidyaasana.test` | `Student@1234` |
| Pending Admin | `pending@vidyaasana.test` | `Admin@1234` |

**Security note:** These are demonstration credentials only. Never use them in production or expose real user credentials in a public repository.

---

## Automated Testing

Run the frontend tests:

```bash
cd frontend
npm test
```

Run the backend tests:

```bash
cd backend
npm test
```

### Test Coverage

The project reports **67 passing tests**, comprising 43 frontend tests and 24 backend tests. Re-run both suites before relying on this count.

**Frontend test areas**
- Error-code mapping and UI notifications.
- Time-slot interval calculations.
- Invalid booking validation.
- Seat recommendation scoring.
- Floor-grid layout and seat-status transitions.

**Backend test areas**
- HMAC-SHA256 QR token verification.
- Geographic distance calculations.
- Reservation conflict handling.
- Duplicate-booking prevention.
- Waitlist ordering and claim-expiry logic.

Actual transaction isolation and concurrency guarantees should also be validated with integration tests against the configured MySQL database.

---

## REST API Overview

All paths below are relative to `/api/v1`.

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/health` | Health and uptime status | Public |
| `POST` | `/auth/login` | Authenticate a user | Public |
| `POST` | `/auth/register` | Register a student | Public |
| `GET` | `/libraries` | Discover libraries | Public |
| `GET` | `/libraries/:id/grid` | Retrieve a library seat grid | Public |
| `POST` | `/bookings` | Create a reservation | Student |
| `GET` | `/bookings/my` | Retrieve personal bookings | Student |
| `POST` | `/waitlist/join` | Join a waitlist | Student |
| `POST` | `/admin/scan-qr` | Validate a check-in QR pass | Library Admin |
| `PATCH` | `/admin/bookings/:id` | Update booking status | Library Admin |
| `POST` | `/owner/libraries/:id/approve` | Approve a library | Site Owner |

**Note:** Confirm these routes and their authorization rules against the actual backend implementation. This table documents the intended API surface, not a substitute for an API specification.

---

## Security and Reliability

- **Transactional bookings:** Use database transactions to keep reservation changes consistent.
- **Concurrency protection:** Enforce seat availability and overlapping-booking rules at the database level where possible.
- **Idempotency:** Prevent repeated booking requests from creating duplicate reservations.
- **QR verification:** Verify signed QR payloads on the server and reject expired or tampered tokens.
- **Role-based access:** Restrict administrative operations to authorized roles.
- **Rate limiting:** Protect authentication, booking, and QR-validation endpoints.
- **Background processing:** Handle configured no-show deadlines and waitlist notifications.
- **Secret management:** Load credentials from environment variables and exclude `.env` from version control.

---

## Core Reservation Workflow

1. A student searches for a library and specifies their seat requirements.
2. The system checks availability for the requested date and duration.
3. Suitable seats are displayed, with alternatives when the preferred option is unavailable.
4. The student confirms the reservation.
5. The backend validates the request and prevents conflicting bookings.
6. A confirmation and QR pass are issued after the reservation is successfully committed.
7. Check-in, cancellation, completion, and no-show processing update seat availability.
8. Eligible waitlisted students are notified when a seat becomes available.

---

## Future Enhancements

- More advanced library recommendation algorithms.
- Enhanced utilization analytics and demand forecasting.
- Expanded notification channels.
- Improved accessibility and floor-plan editing.
- Additional study insights and personalized productivity recommendations.

---

## Team and Hackathon Information

- **Project:** Vidya Asana (विद्या आसन)
- **Event:** CBC 2.0 Hackathon
- **Team ID:** CB049
- **Team Members:** Shamanth P, Nabeel Shaikh, Shravya Hegde,Yasmeen Taj

---

### Vidya Asana

*Find your seat. Focus on your future.*
