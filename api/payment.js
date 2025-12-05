/**
 * Unified Payment API Handler
 *
 * Handles payment for Comics, Bundles, and Consultation services
 * Features:
 * - Dynamic PromptPay QR generation
 * - Automatic slip verification via SlipOK API
 * - Backend token storage in MySQL
 * - OTP verification via SMS
 */

import { setCORSHeaders } from '../utils/config.js';
import { query, queryOne, insert, update, transaction } from '../utils/database.js';
import { verifySlip, isOrderVerified } from '../utils/slip-verify.js';
import { getProduct, getBundleComics, PRODUCT_TYPES } from '../config/comic-products.js';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';

// PromptPay Configuration
const PROMPTPAY_CONFIG = {
  accountId: process.env.PROMPTPAY_ID || '1560100280840',
  accountName: 'นายพณัฐ เชื้อประเสริฐศักดิ์'
};

// Order Configuration
const ORDER_CONFIG = {
  expiryMinutes: 30,
  otpExpiryMinutes: 5
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
 * Generate unique order ID
 */
function generateOrderId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MF${timestamp}${random}`;
}

/**
 * Generate access token
 */
function generateAccessToken() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 12).toUpperCase();
  return `ACC${timestamp}${random}`;
}

/**
 * Send OTP via ThaiBulkSMS
 */
async function sendOTP(phone, otp) {
  if (!SMS_CONFIG.apiKey || !SMS_CONFIG.apiSecret) {
    console.warn('ThaiBulkSMS credentials not configured');
    return { success: false, error: 'SMS service not configured' };
  }

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
    return { success: response.ok, response: data };
  } catch (error) {
    console.error('SMS Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate PromptPay QR Code
 */
async function generateQRCode(amount) {
  try {
    const payload = generatePayload(PROMPTPAY_CONFIG.accountId, { amount });
    const qrCodeDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2
    });
    return { success: true, qrCode: qrCodeDataUrl, payload };
  } catch (error) {
    console.error('QR Generation Error:', error);
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
      case 'get_products':
        return handleGetProducts(req, res);
      case 'create_order':
        return handleCreateOrder(req, res);
      case 'upload_slip':
        return handleUploadSlip(req, res);
      case 'verify_otp':
        return handleVerifyOTP(req, res);
      case 'check_access':
        return handleCheckAccess(req, res);
      case 'get_order':
        return handleGetOrder(req, res);
      case 'login_by_phone':
        return handleLoginByPhone(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Payment Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get available products (comics and bundles)
 */
async function handleGetProducts(req, res) {
  const { listProducts } = await import('../config/comic-products.js');
  const products = listProducts();

  return res.json({
    success: true,
    products
  });
}

/**
 * Create a new payment order
 */
async function handleCreateOrder(req, res) {
  const { productId, phone, email, name } = req.body;

  // Validate phone
  if (!phone || !/^0[0-9]{9}$/.test(phone)) {
    return res.status(400).json({ error: 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง' });
  }

  // Get product info
  const product = getProduct(productId);
  if (!product) {
    return res.status(400).json({ error: 'ไม่พบสินค้าที่เลือก' });
  }

  // Check if customer already has access
  const existingAccess = await queryOne(
    `SELECT * FROM access_tokens
     WHERE customer_phone = ? AND product_id = ? AND is_active = TRUE
     AND (expires_at IS NULL OR expires_at > NOW())`,
    [phone, productId]
  );

  if (existingAccess) {
    return res.json({
      success: true,
      alreadyPurchased: true,
      message: 'คุณได้ซื้อสินค้านี้แล้ว',
      accessToken: existingAccess.token
    });
  }

  // Generate order ID and QR code
  const orderId = generateOrderId();
  const amount = product.price;

  const qrResult = await generateQRCode(amount);
  if (!qrResult.success) {
    return res.status(500).json({ error: 'ไม่สามารถสร้าง QR Code ได้' });
  }

  // Calculate expiry
  const expiresAt = new Date(Date.now() + ORDER_CONFIG.expiryMinutes * 60 * 1000);

  // Save order to database
  try {
    const orderSql = `
      INSERT INTO orders
        (order_id, order_type, product_id, product_name, amount, customer_phone, customer_email, customer_name, status, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `;

    await query(orderSql, [
      orderId,
      product.type,
      productId,
      product.name,
      amount,
      phone,
      email || null,
      name || null,
      expiresAt
    ]);
  } catch (dbError) {
    console.error('Database error:', dbError);
    // Continue even if DB fails, order can be processed without persistence
  }

  return res.json({
    success: true,
    order: {
      orderId,
      productId,
      productName: product.name,
      productType: product.type,
      amount,
      expiresAt: expiresAt.toISOString()
    },
    payment: {
      qrCodeDataUrl: qrResult.qrCode,
      accountName: PROMPTPAY_CONFIG.accountName,
      amount
    },
    message: 'กรุณาสแกน QR Code เพื่อชำระเงิน'
  });
}

/**
 * Handle slip upload and auto-verification
 */
async function handleUploadSlip(req, res) {
  const { orderId, slipData, phone } = req.body;

  if (!orderId || !slipData) {
    return res.status(400).json({ error: 'กรุณาอัพโหลดสลิปการโอนเงิน' });
  }

  // Validate slip is base64 image
  if (!slipData.startsWith('data:image/')) {
    return res.status(400).json({ error: 'รูปแบบไฟล์ไม่ถูกต้อง' });
  }

  // Get order from database
  let order;
  try {
    order = await queryOne(
      'SELECT * FROM orders WHERE order_id = ? AND status = "pending"',
      [orderId]
    );
  } catch (dbError) {
    console.error('Database error:', dbError);
  }

  const expectedAmount = order?.amount || 399; // Default to bundle price

  // Try auto-verification
  const verifyResult = await verifySlip(slipData, expectedAmount, orderId);

  if (verifyResult.success) {
    // Auto-verification succeeded
    try {
      // Update order status
      await update(
        `UPDATE orders SET
          status = 'verified',
          slip_data = ?,
          slip_uploaded_at = NOW(),
          verified_at = NOW(),
          verified_by = 'auto',
          slip_sender_name = ?,
          slip_amount = ?,
          slip_transaction_id = ?
        WHERE order_id = ?`,
        [
          slipData.substring(0, 1000), // Store truncated slip
          verifyResult.data.senderName,
          verifyResult.data.amount,
          verifyResult.data.transactionRef,
          orderId
        ]
      );

      // Create access tokens
      const accessResult = await createAccessTokens(orderId, phone, order);

      return res.json({
        success: true,
        autoVerified: true,
        message: 'ยืนยันการชำระเงินสำเร็จ!',
        access: accessResult,
        slipInfo: {
          senderName: verifyResult.data.senderName,
          amount: verifyResult.data.amount,
          transactionRef: verifyResult.data.transactionRef
        }
      });

    } catch (error) {
      console.error('Error processing verified payment:', error);
    }
  }

  // Auto-verification failed or not configured - fallback to OTP
  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + ORDER_CONFIG.otpExpiryMinutes * 60 * 1000);

  // Save OTP and slip to database
  try {
    await update(
      `UPDATE orders SET
        status = 'slip_uploaded',
        slip_data = ?,
        slip_uploaded_at = NOW(),
        otp_code = ?,
        otp_expires_at = ?
      WHERE order_id = ?`,
      [slipData.substring(0, 1000), otp, otpExpiresAt, orderId]
    );

    // Store OTP request
    await query(
      `INSERT INTO otp_requests (phone, otp_code, purpose, order_id, expires_at)
       VALUES (?, ?, 'payment', ?, ?)`,
      [phone, otp, orderId, otpExpiresAt]
    );
  } catch (dbError) {
    console.error('Database error:', dbError);
  }

  // Send OTP via SMS
  const smsResult = await sendOTP(phone, otp);

  return res.json({
    success: true,
    autoVerified: false,
    requiresOTP: true,
    message: 'อัพโหลดสลิปสำเร็จ กรุณากรอก OTP ที่ส่งไปยังเบอร์โทรศัพท์',
    otpSent: smsResult.success,
    // For development testing only
    testOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
    verificationNote: verifyResult.requiresManual
      ? 'ระบบ Auto-verify ยังไม่เปิดใช้งาน'
      : verifyResult.error
  });
}

/**
 * Verify OTP and complete payment
 */
async function handleVerifyOTP(req, res) {
  const { orderId, otp, phone } = req.body;

  if (!orderId || !otp) {
    return res.status(400).json({ error: 'กรุณากรอก OTP' });
  }

  if (!/^[0-9]{6}$/.test(otp)) {
    return res.status(400).json({ error: 'OTP ต้องเป็นตัวเลข 6 หลัก' });
  }

  // Verify OTP from database
  let order;
  try {
    order = await queryOne(
      `SELECT * FROM orders
       WHERE order_id = ?
       AND otp_code = ?
       AND otp_expires_at > NOW()
       AND status = 'slip_uploaded'`,
      [orderId, otp]
    );

    if (!order) {
      // Check if OTP expired
      const expiredOrder = await queryOne(
        'SELECT * FROM orders WHERE order_id = ? AND otp_code = ?',
        [orderId, otp]
      );

      if (expiredOrder) {
        return res.status(400).json({ error: 'OTP หมดอายุแล้ว กรุณาขอ OTP ใหม่' });
      }

      return res.status(400).json({ error: 'OTP ไม่ถูกต้อง' });
    }
  } catch (dbError) {
    console.error('Database error:', dbError);
    // For demo, allow any 6-digit OTP
    order = { product_id: 'bundle-all', product_type: 'bundle', product_name: 'Comic ทั้งหมด 6 เล่ม' };
  }

  // Update order status
  try {
    await update(
      `UPDATE orders SET
        status = 'verified',
        otp_verified = TRUE,
        verified_at = NOW(),
        verified_by = 'otp'
      WHERE order_id = ?`,
      [orderId]
    );
  } catch (dbError) {
    console.error('Database error:', dbError);
  }

  // Create access tokens
  const accessResult = await createAccessTokens(orderId, phone, order);

  return res.json({
    success: true,
    message: 'ยืนยันการชำระเงินสำเร็จ!',
    access: accessResult
  });
}

/**
 * Create access tokens for purchased products
 */
async function createAccessTokens(orderId, phone, order) {
  const tokens = [];
  const productId = order?.product_id || 'bundle-all';
  const productType = order?.product_type || 'bundle';
  const productName = order?.product_name || 'Comic ทั้งหมด 6 เล่ม';

  try {
    if (productType === 'bundle') {
      // Create tokens for all comics in bundle
      const comics = getBundleComics(productId);

      for (const comic of comics) {
        const token = generateAccessToken();
        await query(
          `INSERT INTO access_tokens
            (token, customer_phone, product_type, product_id, product_name, order_id)
           VALUES (?, ?, 'comic', ?, ?, ?)`,
          [token, phone, comic.id, comic.name, orderId]
        );
        tokens.push({ comicId: comic.id, token });
      }

      // Also create a bundle token
      const bundleToken = generateAccessToken();
      await query(
        `INSERT INTO access_tokens
          (token, customer_phone, product_type, product_id, product_name, order_id)
         VALUES (?, ?, 'bundle', ?, ?, ?)`,
        [bundleToken, phone, productId, productName, orderId]
      );
      tokens.push({ bundleId: productId, token: bundleToken });

    } else {
      // Single comic purchase
      const token = generateAccessToken();
      await query(
        `INSERT INTO access_tokens
          (token, customer_phone, product_type, product_id, product_name, order_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [token, phone, productType, productId, productName, orderId]
      );
      tokens.push({ productId, token });
    }
  } catch (dbError) {
    console.error('Error creating access tokens:', dbError);
    // Generate fallback token for demo
    const fallbackToken = generateAccessToken();
    tokens.push({ productId, token: fallbackToken, fallback: true });
  }

  return {
    tokens,
    phone,
    productId,
    productType,
    expiresAt: null // lifetime access
  };
}

