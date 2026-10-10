-- Vidya Asana Database Schema (MySQL 8 InnoDB, utf8mb4)

CREATE DATABASE IF NOT EXISTS `vidya_asana` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `vidya_asana`;
SET FOREIGN_KEY_CHECKS = 0;

-- Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('SITE_OWNER', 'LIBRARY_ADMIN', 'USER') NOT NULL,
  `phone` VARCHAR(30) NULL,
  `library_id` VARCHAR(36) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `revoked_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_rt_user` (`user_id`),
  CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Libraries
CREATE TABLE IF NOT EXISTS `libraries` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `address` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `latitude` DECIMAL(9, 6) NOT NULL,
  `longitude` DECIMAL(9, 6) NOT NULL,
  `contact_email` VARCHAR(191) NOT NULL,
  `contact_phone` VARCHAR(30) NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `rejection_reason` TEXT NULL,
  `has_lockers` BOOLEAN DEFAULT TRUE,
  `has_cctv` BOOLEAN DEFAULT TRUE,
  `has_ac` BOOLEAN DEFAULT TRUE,
  `has_wifi` BOOLEAN DEFAULT TRUE,
  `has_power_outlets` BOOLEAN DEFAULT TRUE,
  `is_free` BOOLEAN DEFAULT FALSE,
  `admin_user_id` VARCHAR(36) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_lib_status` (`status`),
  INDEX `idx_lib_city` (`city`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Floors
CREATE TABLE IF NOT EXISTS `floors` (
  `id` VARCHAR(36) PRIMARY KEY,
  `library_id` VARCHAR(36) NOT NULL,
  `floor_number` INT NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `rows` INT NOT NULL,
  `cols` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_library_floor` (`library_id`, `floor_number`),
  CONSTRAINT `fk_floor_library` FOREIGN KEY (`library_id`) REFERENCES `libraries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seats
CREATE TABLE IF NOT EXISTS `seats` (
  `id` VARCHAR(36) PRIMARY KEY,
  `floor_id` VARCHAR(36) NOT NULL,
  `library_id` VARCHAR(36) NOT NULL,
  `label` VARCHAR(50) NOT NULL,
  `seat_type` ENUM('INDIVIDUAL', 'GROUP', 'ACCESSIBLE', 'COMPUTER') NOT NULL DEFAULT 'INDIVIDUAL',
  `facing` ENUM('N', 'E', 'S', 'W') NOT NULL DEFAULT 'N',
  `attr_window` BOOLEAN DEFAULT FALSE,
  `attr_power_outlet` BOOLEAN DEFAULT FALSE,
  `attr_quiet_zone` BOOLEAN DEFAULT FALSE,
  `attr_near_door` BOOLEAN DEFAULT FALSE,
  `group_capacity` INT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `grid_row` INT NOT NULL,
  `grid_col` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_floor_seat_cell` (`floor_id`, `grid_row`, `grid_col`),
  INDEX `idx_seat_library` (`library_id`),
  CONSTRAINT `fk_seat_floor` FOREIGN KEY (`floor_id`) REFERENCES `floors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_seat_library` FOREIGN KEY (`library_id`) REFERENCES `libraries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Floor non-seat cells
CREATE TABLE IF NOT EXISTS `floor_cells` (
  `id` VARCHAR(36) PRIMARY KEY,
  `floor_id` VARCHAR(36) NOT NULL,
  `row` INT NOT NULL,
  `col` INT NOT NULL,
  `cell_type` ENUM('AISLE', 'EMPTY', 'DOOR', 'WINDOW_WALL') NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_floor_cell` (`floor_id`, `row`, `col`),
  CONSTRAINT `fk_cell_floor` FOREIGN KEY (`floor_id`) REFERENCES `floors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Time Slots
CREATE TABLE IF NOT EXISTS `time_slots` (
  `id` VARCHAR(36) PRIMARY KEY,
  `library_id` VARCHAR(36) NOT NULL,
  `name` ENUM('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT') NOT NULL,
  `start_time` VARCHAR(10) NOT NULL,
  `end_time` VARCHAR(10) NOT NULL,
  `is_free` BOOLEAN DEFAULT FALSE,
  `price_paise` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_slot_library` (`library_id`),
  CONSTRAINT `fk_slot_library` FOREIGN KEY (`library_id`) REFERENCES `libraries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bookings
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` VARCHAR(36) PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `library_id` VARCHAR(36) NOT NULL,
  `seat_id` VARCHAR(36) NOT NULL,
  `slot_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NULL,
  `guest_name` VARCHAR(150) NULL,
  `booking_date` DATE NOT NULL,
  `status` ENUM('CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'CONFIRMED',
  `source` ENUM('ONLINE', 'WALK_IN') NOT NULL DEFAULT 'ONLINE',
  `price_paise` INT NOT NULL DEFAULT 0,
  `payment_status` ENUM('FREE', 'PAID', 'PENDING') NOT NULL DEFAULT 'PAID',
  `grace_until` TIMESTAMP NOT NULL,
  `arrival_confirmed` BOOLEAN DEFAULT FALSE,
  `reminder_sent_at` TIMESTAMP NULL,
  `qr_secret` VARCHAR(100) NOT NULL,
  `checked_in_at` TIMESTAMP NULL,
  `cancelled_at` TIMESTAMP NULL,
  `idempotency_key` VARCHAR(255) NULL,
  `active_key` VARCHAR(120) GENERATED ALWAYS AS (
    IF(`status` IN ('CONFIRMED', 'CHECKED_IN'), CONCAT(`seat_id`, '-', `slot_id`, '-', `booking_date`), NULL)
  ) STORED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_booking_active_key` (`active_key`),
  UNIQUE KEY `uk_user_idempotency` (`user_id`, `idempotency_key`),
  INDEX `idx_booking_lookup` (`library_id`, `booking_date`, `slot_id`, `status`),
  INDEX `idx_booking_user` (`user_id`),
  INDEX `idx_booking_seat` (`seat_id`),
  INDEX `idx_booking_slot` (`slot_id`),
  CONSTRAINT `fk_booking_library` FOREIGN KEY (`library_id`) REFERENCES `libraries` (`id`),
  CONSTRAINT `fk_booking_seat` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`id`),
  CONSTRAINT `fk_booking_slot` FOREIGN KEY (`slot_id`) REFERENCES `time_slots` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Waitlist Entries
