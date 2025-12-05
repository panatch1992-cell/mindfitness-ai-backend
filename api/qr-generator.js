/**
 * Dynamic PromptPay QR Generator API
 *
 * Generates QR codes for consultation payments with variable amounts
 * Uses promptpay-qr library (no API costs)
 */

import { setCORSHeaders } from '../utils/config.js';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';

// PromptPay account configuration
const PROMPTPAY_CONFIG = {
  // Use phone number or national ID for PromptPay
  // Format: 10-digit phone (0812345678) or 13-digit ID
  accountId: process.env.PROMPTPAY_ID || '0812345678', // Configure in environment
  accountName: 'นายพณัฐ เชื้อประเสริฐศักดิ์'
};

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer;
  setCORSHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, amount, orderId, psychologistId, psychologistName } =
      req.method === 'POST' ? req.body : req.query;

    switch (action) {
      case 'generate':
        return handleGenerateQR(req, res, { amount, orderId, psychologistId, psychologistName });
      default:
        return res.status(400).json({ error: 'Invalid action. Use action=generate' });
    }
  } catch (error) {
    console.error('QR Generator Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Generate PromptPay QR Code
 */
async function handleGenerateQR(req, res, params) {
  const { amount, orderId, psychologistId, psychologistName } = params;

  // Validate amount
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount < 1 || numAmount > 100000) {
    return res.status(400).json({
      error: 'จำนวนเงินไม่ถูกต้อง (1-100,000 บาท)'
    });
  }

  try {
    // Generate PromptPay payload
    // The promptpay-qr library creates EMVCo QR code payload
    const payload = generatePayload(PROMPTPAY_CONFIG.accountId, { amount: numAmount });

    // Generate QR code as base64 data URL
    const qrCodeDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Generate reference number for tracking
    const referenceNo = orderId || `PP${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return res.json({
      success: true,
      qrCode: {
        dataUrl: qrCodeDataUrl,
        payload: payload, // Raw payload for debugging
        amount: numAmount,
        accountName: PROMPTPAY_CONFIG.accountName,
        referenceNo: referenceNo,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        psychologistId: psychologistId || null,
        psychologistName: psychologistName || null
      },
      message: `กรุณาสแกน QR Code เพื่อชำระเงิน ${numAmount.toLocaleString()} บาท`
    });

  } catch (error) {
    console.error('QR Generation Error:', error);
    return res.status(500).json({
      error: 'ไม่สามารถสร้าง QR Code ได้ กรุณาลองใหม่'
    });
  }
}
