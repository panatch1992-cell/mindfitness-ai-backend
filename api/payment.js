import { setCORSHeaders } from '../utils/config.js';

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
    const { amount, phone, productId } = req.body;
    
    const qrData = {
      amount: amount || 399,
      ref: `MF${Date.now()}`
    };
    
    return res.status(200).json({
      success: true,
      reference: qrData.ref,
      amount: qrData.amount,
      message: 'QR Code generated'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
