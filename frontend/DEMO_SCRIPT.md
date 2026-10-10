# Vidya Asana — Frontend Demo Script

This script walks through the complete end-to-end hackathon demonstration of **Vidya Asana** for all three roles (**Student**, **Library Admin**, **Site Owner**).

---

## 1. Environment & Setup
1. Ensure the development server is active:
   ```bash
   cd frontend
   npm run dev
   ```
2. Open your browser at `http://localhost:5173`.
3. By default, `VITE_USE_MOCKS=true`, which runs full high-fidelity in-memory MSW mocks without requiring MySQL or live backend setup.
4. Note the floating **Dev / Demo Panel** at the bottom-left corner of the screen for instant account switching and conflict simulation.

---

## 2. Student Flow (Discovery → Recommendation → Booking → Conflict Handling)

### Step 1: Sign in as Student
- Go to `/login`.
- Under **Instant Demo Logins**, click **👤 Student (User)** (`student@vidyaasana.test`).
- You are redirected to `/app` (Student Home Dashboard).
- Observe:
  - Personal streak counter (4 Days) and focus hours.
  - Active reservation card for seat **F1-A1** at Central Study Hub.
  - "Preferred Seat" card highlighting most frequently booked desk.

### Step 2: Discover Nearby Libraries
- Click **Discover** in the top navigation bar.
- Observe:
  - OpenStreetMap (Leaflet.js) rendering library pins in Bengaluru.
  - "Personalized Recommendations" strip ranking libraries by algorithm match score.
  - Click on **Central Study Hub** on either the map pin or the list card, then click **Inspect Floor Layout & Book**.

### Step 3: Interactive Seat Selection & Suggestion
- **Step 1 of 4 (Date & Slot):**
  - Choose a date from the 14-day date picker.
  - Select a slot (e.g., Morning 06:00 – 12:00 or Afternoon 12:00 – 17:00).
  - Click **Continue to Seat Selection**.
- **Step 2 of 4 (Seat Grid & Suggestions):**
  - Notice the **Recommended Best Desks for You** chips with scores and reasons (e.g., "Quiet window desk", "Near power outlet").
  - Notice the interactive CSS grid:
    - Status indicators (Green = Available, Blue = Your Seat, Grey = Booked).
    - Facing direction arrows (↑, →, ↓, ←).
    - Seat type icons (Computer, Group, Accessible, Individual).
    - Hover over any seat to preview attributes in the inspector bar.
  - Click any available green seat (e.g., **F1-A3**).
  - Click **Proceed to Summary**.
- **Step 3 of 4 (Confirmation & Mock Payment):**
  - Review summary table and mock tariff payment.
  - Click **Complete & Generate QR Pass**.
- **Step 4 of 4 (Booking Success & QR Pass):**
  - View the generated entry QR pass, short human code (`VA-...`), and click **Add to Calendar (.ics)** to test calendar integration.

### Step 4: Conflict Simulation & Instant Alternatives Demo (Demo Showstopper)
- Navigate back to Central Study Hub booking flow (`/app/libraries/lib-1/book`).
- Pick a date and slot.
- Open the bottom-left **Dev / Demo Panel**.
- Check the box: **Trigger Seat Conflict (409)**.
- Pick a seat and click **Proceed to Summary** → **Complete & Generate QR Pass**.
- Observe the **Seat Was Just Taken!** modal appears immediately:
  - Displays curated alternative desks in the same slot with match scores and reasons.
  - Click one of the alternative cards to seamlessly swap to that desk, or click **Join Waitlist for This Seat**.

### Step 5: Study Tools & Focus Timer
- Click **Study Tools** in the navigation.
- Switch between **Pomodoro**, **Custom Timer**, and **Stopwatch**.
- Start the timer. Refresh the tab or switch windows — the timer uses epoch timestamps in localStorage so it never loses track of time.
- Review **Leaderboard** and **Reports** to inspect daily consistency graphs and streak stats.

---

## 3. Library Admin Flow (Seats & Grid Builder → Walk-In → QR Scan → Analytics)

### Step 1: Switch to Library Admin
- Open the bottom-left **Dev / Demo Panel** and click **🏛 Lib Admin (Appr)**.
- You are redirected to `/admin`.
- Observe today's occupancy donut (Booked % vs Available %) and today's revenue.

### Step 2: Seats & Grid Builder
- Click **Seats & Grid** in the top navigation.
- Test the layout editor:
  - Click **Auto Generator** modal to preview how floor dimensions and seat type quotas automatically generate grid cells.
  - Click any cell in the canvas to inspect it in the **Cell Inspector** side panel.
  - Change its type, label, facing direction (N/E/S/W), or toggle window/power socket attributes.
  - Use **Undo** / **Redo** and click **Save Changes**.

### Step 3: Front Desk QR Verification
- Click **Scan QR** in the navigation.
- Test the camera scan or enter a reservation code (e.g., `VA-8F3K2`) and click **Verify**.
- A green check-in confirmation card appears displaying the student's name and seat.
- Test scanning again: system idempotently reports `ALREADY_CHECKED_IN`.

### Step 4: Walk-In Ticketing & Early Walk-Outs
- Click **Walk-In** in the navigation.
- Click any green available desk → Enter guest name → Click **Confirm Walk-In & Check In**.
- Click any grey booked desk → Click **Release & Notify Waitlist** to test early departure recovery.

### Step 5: Analytics & Export
- Click **Analytics** in the navigation.
- View utilization breakdown by slot.
- Click **Export CSV** and **Export PDF** to test downloading report files.

---

## 4. Site Owner Flow (Governance & Approval)

### Step 1: Switch to Site Owner
- Open the **Dev / Demo Panel** and click **👑 Site Owner**.
- You are redirected to `/owner`.
- Observe platform-wide metrics: total listings, pending review, approved, and total reservations.

### Step 2: Review & Approve Listings
- Locate the **Pending Review** library (Koramangala Community Library).
- Click **Inspect & Review**.
- Click **Approve & Notify** (or test rejection with reason).
- A success toast confirms decision saved and automated notification email triggered.
