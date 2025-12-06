/**
 * Payment API Handler
 *
 * Handles payment processing, QR code generation, and premium verification.
 */

import { setCORSHeaders } from '../utils/config.js';
import { createOrder, verifyPremiumByPhone, query } from '../utils/database.js';

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
    const { action, amount, phone, productId, productType } = req.body;

    switch (action) {
      case 'generate-qr':
        return await handleGenerateQR(res, { amount, phone, productId, productType });

      case 'verify-premium':
        return await handleVerifyPremium(res, phone);

      case 'check-order':
        return await handleCheckOrder(res, req.body.reference);

      default:
        // Default action: generate QR (backward compatibility)
        return await handleGenerateQR(res, { amount, phone, productId, productType });
    }
  } catch (error) {
    console.error('Payment Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Generates QR code for payment and creates order record
 */
async function handleGenerateQR(res, { amount, phone, productId, productType }) {
  const finalAmount = amount || 59;
  const reference = `MF${Date.now()}`;

  // Create order in database
  const orderResult = await createOrder({
    reference: reference,
    productType: productType || productId || 'premium',
    amount: finalAmount,
    phone: phone || null,
  });

  if (!orderResult.success) {
    console.error('Failed to create order:', orderResult.error);
    // Still return success to user, but log the error
  }

  return res.status(200).json({
    success: true,
    reference: reference,
    amount: finalAmount,
    orderId: orderResult.insertId || null,
    message: 'QR Code generated',
    // PromptPay QR data (can be used by frontend to generate QR)
    promptpay: {
      id: process.env.PROMPTPAY_ID || '0997816680',
      amount: finalAmount,
    },
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
 * Checks order status by reference
 */
async function handleCheckOrder(res, reference) {
  if (!reference) {
    return res.status(400).json({
      success: false,
      error: 'Reference is required',
    });
  }

  const result = await query(
    `SELECT * FROM orders WHERE reference_code = ? LIMIT 1`,
    [reference]
  );

  if (result.success && result.data && result.data.length > 0) {
    const order = result.data[0];
    return res.status(200).json({
      success: true,
      order: {
        reference: order.reference_code,
        status: order.status,
        amount: order.amount,
        createdAt: order.created_at,
      },
    });
  }

  return res.status(404).json({
    success: false,
    error: 'Order not found',
  });
}
