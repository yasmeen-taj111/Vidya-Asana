import bcrypt from 'bcrypt';
import { pool, query } from '../src/config/db';
import { generateUUID, generateBookingCode } from '../src/utils/ids';

async function seed() {
  console.log('[Seed] Starting database seed...');

  // Clear existing records in reverse dependency order
  await query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'chat_messages',
    'notifications',
    'study_sessions',
    'user_preferences',
    'waitlist_entries',
    'bookings',
    'time_slots',
    'floor_cells',
    'seats',
    'floors',
    'libraries',
    'refresh_tokens',
    'users',
  ];
  for (const t of tables) {
    try {
      await query(`DELETE FROM \`${t}\``);
    } catch (e) {
      // ignore if table doesn't exist yet
    }
  }
  await query('SET FOREIGN_KEY_CHECKS = 1');

  // Password hashes
  const ownerHash = await bcrypt.hash('Owner@1234', 10);
  const adminHash = await bcrypt.hash('Admin@1234', 10);
  const studentHash = await bcrypt.hash('Student@1234', 10);

  const ownerId = 'usr-owner-001';
  const adminId = 'usr-admin-001';
  const pendingAdminId = 'usr-admin-002';
  const studentId = 'usr-student-001';
  const student2Id = 'usr-student-002';

  const libApprovedId = 'lib-central-001';
  const libPendingId = 'lib-north-002';

  // Insert Users
  console.log('[Seed] Seeding users...');
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, phone, library_id, created_at) VALUES
     (?, 'Platform Director', 'owner@vidyaasana.test', ?, 'SITE_OWNER', '+91 98765 00001', NULL, NOW()),
     (?, 'Prof. Sharma', 'admin@vidyaasana.test', ?, 'LIBRARY_ADMIN', '+91 98765 00002', ?, NOW()),
     (?, 'Priya Nair', 'pending@vidyaasana.test', ?, 'LIBRARY_ADMIN', '+91 98765 00003', ?, NOW()),
     (?, 'Aarav Patel', 'student@vidyaasana.test', ?, 'USER', '+91 98765 00004', NULL, NOW()),
     (?, 'Ananya Iyer', 'student2@vidyaasana.test', ?, 'USER', '+91 98765 00005', NULL, NOW())`,
    [
      ownerId, ownerHash,
      adminId, adminHash, libApprovedId,
      pendingAdminId, adminHash, libPendingId,
      studentId, studentHash,
      student2Id, studentHash,
    ]
  );

  // Insert Libraries
  console.log('[Seed] Seeding libraries...');
  await query(
    `INSERT INTO libraries (
      id, name, description, address, city, latitude, longitude,
      contact_email, contact_phone, status, has_lockers, has_cctv, has_ac, has_wifi, has_power_outlets, is_free, admin_user_id
    ) VALUES
    (?, 'Central Study Hub', 'Premier 24/7 ergonomic library with soundproof pods and gigabit fiber wifi.',
     '123 MG Road, Brigade Junction', 'Bengaluru', 12.9716, 77.5946,
     'support@centralstudyhub.in', '+91 80 2234 5678', 'APPROVED', 1, 1, 1, 1, 1, 0, ?),
    (?, 'North Gate Reading Room', 'Spacious heritage study sanctuary located near Hebbal Lake.',
     '45 Airport Road, Hebbal', 'Bengaluru', 13.0358, 77.5970,
     'admin@northgatereading.in', '+91 80 4455 6677', 'PENDING', 1, 1, 1, 1, 0, 1, ?)`,
    [libApprovedId, adminId, libPendingId, pendingAdminId]
  );

  // Insert Time Slots for Central Study Hub
  console.log('[Seed] Seeding time slots...');
  const slotMorningId = 'slot-morning-001';
  const slotAfternoonId = 'slot-afternoon-002';
  const slotEveningId = 'slot-evening-003';
  const slotNightId = 'slot-night-004';

  await query(
    `INSERT INTO time_slots (id, library_id, name, start_time, end_time, is_free, price_paise, is_active) VALUES
     (?, ?, 'MORNING', '06:00', '12:00', 1, 0, 1),
     (?, ?, 'AFTERNOON', '12:00', '17:00', 1, 0, 1),
     (?, ?, 'EVENING', '17:00', '21:00', 0, 5000, 1),
     (?, ?, 'NIGHT', '21:00', '23:59', 0, 8000, 1)`,
    [
      slotMorningId, libApprovedId,
      slotAfternoonId, libApprovedId,
      slotEveningId, libApprovedId,
      slotNightId, libApprovedId,
    ]
  );

  // Insert Floors for Central Study Hub
  console.log('[Seed] Seeding floors...');
  const floor1Id = 'fl-001';
  const floor2Id = 'fl-002';

  await query(
    `INSERT INTO floors (id, library_id, floor_number, label, \`rows\`, \`cols\`) VALUES
     (?, ?, 1, 'Floor 1 - Silent Research Pods', 4, 5),
     (?, ?, 2, 'Floor 2 - Collaborative Loft', 3, 5)`,
    [floor1Id, libApprovedId, floor2Id, libApprovedId]
  );

  // Floor 1 Layout: 4 rows x 5 cols
  // Row 0: Door at (0, 0), window wall at (0, 4), seats at (0, 1), (0, 2), (0, 3)
  // Row 1: Seats A4..A8
  // Row 2: Aisle at col 2
  // Row 3: Computer seats
  console.log('[Seed] Seeding seats and grid cells...');
  const seatA1 = 'st-fl1-01';
  const seatA2 = 'st-fl1-02';
  const seatA3 = 'st-fl1-03';
  const seatB1 = 'st-fl1-04';
  const seatB2 = 'st-fl1-05';
  const seatB3 = 'st-fl1-06';
  const seatC1 = 'st-fl1-07'; // Computer
  const seatC2 = 'st-fl1-08'; // Computer
  const seatAcc = 'st-fl1-09'; // Accessible

  // Insert Floor 1 non-seat cells
  await query(
    `INSERT INTO floor_cells (id, floor_id, \`row\`, \`col\`, cell_type) VALUES
     (?, ?, 0, 0, 'DOOR'),
     (?, ?, 0, 4, 'WINDOW_WALL'),
     (?, ?, 2, 0, 'AISLE'),
     (?, ?, 2, 1, 'AISLE'),
     (?, ?, 2, 2, 'AISLE'),
     (?, ?, 2, 3, 'AISLE'),
     (?, ?, 2, 4, 'AISLE'),
     (?, ?, 3, 0, 'EMPTY'),
     (?, ?, 3, 4, 'EMPTY')`,
    [
      generateUUID(), floor1Id,
      generateUUID(), floor1Id,
      generateUUID(), floor1Id,
      generateUUID(), floor1Id,
      generateUUID(), floor1Id,
      generateUUID(), floor1Id,
      generateUUID(), floor1Id,
      generateUUID(), floor1Id,
      generateUUID(), floor1Id,
    ]
  );

  // Insert Floor 1 Seats
  await query(
    `INSERT INTO seats (
      id, floor_id, library_id, label, seat_type, facing,
      attr_window, attr_power_outlet, attr_quiet_zone, attr_near_door, is_active, grid_row, grid_col
    ) VALUES
     (?, ?, ?, 'A-01', 'INDIVIDUAL', 'N', 1, 1, 1, 0, 1, 0, 1),
     (?, ?, ?, 'A-02', 'INDIVIDUAL', 'N', 1, 1, 1, 0, 1, 0, 2),
     (?, ?, ?, 'A-03', 'INDIVIDUAL', 'N', 1, 1, 1, 0, 1, 0, 3),
     (?, ?, ?, 'B-01', 'INDIVIDUAL', 'S', 0, 1, 1, 0, 1, 1, 1),
     (?, ?, ?, 'B-02', 'INDIVIDUAL', 'S', 0, 1, 1, 0, 1, 1, 2),
     (?, ?, ?, 'B-03', 'INDIVIDUAL', 'S', 0, 1, 1, 0, 1, 1, 3),
     (?, ?, ?, 'PC-01', 'COMPUTER', 'E', 0, 1, 0, 0, 1, 3, 1),
     (?, ?, ?, 'PC-02', 'COMPUTER', 'E', 0, 1, 0, 0, 1, 3, 2),
     (?, ?, ?, 'AC-01', 'ACCESSIBLE', 'W', 0, 1, 1, 1, 1, 1, 0)`,
    [
      seatA1, floor1Id, libApprovedId,
      seatA2, floor1Id, libApprovedId,
      seatA3, floor1Id, libApprovedId,
      seatB1, floor1Id, libApprovedId,
      seatB2, floor1Id, libApprovedId,
      seatB3, floor1Id, libApprovedId,
      seatC1, floor1Id, libApprovedId,
      seatC2, floor1Id, libApprovedId,
      seatAcc, floor1Id, libApprovedId,
    ]
  );

  // Floor 2 Seats: Group pods
  const seatGrp1 = 'st-fl2-01';
  const seatGrp2 = 'st-fl2-02';
  const seatF2A1 = 'st-fl2-03';

  await query(
    `INSERT INTO seats (
      id, floor_id, library_id, label, seat_type, facing,
      attr_window, attr_power_outlet, attr_quiet_zone, attr_near_door, group_capacity, is_active, grid_row, grid_col
    ) VALUES
     (?, ?, ?, 'GRP-01', 'GROUP', 'S', 1, 1, 0, 0, 4, 1, 0, 1),
     (?, ?, ?, 'GRP-02', 'GROUP', 'S', 1, 1, 0, 0, 6, 1, 0, 3),
     (?, ?, ?, 'D-01', 'INDIVIDUAL', 'N', 0, 1, 0, 0, NULL, 1, 1, 1)`,
    [
      seatGrp1, floor2Id, libApprovedId,
      seatGrp2, floor2Id, libApprovedId,
      seatF2A1, floor2Id, libApprovedId,
    ]
  );

  // Pre-seed Bookings for Today
  console.log('[Seed] Seeding sample bookings...');
  const todayStr = new Date().toISOString().substring(0, 10);
  const booking1Id = 'bkg-demo-001';
  const booking2Id = 'bkg-demo-002';

  await query(
    `INSERT INTO bookings (
      id, code, library_id, seat_id, slot_id, user_id, booking_date,
      status, source, price_paise, payment_status, grace_until, arrival_confirmed, qr_secret, created_at
    ) VALUES
     (?, 'VA-7K2M9', ?, ?, ?, ?, ?, 'CONFIRMED', 'ONLINE', 0, 'FREE', DATE_ADD(NOW(), INTERVAL 45 MINUTE), 0, ?, NOW()),
     (?, 'VA-3X8P1', ?, ?, ?, ?, ?, 'CONFIRMED', 'ONLINE', 0, 'FREE', DATE_ADD(NOW(), INTERVAL 45 MINUTE), 0, ?, NOW())`,
    [
      booking1Id, libApprovedId, seatA1, slotMorningId, studentId, todayStr, generateUUID(),
      booking2Id, libApprovedId, seatB1, slotMorningId, student2Id, todayStr, generateUUID(),
    ]
  );

  // User preferences for Aarav Patel
  console.log('[Seed] Seeding user preferences...');
  await query(
    `INSERT INTO user_preferences (user_id, seat_type, \`window\`, power_outlet, quiet_zone, study_mode, preferred_slot)
     VALUES (?, 'INDIVIDUAL', 1, 1, 1, 'SOLO', 'MORNING')`,
    [studentId]
  );

  // Study sessions for Aarav Patel
  console.log('[Seed] Seeding study sessions...');
  const day1 = new Date(Date.now() - 3 * 24 * 3600 * 1000);
  const day2 = new Date(Date.now() - 2 * 24 * 3600 * 1000);
  const day3 = new Date(Date.now() - 1 * 24 * 3600 * 1000);

  await query(
    `INSERT INTO study_sessions (id, user_id, type, started_at, ended_at, focus_seconds, break_seconds, created_at) VALUES
     (?, ?, 'POMODORO', ?, ?, 3600, 600, ?),
     (?, ?, 'POMODORO', ?, ?, 5400, 900, ?),
     (?, ?, 'CUSTOM', ?, ?, 7200, 1200, ?)`,
    [
      generateUUID(), studentId, day1, day1, day1,
      generateUUID(), studentId, day2, day2, day2,
      generateUUID(), studentId, day3, day3, day3,
    ]
  );

  // Notifications for Aarav Patel
  console.log('[Seed] Seeding notifications...');
  await query(
    `INSERT INTO notifications (id, user_id, type, title, body, is_read, data, created_at) VALUES
     (?, ?, 'BOOKING_CONFIRMED', 'Booking Confirmed!', 'Your seat A-01 at Central Study Hub is reserved for Morning slot.', 0, ?, NOW()),
     (?, ?, 'SYSTEM', 'Welcome to Vidya Asana', 'Explore quiet research desks, Pomodoro focus tracking, and digital QR check-in.', 1, NULL, NOW())`,
    [
      generateUUID(), studentId, JSON.stringify({ bookingId: booking1Id }),
      generateUUID(), studentId,
    ]
  );

  console.log('[Seed] ✅ Database seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed] Error during seeding:', err);
  process.exit(1);
});
