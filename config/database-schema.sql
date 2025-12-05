-- =====================================================
-- Mind Fitness - Payment & Access Database Schema
-- =====================================================
-- Run this SQL to set up the payment system tables
-- Database: mindfitness (Hostinger MySQL)
-- =====================================================

-- -----------------------------------------------------
-- Table: orders
-- Unified order table for comics and consultations
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL UNIQUE,
  order_type ENUM('comic', 'bundle', 'consultation') NOT NULL,
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'THB',

  -- Customer info
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(255) NULL,
  customer_name VARCHAR(255) NULL,

  -- For consultation orders
  psychologist_id INT NULL,
  scheduled_date DATE NULL,
  scheduled_time TIME NULL,
  session_type VARCHAR(20) NULL,

  -- Payment tracking
  status ENUM('pending', 'slip_uploaded', 'verifying', 'verified', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'promptpay',
  slip_data LONGTEXT NULL,
  slip_uploaded_at DATETIME NULL,

  -- Verification
  otp_code VARCHAR(6) NULL,
  otp_expires_at DATETIME NULL,
  otp_verified BOOLEAN DEFAULT FALSE,
  verified_at DATETIME NULL,
  verified_by VARCHAR(50) NULL, -- 'auto' or 'manual' or admin name

  -- Auto-verify data (from SlipVerify API)
  slip_verify_ref VARCHAR(100) NULL,
  slip_sender_name VARCHAR(255) NULL,
  slip_amount DECIMAL(10, 2) NULL,
  slip_transaction_id VARCHAR(100) NULL,
  slip_transaction_date DATETIME NULL,

  -- Timestamps
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_order_id (order_id),
  INDEX idx_customer_phone (customer_phone),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: access_tokens
-- Stores customer access to purchased content
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS access_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(100) NOT NULL UNIQUE,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(255) NULL,

  -- Access details
  product_type ENUM('comic', 'bundle', 'consultation') NOT NULL,
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,

  -- Related order
  order_id VARCHAR(50) NOT NULL,

  -- Access control
  is_active BOOLEAN DEFAULT TRUE,
  access_count INT DEFAULT 0,
  last_accessed_at DATETIME NULL,

  -- Expiration (NULL = lifetime)
  expires_at DATETIME NULL,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_token (token),
  INDEX idx_customer_phone (customer_phone),
  INDEX idx_product_id (product_id),
  INDEX idx_order_id (order_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: otp_requests
-- Track OTP requests for rate limiting
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  purpose ENUM('payment', 'login', 'access') NOT NULL,
  order_id VARCHAR(50) NULL,
  is_used BOOLEAN DEFAULT FALSE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_phone (phone),
  INDEX idx_order_id (order_id),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: slip_verifications
-- Log all slip verification attempts
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS slip_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  verification_method VARCHAR(50) NOT NULL, -- 'slipok', 'manual', 'webhook'

  -- Request data
  request_payload LONGTEXT NULL,
  request_time DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Response data
  response_payload LONGTEXT NULL,
  response_time DATETIME NULL,

  -- Result
  is_success BOOLEAN DEFAULT FALSE,
  error_message TEXT NULL,

  -- Extracted slip data
  sender_name VARCHAR(255) NULL,
  sender_account VARCHAR(50) NULL,
  receiver_name VARCHAR(255) NULL,
  receiver_account VARCHAR(50) NULL,
  amount DECIMAL(10, 2) NULL,
  transaction_ref VARCHAR(100) NULL,
  transaction_date DATETIME NULL,
  bank_code VARCHAR(10) NULL,

  INDEX idx_order_id (order_id),
  INDEX idx_success (is_success)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: platform_settings
-- Store configurable settings
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description VARCHAR(255) NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO platform_settings (setting_key, setting_value, setting_type, description) VALUES
  ('promptpay_id', '1560100280840', 'string', 'PromptPay account ID'),
  ('promptpay_name', 'นายพณัฐ เชื้อประเสริฐศักดิ์', 'string', 'PromptPay account name'),
  ('slipok_api_key', '', 'string', 'SlipOK API key for auto-verify'),
  ('slipok_branch_id', '', 'string', 'SlipOK branch ID'),
  ('sms_enabled', 'true', 'boolean', 'Enable SMS OTP'),
  ('auto_verify_enabled', 'true', 'boolean', 'Enable auto slip verification'),
  ('order_expiry_minutes', '30', 'number', 'Order expiry time in minutes'),
  ('otp_expiry_minutes', '5', 'number', 'OTP expiry time in minutes')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- -----------------------------------------------------
-- Useful queries for checking customer access
-- -----------------------------------------------------

-- Check if customer has access to a product
-- SELECT * FROM access_tokens
-- WHERE customer_phone = '0812345678'
--   AND product_id = 'bundle-all'
--   AND is_active = TRUE
--   AND (expires_at IS NULL OR expires_at > NOW());

-- Get all products a customer has access to
-- SELECT product_id, product_name, product_type, created_at
-- FROM access_tokens
-- WHERE customer_phone = '0812345678'
--   AND is_active = TRUE
--   AND (expires_at IS NULL OR expires_at > NOW());
