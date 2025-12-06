/**
 * Payment API Handler
 *
 * Handles payment processing via OTP verification and premium subscription.
 * Aligned with database schema (otp_requests, premium_subscriptions).
 */

import { setCORSHeaders } from '../utils/config.js';
import {
  createOTPRequest,
  verifyOTP,
  verifyPremiumByPhone,
  query,
} from '../utils/database.js';

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
      case 'request-otp':
        return await handleRequestOTP(res, req.body);

      case 'verify-otp':
        return await handleVerifyOTP(res, req.body);

      case 'verify-premium':
        return await handleVerifyPremium(res, req.body.phone);

      case 'generate-qr':
        return await handleGenerateQR(res, req.body);

      case 'check-status':
        return await handleCheckStatus(res, req.body.phone);

      default:
        // Default action: generate QR (backward compatibility)
        return await handleGenerateQR(res, req.body);
    }
  } catch (error) {
    console.error('Payment Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Requests OTP for payment verification
 */
async function handleRequestOTP(res, { phone, email, amount }) {
  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Phone number is required',
    });
  }

  // Clean phone number
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  if (cleanPhone.length < 9 || cleanPhone.length > 10) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number format',
    });
  }

  // Create OTP request in database
  const result = await createOTPRequest({
    phone: cleanPhone,
    email: email || null,
    amount: amount || 59,
  });

  if (!result.success) {
    console.error('Failed to create OTP request:', result.error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create OTP request',
    });
  }

  // In production, you would send SMS here via ThaiBulkSMS or similar
  // For now, we return success and the OTP would be sent separately

  return res.status(200).json({
    success: true,
    requestId: result.insertId,
    message: 'OTP request created. Please check your SMS.',
    // Note: OTP code is NOT returned here for security - it's sent via SMS
  });
}

/**
 * Verifies OTP and activates premium subscription
 */
async function handleVerifyOTP(res, { phone, otp }) {
  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      error: 'Phone number and OTP are required',
    });
  }

  // Clean phone number
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  // Verify OTP
  const result = await verifyOTP(cleanPhone, otp);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error || 'Invalid or expired OTP',
    });
  }

  return res.status(200).json({
    success: true,
    isPremium: true,
    subscription: {
      expiresAt: result.data.subscription?.expires_at,
      startedAt: result.data.subscription?.started_at,
    },
    message: 'Premium activated successfully!',
  });
}

/**
 * Verifies if a phone number has active premium subscription
 */
async function handleVerifyPremium(res, phone) {
  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Phone number is required',
    });
  }

  // Clean phone number
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  const result = await verifyPremiumByPhone(cleanPhone);

  if (result.success && result.data) {
    return res.status(200).json({
      success: true,
      isPremium: true,
      subscription: {
        expiresAt: result.data.expires_at,
        startedAt: result.data.started_at,
      },
      message: 'Premium subscription active',
    });
  }

  return res.status(200).json({
    success: true,
    isPremium: false,
    message: 'No active premium subscription',
  });
}

/**
 * Generates QR code data for payment (PromptPay)
 */
async function handleGenerateQR(res, { amount, phone }) {
  const finalAmount = amount || 59;

  // Clean phone number if provided
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;

  // Create OTP request to track the payment
  let requestId = null;
  if (cleanPhone) {
    const otpResult = await createOTPRequest({
      phone: cleanPhone,
      amount: finalAmount,
    });
    if (otpResult.success) {
      requestId = otpResult.insertId;
    }
  }

  return res.status(200).json({
    success: true,
    amount: finalAmount,
    requestId: requestId,
    message: 'QR Code generated',
    // PromptPay QR data (frontend can generate QR from this)
    promptpay: {
      id: process.env.PROMPTPAY_ID || '0997816680',
      amount: finalAmount,
    },
    // Instructions for user
    instructions: {
      th: `1. สแกน QR Code จ่ายเงิน ${finalAmount} บาท\n2. แนบสลิปหรือกรอก OTP เพื่อยืนยัน`,
      en: `1. Scan QR Code to pay ${finalAmount} THB\n2. Upload slip or enter OTP to verify`,
    },
  });
}

/**
 * Checks payment/subscription status by phone
 */
async function handleCheckStatus(res, phone) {
  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Phone number is required',
    });
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');

  // Check premium subscription
  const premiumResult = await verifyPremiumByPhone(cleanPhone);

  // Check pending OTP requests
  const otpResult = await query(
    `SELECT * FROM otp_requests
     WHERE phone = ? AND status = 'pending' AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [cleanPhone]
  );

  return res.status(200).json({
    success: true,
    isPremium: !!(premiumResult.success && premiumResult.data),
    subscription: premiumResult.data ? {
      expiresAt: premiumResult.data.expires_at,
      startedAt: premiumResult.data.started_at,
    } : null,
    hasPendingPayment: !!(otpResult.success && otpResult.data && otpResult.data.length > 0),
    pendingAmount: otpResult.data?.[0]?.amount || null,
  });
}
