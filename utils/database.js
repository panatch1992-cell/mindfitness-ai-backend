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
// ============================================

/**
 * Creates a new chat room
 * @param {string} roomId - Room ID
 * @param {string} roomType - Type (peer, ai, listener)
 * @returns {Promise<{ success: boolean, insertId?: number, error?: string }>}
 */
export async function createChatRoom(roomId, roomType = 'peer') {
  return insert('private_chat_rooms', {
    room_id: roomId,
    room_type: roomType,
    status: 'waiting',
    created_at: new Date(),
  });
}

/**
 * Finds a waiting user for peer chat matching
 * @param {string} excludeSession - Session to exclude from matching
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function findWaitingPeer(excludeSession) {
  return queryOne(
    `SELECT * FROM private_chat_queue
     WHERE status = 'waiting' AND session_id != ?
     ORDER BY created_at ASC LIMIT 1`,
    [excludeSession]
  );
}

/**
 * Adds user to chat queue
 * @param {string} sessionId - User session ID
 * @returns {Promise<{ success: boolean, insertId?: number, error?: string }>}
 */
export async function addToQueue(sessionId) {
  return insert('private_chat_queue', {
    session_id: sessionId,
    status: 'waiting',
    created_at: new Date(),
  });
}

/**
 * Removes user from chat queue
 * @param {string} sessionId - User session ID
 * @returns {Promise<{ success: boolean, affectedRows?: number, error?: string }>}
 */
export async function removeFromQueue(sessionId) {
  return update('private_chat_queue', { status: 'matched' }, 'session_id = ?', [sessionId]);
}

/**
 * Saves a chat message
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
    created_at: new Date(),
  });
}

/**
 * Saves a vent post
 * @param {string} content - Vent content
 * @param {string} sessionId - User session
 * @param {object} analysis - AI analysis result
 * @returns {Promise<{ success: boolean, insertId?: number, error?: string }>}
 */
export async function saveVentPost(content, sessionId, analysis = {}) {
  return insert('vent_posts', {
    session_id: sessionId,
    content: content,
    risk_level: analysis.risk || 'unknown',
    tags: JSON.stringify(analysis.tags || []),
    is_anonymous: 1,
    created_at: new Date(),
  });
}

/**
 * Creates an order record
 * @param {object} orderData - Order data
 * @returns {Promise<{ success: boolean, insertId?: number, error?: string }>}
 */
export async function createOrder(orderData) {
  return insert('orders', {
    reference_code: orderData.reference,
    product_type: orderData.productType || 'premium',
    amount: orderData.amount,
    phone: orderData.phone || null,
    status: 'pending',
    created_at: new Date(),
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
