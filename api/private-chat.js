import { setCORSHeaders } from '../utils/config.js';

let waitingUsers = [];

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
    
    if (action === 'find-match') {
      if (waitingUsers.length > 0) {
        const partner = waitingUsers.shift();
        return res.status(200).json({ 
          matched: true, 
          roomId: `room_${Date.now()}`,
          message: 'พบคู่สนทนาแล้ว'
        });
      } else {
        const oderId = `user_${Date.now()}`;
        waitingUsers.push(userId);
        return res.status(200).json({ 
          matched: false, 
          userId: oderId,
          message: 'กำลังหาคู่สนทนา...'
        });
      }
    }
    
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
