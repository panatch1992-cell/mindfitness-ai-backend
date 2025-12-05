/**
 * Listener Registration API
 *
 * Handles listener (peer support) registration
 * Stores data in MySQL database
 */

import { setCORSHeaders } from '../utils/config.js';
import { query, queryOne, insert, update } from '../utils/database.js';

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer;
  setCORSHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    switch (action) {
      case 'register':
        return handleRegister(req, res);
      case 'verify_otp':
        return handleVerifyOtp(req, res);
      case 'resend_otp':
        return handleResendOtp(req, res);
      case 'login':
        return handleLogin(req, res);
      case 'get_profile':
        return handleGetProfile(req, res);
      case 'update_status':
        return handleUpdateStatus(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Listener API error:', error);

    if (error.message === 'Database not configured') {
      return res.status(500).json({
        success: false,
        error: 'ระบบกำลังปรับปรุง กรุณาลองใหม่ภายหลัง'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    });
  }
}

/**
 * Register new listener
 */
async function handleRegister(req, res) {
  const { nickname, phone, email, age, motivation } = req.body;

  // Validation
  if (!nickname || !phone) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอกชื่อเล่นและเบอร์โทรศัพท์'
    });
  }

  // Validate phone format
  if (!/^0[0-9]{9}$/.test(phone)) {
    return res.status(400).json({
      success: false,
      error: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'
    });
  }

  // Check if phone already exists
  const existing = await queryOne(
    'SELECT id, status FROM listeners WHERE phone = ?',
    [phone]
  );

  if (existing) {
    if (existing.status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'เบอร์โทรศัพท์นี้ลงทะเบียนแล้ว'
      });
    }
    // If pending, allow re-registration
  }

  // Generate OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Generate random avatar seed
  const avatarSeed = Math.random().toString(36).substring(2, 10);
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

  if (existing) {
    // Update existing pending record
    await update(
      `UPDATE listeners SET
        nickname = ?,
        email = ?,
        age = ?,
        motivation = ?,
        avatar_url = ?,
        avatar_seed = ?,
        otp_code = ?,
        otp_expires_at = ?,
        updated_at = NOW()
      WHERE phone = ?`,
      [nickname, email || null, age || null, motivation || null, avatarUrl, avatarSeed, otpCode, otpExpiresAt, phone]
    );
  } else {
    // Insert new record
    await insert(
      `INSERT INTO listeners (
        nickname, phone, email, age, motivation,
        avatar_url, avatar_seed, otp_code, otp_expires_at,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [nickname, phone, email || null, age || null, motivation || null, avatarUrl, avatarSeed, otpCode, otpExpiresAt]
    );
  }

  // TODO: Send OTP via SMS using ThaiBulkSMS
  // For now, return OTP in test mode
  const isTestMode = process.env.NODE_ENV !== 'production';

  console.log(`Listener registration OTP for ${phone}: ${otpCode}`);

  return res.json({
    success: true,
    message: 'ส่ง OTP ไปยังเบอร์โทรของคุณแล้ว',
    phone: phone.substring(0, 3) + '****' + phone.substring(7),
    expiresIn: 600, // seconds
    ...(isTestMode && { testOtp: otpCode })
  });
}

/**
 * Verify OTP
 */
async function handleVerifyOtp(req, res) {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอกเบอร์โทรและ OTP'
    });
  }

  const listener = await queryOne(
    'SELECT id, otp_code, otp_expires_at FROM listeners WHERE phone = ?',
    [phone]
  );

  if (!listener) {
    return res.status(400).json({
      success: false,
      error: 'ไม่พบข้อมูลการลงทะเบียน'
    });
  }

  if (listener.otp_code !== otp) {
    return res.status(400).json({
      success: false,
      error: 'OTP ไม่ถูกต้อง'
    });
  }

  if (new Date(listener.otp_expires_at) < new Date()) {
    return res.status(400).json({
      success: false,
      error: 'OTP หมดอายุแล้ว กรุณาขอ OTP ใหม่'
    });
  }

  // Generate login token
  const loginToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Update listener status
  await update(
    `UPDATE listeners SET
      status = 'active',
      phone_verified = 1,
      verified_at = NOW(),
      otp_code = NULL,
      otp_expires_at = NULL,
      login_token = ?,
      token_expires_at = ?,
      updated_at = NOW()
    WHERE id = ?`,
    [loginToken, tokenExpiresAt, listener.id]
  );

  // Get updated listener data
  const updatedListener = await queryOne(
    'SELECT id, nickname, phone, email, avatar_url, status FROM listeners WHERE id = ?',
    [listener.id]
  );

  return res.json({
    success: true,
    message: 'ลงทะเบียนสำเร็จ! ยินดีต้อนรับสู่ Mind Fitness Listener',
    listener: {
      id: updatedListener.id,
      nickname: updatedListener.nickname,
      avatarUrl: updatedListener.avatar_url,
      status: updatedListener.status
    },
    token: loginToken
  });
}

/**
 * Resend OTP
 */
async function handleResendOtp(req, res) {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'กรุณาระบุเบอร์โทรศัพท์'
    });
  }

  const listener = await queryOne(
    'SELECT id FROM listeners WHERE phone = ?',
    [phone]
  );

  if (!listener) {
    return res.status(400).json({
      success: false,
      error: 'ไม่พบข้อมูลการลงทะเบียน'
    });
  }

  // Generate new OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await update(
    'UPDATE listeners SET otp_code = ?, otp_expires_at = ?, updated_at = NOW() WHERE id = ?',
    [otpCode, otpExpiresAt, listener.id]
  );

  // TODO: Send OTP via SMS
  const isTestMode = process.env.NODE_ENV !== 'production';

  return res.json({
    success: true,
    message: 'ส่ง OTP ใหม่แล้ว',
    expiresIn: 600,
    ...(isTestMode && { testOtp: otpCode })
  });
}

/**
 * Login with token
 */
async function handleLogin(req, res) {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'กรุณาระบุ token'
    });
  }

  const listener = await queryOne(
    `SELECT id, nickname, phone, email, avatar_url, status, token_expires_at
     FROM listeners WHERE login_token = ?`,
    [token]
  );

  if (!listener) {
    return res.status(401).json({
      success: false,
      error: 'Token ไม่ถูกต้อง'
    });
  }

  if (new Date(listener.token_expires_at) < new Date()) {
    return res.status(401).json({
      success: false,
      error: 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่'
    });
  }

  return res.json({
    success: true,
    listener: {
      id: listener.id,
      nickname: listener.nickname,
      avatarUrl: listener.avatar_url,
      status: listener.status
    }
  });
}

/**
 * Get listener profile
 */
async function handleGetProfile(req, res) {
  const { listenerId } = req.body;

  if (!listenerId) {
    return res.status(400).json({
      success: false,
      error: 'กรุณาระบุ listenerId'
    });
  }

  const listener = await queryOne(
    `SELECT id, nickname, avatar_url, status, is_online, is_available,
            total_chats, total_minutes, avg_rating, created_at
     FROM listeners WHERE id = ? AND status = 'active'`,
    [listenerId]
  );

  if (!listener) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบข้อมูล Listener'
    });
  }

  return res.json({
    success: true,
    listener: {
      id: listener.id,
      nickname: listener.nickname,
      avatarUrl: listener.avatar_url,
      isOnline: listener.is_online === 1,
      isAvailable: listener.is_available === 1,
      stats: {
        totalChats: listener.total_chats,
        totalMinutes: listener.total_minutes,
        avgRating: parseFloat(listener.avg_rating) || 0
      },
      memberSince: listener.created_at
    }
  });
}

/**
 * Update listener online/available status
 */
async function handleUpdateStatus(req, res) {
  const { token, isOnline, isAvailable } = req.body;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'กรุณาเข้าสู่ระบบ'
    });
  }

  const listener = await queryOne(
    'SELECT id FROM listeners WHERE login_token = ? AND status = \'active\'',
    [token]
  );

  if (!listener) {
    return res.status(401).json({
      success: false,
      error: 'Token ไม่ถูกต้อง'
    });
  }

  const updates = [];
  const params = [];

  if (typeof isOnline === 'boolean') {
    updates.push('is_online = ?');
    params.push(isOnline ? 1 : 0);
    if (isOnline) {
      updates.push('last_online_at = NOW()');
    }
  }

  if (typeof isAvailable === 'boolean') {
    updates.push('is_available = ?');
    params.push(isAvailable ? 1 : 0);
  }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    params.push(listener.id);

    await update(
      `UPDATE listeners SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  return res.json({
    success: true,
    message: 'อัพเดทสถานะสำเร็จ'
  });
}