CREATE TABLE IF NOT EXISTS `waitlist_entries` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `seat_id` VARCHAR(36) NOT NULL,
  `slot_id` VARCHAR(36) NOT NULL,
  `booking_date` DATE NOT NULL,
  `status` ENUM('WAITING', 'NOTIFIED', 'CLAIMED', 'EXPIRED', 'REMOVED') NOT NULL DEFAULT 'WAITING',
  `claim_expires_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_waitlist_user_seat` (`user_id`, `seat_id`, `slot_id`, `booking_date`),
  INDEX `idx_waitlist_queue` (`seat_id`, `slot_id`, `booking_date`, `status`, `created_at`),
  INDEX `idx_wl_slot` (`slot_id`),
  INDEX `idx_wl_user` (`user_id`),
  CONSTRAINT `fk_wl_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wl_seat` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wl_slot` FOREIGN KEY (`slot_id`) REFERENCES `time_slots` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Preferences
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `user_id` VARCHAR(36) PRIMARY KEY,
  `seat_type` ENUM('INDIVIDUAL', 'GROUP', 'ACCESSIBLE', 'COMPUTER') DEFAULT 'INDIVIDUAL',
  `window` BOOLEAN DEFAULT TRUE,
  `power_outlet` BOOLEAN DEFAULT TRUE,
  `quiet_zone` BOOLEAN DEFAULT TRUE,
  `study_mode` ENUM('SOLO', 'GROUP') DEFAULT 'SOLO',
  `preferred_slot` ENUM('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT') DEFAULT 'MORNING',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pref_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Study Sessions
CREATE TABLE IF NOT EXISTS `study_sessions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `type` ENUM('POMODORO', 'CUSTOM', 'STOPWATCH') NOT NULL,
  `started_at` TIMESTAMP NOT NULL,
  `ended_at` TIMESTAMP NOT NULL,
  `focus_seconds` INT NOT NULL,
  `break_seconds` INT DEFAULT 0,
  `booking_id` VARCHAR(36) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_study_user` (`user_id`, `started_at`),
  CONSTRAINT `fk_study_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `type` ENUM('BOOKING_CONFIRMED', 'REMINDER', 'NO_SHOW', 'WAITLIST_AVAILABLE', 'LIBRARY_APPROVED', 'LIBRARY_REJECTED', 'SYSTEM') NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `body` TEXT NOT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `data` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ntf_user_read` (`user_id`, `is_read`, `created_at`),
  CONSTRAINT `fk_ntf_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat Messages
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `conversation_id` VARCHAR(64) NOT NULL,
  `role` ENUM('USER', 'ASSISTANT', 'SYSTEM') NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_chat_conv` (`conversation_id`, `created_at`),
  INDEX `idx_chat_user` (`user_id`),
  CONSTRAINT `fk_chat_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

