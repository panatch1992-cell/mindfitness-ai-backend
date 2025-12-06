/**
 * Database Connection Utility
 *
 * Handles MySQL/MariaDB connection pool for MindFitness platform.
 */

import mysql from 'mysql2/promise';

let pool = null;

/**
 * Database configuration from environment variables
 */
function getDatabaseConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'u786472860_mindfitness_pa',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
}

/**
 * Validates database configuration
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDatabaseConfig() {
  const config = getDatabaseConfig();
  if (!config.host) {
    return { valid: false, error: 'DB_HOST is not configured' };
  }
  if (!config.user) {
    return { valid: false, error: 'DB_USER is not configured' };
  }
  if (!config.database) {
    return { valid: false, error: 'DB_NAME is not configured' };
  }
  return { valid: true };
}

/**
 * Gets or creates the database connection pool
 * @returns {Promise<mysql.Pool>}
 */
export async function getPool() {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = mysql.createPool(config);
  }
  return pool;
}

/**
 * Executes a query with parameters
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function query(sql, params = []) {
  try {
    const dbPool = await getPool();
    const [rows] = await dbPool.execute(sql, params);
    return { success: true, data: rows };
  } catch (error) {
    console.error('Database Query Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Executes a query and returns the first row
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function queryOne(sql, params = []) {
  const result = await query(sql, params);
  if (result.success && result.data && result.data.length > 0) {
    return { success: true, data: result.data[0] };
  }
  return result;
}

/**
 * Inserts a row and returns the insert ID
 * @param {string} table - Table name
 * @param {object} data - Data to insert
 * @returns {Promise<{ success: boolean, insertId?: number, error?: string }>}
 */
