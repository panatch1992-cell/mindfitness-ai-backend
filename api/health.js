/**
 * Health Check API
 *
 * Simple endpoint to verify API is working.
 */

import { setCORSHeaders } from '../utils/config.js';
import { testConnection } from '../utils/database.js';

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer;
  setCORSHeaders(res, origin);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test database connection
    const dbResult = await testConnection();

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'ok',
        database: dbResult.success ? 'ok' : 'error',
        databaseError: dbResult.error || null,
      },
      environment: {
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        hasDbHost: !!process.env.DB_HOST,
        hasDbUser: !!process.env.DB_USER,
        hasDbName: !!process.env.DB_NAME,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
}
