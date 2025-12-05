/**
 * Payment API Handler
 *
 * Handles payment for Comics and Consultation services
 * Uses Thai QR Payment (PromptPay) with slip verification + OTP
 */

import { setCORSHeaders } from '../utils/config.js';

// Payment configurations
const PAYMENT_CONFIG = {
  comic: {
    amount: 399,
    productName: 'Psychoeducation Comics (6 Volumes)',
    productCode: 'COMIC',
    accessDuration: 'lifetime', // lifetime access
    qrCodeUrl: '/images/qr-code-399.png'
  },
  consultation: {
    minAmount: 500,
    maxAmount: 5000,
    platformFeePercent: 20,
    productCode: 'CONSULT'
  }
};

// ThaiBulkSMS Configuration
const SMS_CONFIG = {
  apiKey: process.env.THAIBULKSMS_API_KEY,
  apiSecret: process.env.THAIBULKSMS_API_SECRET,
  sender: 'MindFitness'
};

/**
 * Generate 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via ThaiBulkSMS
 */
async function sendOTP(phone, otp) {
  if (!SMS_CONFIG.apiKey || !SMS_CONFIG.apiSecret) {
    console.error('ThaiBulkSMS credentials not configured');
    return { success: false, error: 'SMS service not configured' };
  }

  // Format phone number for Thailand
  let formattedPhone = phone.replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '66' + formattedPhone.substring(1);
  }

  const message = `[Mind Fitness] รหัส OTP ของคุณคือ ${otp} (หมดอายุใน 5 นาที)`;

  try {
    const response = await fetch('https://bulk.thaibulksms.com/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${SMS_CONFIG.apiKey}:${SMS_CONFIG.apiSecret}`).toString('base64')}`
      },
      body: JSON.stringify({
        msisdn: formattedPhone,
        message: message,
        sender: SMS_CONFIG.sender
      })
    });

    const data = await response.json();
    return {
      success: response.ok,
      response: data,
      http_code: response.status
    };
  } catch (error) {
    console.error('SMS Error:', error);
    return { success: false, error: error.message };
  }
}

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
      case 'create_order':
        return handleCreateOrder(req, res);
      case 'upload_slip':
        return handleUploadSlip(req, res);
      case 'verify_otp':
        return handleVerifyOTP(req, res);
      case 'check_access':
        return handleCheckAccess(req, res);
      case 'get_config':
        return handleGetConfig(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Payment Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get payment configuration
 */
async function handleGetConfig(req, res) {
  const { productType } = req.body;

  if (productType === 'comic') {
    return res.json({
      success: true,
      config: {
        amount: PAYMENT_CONFIG.comic.amount,
        productName: PAYMENT_CONFIG.comic.productName,
        qrCodeUrl: PAYMENT_CONFIG.comic.qrCodeUrl
      }
    });
  }

  if (productType === 'consultation') {
    return res.json({
      success: true,
      config: {
        minAmount: PAYMENT_CONFIG.consultation.minAmount,
        maxAmount: PAYMENT_CONFIG.consultation.maxAmount,
        platformFeePercent: PAYMENT_CONFIG.consultation.platformFeePercent
      }
    });
  }

  return res.status(400).json({ error: 'Invalid product type' });
}

/**
 * Create a new payment order
 */
async function handleCreateOrder(req, res) {
  const { productType, phone, email, psychologistId, amount } = req.body;

  // Validate phone
  if (!phone || !/^0[0-9]{9}$/.test(phone)) {
    return res.status(400).json({ error: 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง' });
  }

  let orderAmount;
  let productCode;

  if (productType === 'comic') {
    orderAmount = PAYMENT_CONFIG.comic.amount;
    productCode = PAYMENT_CONFIG.comic.productCode;
  } else if (productType === 'consultation') {
    if (!psychologistId || !amount) {
      return res.status(400).json({ error: 'Missing consultation details' });
    }
    orderAmount = amount;
    productCode = PAYMENT_CONFIG.consultation.productCode;
  } else {
    return res.status(400).json({ error: 'Invalid product type' });
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Create order ID
  const orderId = `MF${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // In production, save to database
  // For now, return order details
  const order = {
    orderId,
    productType,
    productCode,
    amount: orderAmount,
    phone,
    email: email || null,
    psychologistId: psychologistId || null,
    otp, // In production, don't return this - it's sent via SMS
    expiresAt: expiresAt.toISOString(),
    status: 'pending_slip'
  };

  // Send OTP via SMS (commented for testing)
  // const smsResult = await sendOTP(phone, otp);
  // if (!smsResult.success) {
  //   return res.status(500).json({ error: 'ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่' });
  // }

  return res.json({
    success: true,
    order: {
      orderId: order.orderId,
      amount: order.amount,
      productType: order.productType,
      qrCodeUrl: productType === 'comic' ? PAYMENT_CONFIG.comic.qrCodeUrl : null,
      expiresAt: order.expiresAt,
      message: 'กรุณาชำระเงินและอัพโหลดสลิป'
    }
  });
}

/**
 * Handle slip upload
 */
async function handleUploadSlip(req, res) {
  const { orderId, slipData, phone } = req.body;

  if (!orderId || !slipData) {
    return res.status(400).json({ error: 'Missing order ID or slip data' });
  }

  // Validate slip is base64 image
  if (!slipData.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid slip format' });
  }

  // Generate new OTP for verification
  const otp = generateOTP();

  // Send OTP via SMS
  const smsResult = await sendOTP(phone, otp);

  return res.json({
    success: true,
    message: 'อัพโหลดสลิปสำเร็จ กรุณากรอก OTP ที่ส่งไปยังเบอร์โทรศัพท์',
    otpSent: smsResult.success,
    // For testing only - remove in production
    testOtp: process.env.NODE_ENV === 'development' ? otp : undefined
  });
}

/**
 * Verify OTP and complete payment
 */
async function handleVerifyOTP(req, res) {
  const { orderId, otp, phone } = req.body;

  if (!orderId || !otp) {
    return res.status(400).json({ error: 'Missing order ID or OTP' });
  }

  // Validate OTP format
  if (!/^[0-9]{6}$/.test(otp)) {
    return res.status(400).json({ error: 'OTP ต้องเป็นตัวเลข 6 หลัก' });
  }

  // In production, verify OTP from database
  // For now, simulate verification

  // Generate access token for comic access
  const accessToken = `ACC${Date.now()}${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  return res.json({
    success: true,
    message: 'ยืนยันการชำระเงินสำเร็จ!',
    access: {
      token: accessToken,
      productType: 'comic',
      expiresAt: null, // lifetime
      phone
    }
  });
}

/**
 * Check if user has access to content
 */
async function handleCheckAccess(req, res) {
  const { phone, productType, accessToken } = req.body;

  if (!phone && !accessToken) {
    return res.status(400).json({ error: 'กรุณาระบุเบอร์โทรศัพท์หรือ access token' });
  }

  // In production, check database for access
  // For now, return mock response

  return res.json({
    success: true,
    hasAccess: false, // Default to no access, check database in production
    message: 'กรุณาชำระเงินเพื่อเข้าถึงเนื้อหา'
  });
}