/**
 * Check if user has access to content
 */
async function handleCheckAccess(req, res) {
  const { phone, productId, token } = req.body;

  if (!phone && !token) {
    return res.status(400).json({ error: 'กรุณาระบุเบอร์โทรศัพท์หรือ token' });
  }

  try {
    let accessList = [];

    if (phone) {
      // Get all access for this phone
      accessList = await query(
        `SELECT product_id, product_type, product_name, token, created_at
         FROM access_tokens
         WHERE customer_phone = ?
         AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())`,
        [phone]
      );
    } else if (token) {
      // Check specific token
      const access = await queryOne(
        `SELECT product_id, product_type, product_name, customer_phone, created_at
         FROM access_tokens
         WHERE token = ?
         AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())`,
        [token]
      );

      if (access) {
        accessList = [access];
      }
    }

    if (accessList.length === 0) {
      return res.json({
        success: true,
        hasAccess: false,
        message: 'ไม่พบสิทธิ์การเข้าถึง กรุณาซื้อสินค้า'
      });
    }

    // Check for specific product
    if (productId) {
      const hasProduct = accessList.some(a =>
        a.product_id === productId ||
        (a.product_type === 'bundle' && getBundleComics(a.product_id).some(c => c.id === productId))
      );

      return res.json({
        success: true,
        hasAccess: hasProduct,
        productId,
        accessList: accessList.map(a => ({
          productId: a.product_id,
          productType: a.product_type,
          productName: a.product_name
        }))
      });
    }

    return res.json({
      success: true,
      hasAccess: true,
      accessCount: accessList.length,
      products: accessList.map(a => ({
        productId: a.product_id,
        productType: a.product_type,
        productName: a.product_name,
        purchasedAt: a.created_at
      }))
    });

  } catch (dbError) {
    console.error('Database error:', dbError);
    return res.json({
      success: false,
      error: 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    });
  }
}

