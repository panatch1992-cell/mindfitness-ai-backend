/**
 * Slip Verification Utility
 *
 * Uses SlipOK API (slipok.com) for automatic Thai bank slip verification
 * Supports PromptPay, bank transfers, and mobile banking slips
 */

import { query, queryOne, insert } from './database.js';

// SlipOK API Configuration
const SLIPOK_CONFIG = {
  apiUrl: 'https://api.slipok.com/api/line/apikey',
  apiKey: process.env.SLIPOK_API_KEY || '',
  branchId: process.env.SLIPOK_BRANCH_ID || ''
};

// Expected PromptPay receiver info for validation
const RECEIVER_CONFIG = {
  promptpayId: process.env.PROMPTPAY_ID || '1560100280840',
  accountName: 'นายพณัฐ เชื้อประเสริฐศักดิ์'
};

/**
 * Verify bank slip using SlipOK API
 *
 * @param {string} slipData - Base64 encoded slip image
 * @param {number} expectedAmount - Expected payment amount
 * @param {string} orderId - Order ID for logging
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function verifySlip(slipData, expectedAmount, orderId) {
  // Check if SlipOK is configured
  if (!SLIPOK_CONFIG.apiKey) {
    console.warn('SlipOK API not configured, using manual verification mode');
    return {
      success: false,
      requiresManual: true,
      error: 'Auto-verify not configured'
    };
  }

  try {
    // Remove base64 prefix if present
    let imageData = slipData;
    if (slipData.includes(',')) {
      imageData = slipData.split(',')[1];
    }

    // Call SlipOK API
    const formData = new FormData();
    formData.append('files', base64ToBlob(imageData, 'image/png'));

    const response = await fetch(`${SLIPOK_CONFIG.apiUrl}/${SLIPOK_CONFIG.branchId}`, {
      method: 'POST',
      headers: {
        'x-authorization': SLIPOK_CONFIG.apiKey
      },
      body: formData
    });

    const result = await response.json();

    // Log verification attempt
    await logVerification(orderId, 'slipok', result, response.ok);

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.message || 'Slip verification failed',
        data: result
      };
    }

    // Extract and validate slip data
    const slipInfo = result.data;

    // Validate amount matches
    const slipAmount = parseFloat(slipInfo.amount);
    const amountDiff = Math.abs(slipAmount - expectedAmount);

    if (amountDiff > 0.01) { // Allow 1 satang tolerance
      return {
        success: false,
        error: `ยอดเงินไม่ตรง: สลิป ${slipAmount} บาท, คาดหวัง ${expectedAmount} บาท`,
        amountMismatch: true,
        data: slipInfo
      };
    }

    // Validate receiver (optional but recommended)
    const isValidReceiver = validateReceiver(slipInfo);

    return {
      success: true,
      amountVerified: true,
      receiverVerified: isValidReceiver,
      data: {
        transactionRef: slipInfo.transRef,
        senderName: slipInfo.sender?.displayName || slipInfo.sender?.name,
        senderAccount: slipInfo.sender?.account?.value,
        senderBank: slipInfo.sendingBank,
        receiverName: slipInfo.receiver?.displayName || slipInfo.receiver?.name,
        receiverAccount: slipInfo.receiver?.account?.value,
        receiverBank: slipInfo.receivingBank,
        amount: slipAmount,
        transactionDate: slipInfo.transDate,
        transactionTime: slipInfo.transTime
      }
    };

  } catch (error) {
    console.error('Slip verification error:', error);

    // Log failed attempt
    await logVerification(orderId, 'slipok', { error: error.message }, false);

    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป กรุณาลองใหม่',
      technicalError: error.message
    };
  }
}

/**
 * Validate that the receiver matches our PromptPay account
 */
function validateReceiver(slipInfo) {
  if (!slipInfo.receiver) return false;

  const receiverAccount = slipInfo.receiver?.account?.value || '';
  const receiverName = slipInfo.receiver?.displayName || slipInfo.receiver?.name || '';

  // Check if PromptPay ID matches
  if (receiverAccount.includes(RECEIVER_CONFIG.promptpayId)) {
    return true;
  }

  // Check if name contains expected name
  if (receiverName.includes('พณัฐ') || receiverName.includes('เชื้อประเสริฐศักดิ์')) {
    return true;
  }

  return false;
}

/**
 * Log verification attempt to database
 */
async function logVerification(orderId, method, response, isSuccess) {
  try {
    const sql = `
      INSERT INTO slip_verifications
        (order_id, verification_method, response_payload, response_time, is_success,
         sender_name, receiver_name, amount, transaction_ref, transaction_date)
      VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)
    `;

    const data = response.data || response;
    await query(sql, [
      orderId,
      method,
      JSON.stringify(response),
      isSuccess,
      data.sender?.displayName || data.sender?.name || null,
      data.receiver?.displayName || data.receiver?.name || null,
      data.amount || null,
      data.transRef || null,
      data.transDate ? new Date(`${data.transDate} ${data.transTime || '00:00:00'}`) : null
    ]);
  } catch (error) {
    console.error('Error logging verification:', error.message);
  }
}

/**
 * Convert base64 to Blob for FormData
 */
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Manual verification (for admin use)
 */
export async function manualVerify(orderId, adminId, notes = '') {
  try {
    // Update order status
    const updateSql = `
      UPDATE orders
      SET status = 'verified',
          verified_at = NOW(),
          verified_by = ?
      WHERE order_id = ?
    `;
    await query(updateSql, [adminId, orderId]);

    // Log manual verification
    await logVerification(orderId, 'manual', { adminId, notes }, true);

    return { success: true };
  } catch (error) {
    console.error('Manual verification error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if order has been verified
 */
export async function isOrderVerified(orderId) {
  try {
    const order = await queryOne(
      'SELECT status, verified_at FROM orders WHERE order_id = ?',
      [orderId]
    );
    return order && (order.status === 'verified' || order.status === 'completed');
  } catch (error) {
    console.error('Check verification error:', error);
    return false;
  }
}

export default {
  verifySlip,
  manualVerify,
  isOrderVerified
};
