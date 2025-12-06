/**
 * Private Chat API Handler
 *
 * Handles peer-to-peer chat matching and messaging with database persistence.
 * Aligned with database schema.
 */

import { setCORSHeaders } from '../utils/config.js';
import {
  findWaitingPeer,
  addToQueue,
  removeFromQueue,
  createChatRoom,
  joinChatRoom,
  saveChatMessage,
  getChatHistory,
  closeChatRoom,
  isDatabaseConfigured,
} from '../utils/database.js';

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer;
  setCORSHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow GET for health check
  if (req.method === 'GET') {
    return res.status(200).json({
      service: 'private-chat',
      status: 'ok',
      databaseConfigured: isDatabaseConfigured(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if database is configured
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: 'Private chat requires database configuration',
      message: 'Database not configured. Please set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME environment variables.',
    });
  }

  try {
    const { action, sessionId, roomId, message, nickname } = req.body;

    // Validate sessionId for most actions
    if (action !== 'health' && !sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    switch (action) {
      case 'find-match':
        return await handleFindMatch(res, sessionId, nickname);

      case 'send-message':
        return await handleSendMessage(res, roomId, sessionId, message);

      case 'get-history':
        return await handleGetHistory(res, roomId);

      case 'leave-room':
        return await handleLeaveRoom(res, roomId, sessionId);

      case 'health':
        return res.status(200).json({ status: 'ok', service: 'private-chat' });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Private Chat Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handles peer matching
 */
async function handleFindMatch(res, sessionId, nickname = 'Anonymous') {
  // Check if there's a waiting peer
  const waitingPeer = await findWaitingPeer(sessionId);

  if (waitingPeer.success && waitingPeer.data) {
    // Found a match! Create a room with the waiting peer as user1
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create room with waiting peer as user1
    await createChatRoom(roomId, waitingPeer.data.session_id, {
      nickname: waitingPeer.data.nickname || 'Anonymous',
    });

    // Join room as user2 (current user)
    await joinChatRoom(roomId, sessionId, nickname);

    // Remove matched peer from queue with room ID
    await removeFromQueue(waitingPeer.data.session_id, roomId);

    return res.status(200).json({
      matched: true,
      roomId: roomId,
      partnerId: waitingPeer.data.session_id,
      partnerNickname: waitingPeer.data.nickname || 'Anonymous',
      message: 'พบคู่สนทนาแล้ว! เริ่มพูดคุยได้เลย',
    });
  } else {
    // No match found, add to queue
    await addToQueue(sessionId, { nickname, role: 'seeker' });

    return res.status(200).json({
      matched: false,
      sessionId: sessionId,
      message: 'กำลังหาคู่สนทนา... กรุณารอสักครู่',
    });
  }
}

/**
 * Handles sending a message
 */
async function handleSendMessage(res, roomId, sessionId, message) {
  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Save message to database
  const result = await saveChatMessage(roomId, sessionId, message.trim(), false);

  if (!result.success) {
    return res.status(500).json({ error: 'Failed to save message' });
  }

  return res.status(200).json({
    success: true,
    messageId: result.insertId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handles getting chat history
 */
async function handleGetHistory(res, roomId) {
  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  const result = await getChatHistory(roomId, 100);

  if (!result.success) {
    return res.status(500).json({ error: 'Failed to get chat history' });
  }

  // Reverse to get chronological order
  const messages = (result.data || []).reverse();

  return res.status(200).json({
    success: true,
    messages: messages,
  });
}

/**
 * Handles leaving a chat room
 */
async function handleLeaveRoom(res, roomId, sessionId) {
  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  // Close the room (status = 'ended')
  await closeChatRoom(roomId);

  // Remove from queue if still waiting
  await removeFromQueue(sessionId);

  return res.status(200).json({
    success: true,
    message: 'ออกจากห้องแชทแล้ว',
  });
}
