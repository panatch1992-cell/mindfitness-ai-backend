/**
 * MySQL Database Connection Module
 *
 * Connects to Hostinger MySQL with connection pooling and SSL
 */

import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // SSL for secure connection
  ssl: process.env.MYSQL_SSL === 'false' ? false : {
    rejectUnauthorized: false
  }
};

// Create connection pool
let pool = null;

/**
 * Get database connection pool
 */
export function getPool() {
  if (!pool) {
    if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
      console.error('Missing database configuration. Please set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE');
      return null;
    }
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

/**
 * Execute a query with parameters (prepared statement)
 */
export async function query(sql, params = []) {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database not configured');
  }

  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

/**
 * Get a single row
 */
export async function queryOne(sql, params = []) {
  const results = await query(sql, params);
  return results[0] || null;
}

/**
 * Insert and return inserted ID
 */
export async function insert(sql, params = []) {
  const results = await query(sql, params);
  return results.insertId;
}

/**
 * Update and return affected rows
 */
export async function update(sql, params = []) {
  const results = await query(sql, params);
  return results.affectedRows;
}

/**
 * Transaction helper
 */
export async function transaction(callback) {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database not configured');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Check database connection
 */
export async function checkConnection() {
  try {
    const pool = getPool();
    if (!pool) {
      return { connected: false, error: 'Database not configured' };
    }

    const [rows] = await pool.execute('SELECT 1 as test');
    return { connected: true, test: rows[0].test };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

/**
 * Get platform setting from database
 */
export async function getSetting(key, defaultValue = null) {
  try {
    const result = await queryOne(
      'SELECT setting_value FROM platform_settings WHERE setting_key = ?',
      [key]
    );
    return result ? result.setting_value : defaultValue;
  } catch (error) {
    console.error('Error getting setting:', key, error.message);
    return defaultValue;
  }
}

export default {
  getPool,
  query,
  queryOne,
  insert,
  update,
  transaction,
  checkConnection,
  getSetting
};