export async function insert(table, data) {
  try {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

    const dbPool = await getPool();
    const [result] = await dbPool.execute(sql, values);
    return { success: true, insertId: result.insertId };
  } catch (error) {
    console.error('Database Insert Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Updates rows in a table
 * @param {string} table - Table name
 * @param {object} data - Data to update
 * @param {string} where - WHERE clause
 * @param {Array} whereParams - WHERE parameters
 * @returns {Promise<{ success: boolean, affectedRows?: number, error?: string }>}
 */
export async function update(table, data, where, whereParams = []) {
  try {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;

    const dbPool = await getPool();
    const [result] = await dbPool.execute(sql, [...values, ...whereParams]);
    return { success: true, affectedRows: result.affectedRows };
  } catch (error) {
    console.error('Database Update Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Tests database connection
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function testConnection() {
  try {
    const dbPool = await getPool();
    await dbPool.execute('SELECT 1');
    return { success: true };
  } catch (error) {
    console.error('Database Connection Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Closes the connection pool
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ============================================
// SPECIFIC DATABASE OPERATIONS
// Aligned with actual database schema
// ============================================

/**
 * Creates a new chat room
 * Schema: room_id, user1_session, user1_nickname, user2_session, user2_nickname,
 *         listener_id, is_ai_chat, ai_persona, status (enum: waiting/active/ended)
 * @param {string} roomId - Room ID
 * @param {string} user1Session - First user's session ID
 * @param {object} options - Additional options
 * @returns {Promise<{ success: boolean, insertId?: number, error?: string }>}
 */
export async function createChatRoom(roomId, user1Session, options = {}) {
  return insert('private_chat_rooms', {
    room_id: roomId,
    user1_session: user1Session,
    user1_nickname: options.nickname || 'Anonymous',
    is_ai_chat: options.isAI ? 1 : 0,
    ai_persona: options.aiPersona || null,
    status: 'waiting',
  });
}

/**
 * Updates chat room with second user (when matched)
 * @param {string} roomId - Room ID
 * @param {string} user2Session - Second user's session ID
 * @param {string} nickname - Second user's nickname
 * @returns {Promise<{ success: boolean, affectedRows?: number, error?: string }>}
 */
export async function joinChatRoom(roomId, user2Session, nickname = 'Anonymous') {
  return update('private_chat_rooms', {
    user2_session: user2Session,
    user2_nickname: nickname,
    status: 'active',
    started_at: new Date(),
  }, 'room_id = ?', [roomId]);
}

/**
 * Finds a waiting user for peer chat matching
 * Schema: session_id, nickname, avatar_url, listener_id, role (enum: seeker/listener),
 *         status (enum: waiting/matched/cancelled/timeout), room_id
 * @param {string} excludeSession - Session to exclude from matching
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function findWaitingPeer(excludeSession) {
  return queryOne(
    `SELECT * FROM private_chat_queue
     WHERE status = 'waiting' AND session_id != ? AND role = 'seeker'
     ORDER BY created_at ASC LIMIT 1`,
    [excludeSession]
  );
}

/**
 * Adds user to chat queue
 * Schema: session_id, nickname, avatar_url, listener_id, role, status, room_id
 * @param {string} sessionId - User session ID
 * @param {object} options - Additional options (nickname, role)
 * @returns {Promise<{ success: boolean, insertId?: number, error?: string }>}
 */
export async function addToQueue(sessionId, options = {}) {
  return insert('private_chat_queue', {
    session_id: sessionId,
    nickname: options.nickname || 'Anonymous',
    role: options.role || 'seeker',
    status: 'waiting',
  });
}

/**
 * Removes user from chat queue (marks as matched)
 * @param {string} sessionId - User session ID
 * @param {string} roomId - Room ID they were matched to
 * @returns {Promise<{ success: boolean, affectedRows?: number, error?: string }>}
 */
export async function removeFromQueue(sessionId, roomId = null) {
  const updateData = {
    status: 'matched',
    matched_at: new Date(),
  };
  if (roomId) {
    updateData.room_id = roomId;
  }
  return update('private_chat_queue', updateData, 'session_id = ?', [sessionId]);
}

/**
 * Saves a chat message
 * Schema: room_id, sender_session, content, is_ai
 * @param {string} roomId - Room ID
 * @param {string} senderSession - Sender session ID
 * @param {string} content - Message content
 * @param {boolean} isAI - Whether message is from AI
 * @returns {Promise<{ success: boolean, insertId?: number, error?: string }>}
 */
export async function saveChatMessage(roomId, senderSession, content, isAI = false) {
  return insert('private_chat_messages', {
    room_id: roomId,
    sender_session: senderSession,
    content: content,
    is_ai: isAI ? 1 : 0,
  });
}

/**
 * Saves a vent post
 * Schema: content, emotion, ai_response, ai_sentiment, ai_risk, likes_count,
 *         is_anonymous, is_visible, ip_hash, room, nickname, language, session_id
 * @param {string} content - Vent content
 * @param {string} sessionId - User session
 * @param {object} analysis - AI analysis result
 * @param {object} options - Additional options
 * @returns {Promise<{ success: boolean, insertId?: number, error?: string }>}
 */
export async function saveVentPost(content, sessionId, analysis = {}, options = {}) {
  // Map tags to emotion (use first tag or 'neutral')
  const emotion = Array.isArray(analysis.tags) && analysis.tags.length > 0
    ? analysis.tags[0]
    : 'neutral';

  return insert('vent_posts', {
    content: content,
    session_id: sessionId,
    emotion: emotion,
    ai_risk: analysis.risk || 'low',
    ai_sentiment: analysis.sentiment || null,
    ai_response: options.aiResponse || null,
    is_anonymous: options.isAnonymous !== false ? 1 : 0,
    is_visible: 1,
    room: options.room || 'general',
    nickname: options.nickname || 'Anonymous',
    language: options.language || 'th',
  });
}

/**
 * Creates an OTP request (payment initiation)
 * Schema: project_code, phone, email, otp_code, slip_image, amount, status, expires_at
 * @param {object} orderData - Order data
 * @returns {Promise<{ success: boolean, insertId?: number, error?: string }>}
 */
export async function createOTPRequest(orderData) {
  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Set expiry to 5 minutes from now
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  return insert('otp_requests', {
    project_code: orderData.projectCode || 'mindfitness',
    phone: orderData.phone,
    email: orderData.email || null,
    otp_code: otpCode,
    amount: orderData.amount || 59,
    status: 'pending',
    expires_at: expiresAt,
  });
}

/**
 * Verifies OTP and activates premium
 * @param {string} phone - Phone number
 * @param {string} otpCode - OTP code to verify
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function verifyOTP(phone, otpCode) {
  const result = await queryOne(
    `SELECT * FROM otp_requests
     WHERE phone = ? AND otp_code = ? AND status = 'pending' AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [phone, otpCode]
  );

  if (result.success && result.data) {
    // Mark OTP as verified
    await update('otp_requests', {
      status: 'verified',
      verified_at: new Date(),
    }, 'id = ?', [result.data.id]);

    // Create premium subscription
    const subscriptionResult = await createPremiumSubscription(
      phone,
      result.data.amount,
      result.data.id
    );

    return {
      success: true,
      data: {
        otpRequest: result.data,
        subscription: subscriptionResult,
      },
    };
  }

  return { success: false, error: 'Invalid or expired OTP' };
}

/**
 * Creates premium subscription
 * @param {string} phone - Phone number
 * @param {number} amount - Amount paid
 * @param {number} otpRequestId - OTP request ID
 * @returns {Promise<{ success: boolean, insertId?: number, error?: string }>}
 */
export async function createPremiumSubscription(phone, amount, otpRequestId) {
  const startedAt = new Date();
  // Premium lasts 24 hours
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return insert('premium_subscriptions', {
    project_code: 'mindfitness',
    phone: phone,
    otp_request_id: otpRequestId,
    amount_paid: amount,
    started_at: startedAt,
    expires_at: expiresAt,
    is_active: 1,
  });
}

/**
 * Verifies premium subscription by phone
 * @param {string} phone - Phone number
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function verifyPremiumByPhone(phone) {
  return queryOne(
    `SELECT * FROM premium_subscriptions
     WHERE phone = ? AND is_active = 1 AND expires_at > NOW()
     ORDER BY expires_at DESC LIMIT 1`,
    [phone]
  );
}

/**
 * Gets chat history for a room
 * @param {string} roomId - Room ID
 * @param {number} limit - Max messages to return
 * @returns {Promise<{ success: boolean, data?: Array, error?: string }>}
 */
export async function getChatHistory(roomId, limit = 50) {
  return query(
    `SELECT * FROM private_chat_messages
     WHERE room_id = ?
     ORDER BY created_at DESC LIMIT ?`,
    [roomId, limit]
  );
}

/**
 * Gets vent posts for display
 * @param {string} room - Room name (default: 'general')
 * @param {number} limit - Max posts to return
 * @returns {Promise<{ success: boolean, data?: Array, error?: string }>}
 */
export async function getVentPosts(room = 'general', limit = 20) {
  return query(
    `SELECT id, content, emotion, ai_risk, likes_count, nickname, language, created_at
     FROM vent_posts
     WHERE room = ? AND is_visible = 1
     ORDER BY created_at DESC LIMIT ?`,
    [room, limit]
  );
}

/**
 * Closes a chat room
 * @param {string} roomId - Room ID
 * @returns {Promise<{ success: boolean, affectedRows?: number, error?: string }>}
 */
export async function closeChatRoom(roomId) {
  return update('private_chat_rooms', {
    status: 'ended',
    ended_at: new Date(),
  }, 'room_id = ?', [roomId]);
}
