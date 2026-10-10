# Vidya Asana — Library Seat Reservation Platform
**PRD v1.0** · Team CB049 · CBC 2.0 Design Round · Domain: Software & Web Development

---

## 1. Problem
Libraries have limited study seats with different characteristics (individual desks, group tables, accessible spaces, computer-enabled seats). Students waste time finding a suitable seat, seats sit idle when people don't show up, and library owners have no visibility into utilization.

## 2. Goal
A web platform that allocates study seats by user requirement, availability and reservation time; prevents double booking; recovers no-show seats; and gives library admins utilization insight.

## 3. Users and roles
| Role | Who | Core jobs |
|---|---|---|
| **Site Owner** (platform admin) | Runs Vidya Asana | Approve/reject library listings |
| **Library Admin** | Manages one library | Configure seats, grid, slots, pricing; check-in via QR; walk-ins; analytics |
| **User** (student) | Books seats | Discover library, get recommendations, book, check in, study, track focus |

## 4. Scope

### 4.1 Core (MUST — demo-critical)
| # | Feature | Acceptance criteria |
|---|---|---|
| C1 | Auth (3 roles) | Register/login/logout; JWT + refresh; role-based routing |
| C2 | Library registration & approval | Library admin registers library → PENDING. Site owner approves/rejects. SMTP email sent to library admin on decision |
| C3 | Seat & facility management | Admin sets counts for INDIVIDUAL / GROUP / ACCESSIBLE / COMPUTER seats; lockers, CCTV, AC; floors |
| C4 | Time slots & pricing | Morning/Afternoon/Evening/Night slots with start/end time, free or paid, price |
| C5 | Auto-generated grid | Seat counts → grid auto-built per floor. Admin can edit: move/add/remove seats, change type, facing direction, add floors |
| C6 | Discovery | Location-based nearby libraries (Leaflet map), search, filters |
| C7 | Recommendation | User enters preferences (window, solo/group, power outlet, quiet) → ranked libraries and seats |
| C8 | Booking | Pick seat from grid for date + slot; confirm; receive QR code |
| C9 | Conflict handling | No double booking; no overlapping bookings per user; when unavailable, show suitable alternatives |
| C10 | Cancel | User can cancel; seat freed instantly |
| C11 | QR check-in | Admin scans user QR → booking checked in |
| C12 | No-show recovery | Reminder at slot start ("Are you coming?"); Yes → +30 min once; No → cancel; no response in 30 min → seat released + email |
| C13 | Walk-in / walk-out | Admin books seats for walk-ins and releases seats when someone leaves |
| C14 | Admin analytics | Booked % vs not-booked %, charts, downloadable report (CSV/PDF) |

### 4.2 Stretch (SHOULD)
| # | Feature |
|---|---|
| S1 | Waitlist with FIFO notification + 10-minute claim window |
| S2 | Preferred seat on user dashboard (most-booked seat) |
| S3 | Study tools: Pomodoro, custom timer, stopwatch |
| S4 | Leaderboard + focus reports (consistency, hours, streak) |
| S5 | AI chatbot (Groq or Gemini API) |
| S6 | Real-time seat updates (Socket.IO) |

### 4.3 Out of scope (MVP)
Real payment gateway (mocked), mobile native apps, slots crossing midnight, multi-library admin accounts, recurring bookings.

## 5. User flows

**Booking:** User logs in → enables location → sees nearby libraries on map → picks library → selects date + slot → enters preferences (optional) → system suggests seats → user picks from grid (or suggestion) → confirm → QR shown. If seat just taken → conflict message + alternatives.

**Check-in:** User shows QR → admin scans → booking CHECKED_IN → seat stays occupied till slot end or manual release.

**No-show:** Slot start → reminder email + in-app prompt → Yes (+30 min once) / No (cancel) / ignore → at grace end seat released, email sent, waitlist notified.

**Library onboarding:** Admin registers + library details → PENDING → owner reviews → APPROVED/REJECTED + email → admin configures seats/slots/grid.

## 6. Functional rules
See `API_CONTRACT.md` §6 (business rules) — authoritative for availability, conflicts, no-show, waitlist, QR, payments, recommendations.

## 7. Non-functional requirements
| NFR | Requirement |
|---|---|
| Consistency | Booking creation in a DB **transaction** with row-level locking (`SELECT … FOR UPDATE`) + unique constraint; ACID |
| Rate limiting | Global 100 req/min/IP; auth 10/min; booking 10/min/user; chat 20/min/user |
| Idempotency | Booking POSTs require `Idempotency-Key` |
| Security | bcrypt passwords, JWT, RBAC, input validation (zod), helmet, parameterised queries, signed QR tokens |
| Performance | Grid endpoint p95 < 500 ms for 300 seats |
| Real-time | Seat status changes pushed < 1 s via Socket.IO |
| Responsiveness | Works on mobile (360 px) to desktop |
| Accessibility | Keyboard-navigable grid, ARIA labels, colour not the only status indicator |

## 8. Architecture and tech stack
| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS, React Router, TanStack Query, Zustand, Leaflet.js, Recharts |
| Backend | Node.js + Express (TypeScript), zod, JWT, Nodemailer (SMTP), node-cron, Socket.IO |
| Database | MySQL 8 (InnoDB) |
| AI | Groq API (primary) or Gemini API behind a provider interface |
| QR | `qrcode` (generate), `html5-qrcode` (scan) |
| Maps | Leaflet.js + OpenStreetMap tiles |

Layers: **User layer** (3 dashboards, seat grid, chatbot, QR) → **Application layer** (Express APIs, RBAC, matching, conflict-free booking, waitlist, notifications, approvals) → **Data & AI layer** (MySQL, recommendation engine, Groq/Gemini, QR validation).

## 9. Parallel development strategy
- `contract/API_CONTRACT.md` is the single source of truth; neither agent edits it.
- Frontend builds against **MSW mocks** driven by `contract/fixtures`, toggled by `VITE_USE_MOCKS`.
- Backend ships seed data and responses that match fixtures exactly.
- Integration happens at the end by flipping `VITE_USE_MOCKS=false`.

## 10. Milestones
| Phase | Backend | Frontend |
|---|---|---|
| 1 | Scaffold, DB schema, auth, seed | Scaffold, routing, auth pages, mock layer, API client |
| 2 | Library registration, owner approval, SMTP | Owner + registration + admin onboarding screens |
| 3 | Seats, floors, grid generate/edit, slots | Grid generator + editor, slots UI |
| 4 | Discovery, suggest-seats, booking transaction, QR | Map, search, preference form, seat grid, booking, QR |
| 5 | No-show cron, waitlist, walk-in, check-in | Reminder prompt, waitlist UI, admin scan/walk-in |
| 6 | Analytics, export, study, leaderboard, chat, sockets | Charts, Pomodoro, leaderboard, chatbot, live updates |
| 7 | Integration + hardening | Flip mocks off, fix mismatches, polish |

## 11. Success metrics
Zero double bookings under concurrent load test; no-show seat recovery working within grace window; booking flow ≤ 5 clicks; admin report exports successfully.

## 12. Risks
| Risk | Mitigation |
|---|---|
| Contract drift between agents | Contract frozen; changes via CHANGELOG only |
| Race conditions on booking | Transaction + FOR UPDATE + unique index + load test |
| Scope too big for hackathon | Core first, stretch only after C1–C14 pass |
| AI API quota | Provider interface + canned fallback reply |