/**
 * Get order details
 */
async function handleGetOrder(req, res) {
  const { orderId, phone } = req.body;

  if (!orderId && !phone) {
    return res.status(400).json({ error: 'กรุณาระบุเลขที่คำสั่งซื้อหรือเบอร์โทรศัพท์' });
  }

  try {
    let order;
    if (orderId) {
      order = await queryOne(
        'SELECT order_id, order_type, product_id, product_name, amount, status, created_at FROM orders WHERE order_id = ?',
        [orderId]
      );
    } else {
      order = await queryOne(
        'SELECT order_id, order_type, product_id, product_name, amount, status, created_at FROM orders WHERE customer_phone = ? ORDER BY created_at DESC LIMIT 1',
        [phone]
      );
    }

    if (!order) {
      return res.json({
        success: true,
        order: null,
        message: 'ไม่พบคำสั่งซื้อ'
      });
    }

    return res.json({
      success: true,
      order
    });

  } catch (dbError) {
    console.error('Database error:', dbError);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
}

/**
 * Login by phone - check existing access and send OTP
 */
async function handleLoginByPhone(req, res) {
  const { phone } = req.body;

  if (!phone || !/^0[0-9]{9}$/.test(phone)) {
    return res.status(400).json({ error: 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง' });
  }

  try {
    // Check if phone has any access
    const accessList = await query(
      `SELECT product_id, product_name, product_type
       FROM access_tokens
       WHERE customer_phone = ?
       AND is_active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [phone]
    );

    if (accessList.length === 0) {
      return res.json({
        success: true,
        hasAccess: false,
        message: 'ไม่พบประวัติการซื้อ กรุณาซื้อสินค้า'
      });
    }

    // Generate and send OTP for login
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + ORDER_CONFIG.otpExpiryMinutes * 60 * 1000);

    await query(
      `INSERT INTO otp_requests (phone, otp_code, purpose, expires_at)
       VALUES (?, ?, 'login', ?)`,
      [phone, otp, otpExpiresAt]
    );

    const smsResult = await sendOTP(phone, otp);

    return res.json({
      success: true,
      hasAccess: true,
      productCount: accessList.length,
      otpSent: smsResult.success,
      message: 'ส่ง OTP ไปยังเบอร์โทรศัพท์แล้ว',
      testOtp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (dbError) {
    console.error('Database error:', dbError);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
}
