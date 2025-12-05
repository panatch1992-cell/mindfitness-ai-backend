/**
 * Slip Verification Utility
 *
 * Uses SlipOK API (slipok.com) for automatic Thai bank slip verification
 * Free Plan: 50 requests/month
 * Supports PromptPay, bank transfers, and mobile banking slips
 */

import { query, queryOne } from './database.js';

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
 * @param {string} slipData - Base64 encoded slip image (data:image/xxx;base64,...)
 * @param {number} expectedAmount - Expected payment amount
 * @param {string} orderId - Order ID for logging
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function verifySlip(slipData, expectedAmount, orderId) {
  // Check if SlipOK is configured
  if (!SLIPOK_CONFIG.apiKey || !SLIPOK_CONFIG.branchId) {
    console.warn('SlipOK API not configured, falling back to OTP verification');
    return {
      success: false,
      requiresManual: true,
      error: 'Auto-verify not configured'
    };
  }

  try {
    // Extract base64 data and mime type
    const matches = slipData.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return {
        success: false,
        error: 'Invalid image format'
      };
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Create form data for SlipOK API
    // SlipOK accepts multipart/form-data with 'files' field
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    const fileName = `slip.${mimeType.split('/')[1] || 'png'}`;

    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="files"; filename="${fileName}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`
      ),
      imageBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    // Call SlipOK API
    const response = await fetch(
      `${SLIPOK_CONFIG.apiUrl}/${SLIPOK_CONFIG.branchId}`,
      {
        method: 'POST',
        headers: {
          'x-authorization': SLIPOK_CONFIG.apiKey,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: body
      }
    );

    const result = await response.json();

    // Log verification attempt
    await logVerification(orderId, 'slipok', result, response.ok && result.success);

    // Check API response
    if (!response.ok) {
      console.error('SlipOK API error:', response.status, result);
      return {
        success: false,
        error: result.message || `API Error: ${response.status}`,
        apiError: true
      };
    }

    if (!result.success) {
      return {
        success: false,
        error: result.message || 'ไม่สามารถอ่านข้อมูลสลิปได้',
        data: result
      };
    }

    // Extract slip data
    const slipInfo = result.data;

    // Validate amount matches
    const slipAmount = parseFloat(slipInfo.amount);
    const amountDiff = Math.abs(slipAmount - expectedAmount);

    if (amountDiff > 1) { // Allow 1 baht tolerance
      return {
        success: false,
        error: `ยอดเงินไม่ตรง: สลิป ${slipAmount.toLocaleString()} บาท, คาดหวัง ${expectedAmount.toLocaleString()} บาท`,
        amountMismatch: true,
        slipAmount,
        expectedAmount,
        data: slipInfo
      };
    }

    // Validate receiver matches our PromptPay
    const isValidReceiver = validateReceiver(slipInfo);

    if (!isValidReceiver) {
      console.warn('Receiver mismatch but amount OK, allowing payment');
    }

    // Success!
    return {
      success: true,
      amountVerified: true,
      receiverVerified: isValidReceiver,
      data: {
        transactionRef: slipInfo.transRef,
        senderName: slipInfo.sender?.displayName || slipInfo.sender?.name || 'ไม่ระบุ',
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
      error: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป',
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
  const receiverName = (slipInfo.receiver?.displayName || slipInfo.receiver?.name || '').toLowerCase();

  // Check if PromptPay ID matches (last 4 digits)
  const last4Digits = RECEIVER_CONFIG.promptpayId.slice(-4);
  if (receiverAccount.includes(last4Digits)) {
    return true;
  }

  // Check if name contains expected name parts
  const nameParts = ['พณัฐ', 'เชื้อประเสริฐ', 'panat', 'chue'];
  for (const part of nameParts) {
    if (receiverName.includes(part.toLowerCase())) {
      return true;
    }
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
      JSON.stringify(response).substring(0, 5000), // Limit payload size
      isSuccess ? 1 : 0,
      data.sender?.displayName || data.sender?.name || null,
      data.receiver?.displayName || data.receiver?.name || null,
      data.amount || null,
      data.transRef || null,
      data.transDate ? new Date(`${data.transDate} ${data.transTime || '00:00:00'}`) : null
    ]);
  } catch (error) {
    // Don't fail the verification if logging fails
    console.error('Error logging verification:', error.message);
  }
}

/**
 * Check daily/monthly usage for SlipOK free plan
 */
export async function getUsageStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    const stats = await queryOne(`
      SELECT
        COUNT(CASE WHEN DATE(request_time) = ? THEN 1 END) as today_count,
        COUNT(CASE WHEN request_time >= ? THEN 1 END) as month_count
      FROM slip_verifications
      WHERE verification_method = 'slipok'
    `, [today, monthStart]);

    return {
      today: stats?.today_count || 0,
      month: stats?.month_count || 0,
      freeLimit: 50,
      remaining: Math.max(0, 50 - (stats?.month_count || 0))
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return { today: 0, month: 0, freeLimit: 50, remaining: 50 };
  }
}

/**
 * Manual verification (for admin use)
 */
export async function manualVerify(orderId, adminId, notes = '') {
  try {
    const updateSql = `
      UPDATE orders
      SET status = 'verified',
          verified_at = NOW(),
          verified_by = ?
      WHERE order_id = ?
    `;
    await query(updateSql, [adminId, orderId]);

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
  isOrderVerified,
  getUsageStats
};
