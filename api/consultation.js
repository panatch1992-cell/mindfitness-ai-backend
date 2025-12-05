/**
 * Consultation API Handler
 *
 * Handles psychologist consultation booking and management
 */

import { setCORSHeaders } from '../utils/config.js';

// Platform settings
const PLATFORM_CONFIG = {
  platformFeePercent: 20,
  minSessionRate: 500,
  maxSessionRate: 5000,
  defaultSessionDuration: 50, // minutes
  bookingAdvanceHours: 24,
  cancellationHours: 24,
  videoPlatform: 'google_meet'
};

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer;
  setCORSHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.body || req.query;

    switch (action) {
      case 'list_psychologists':
        return handleListPsychologists(req, res);
      case 'get_psychologist':
        return handleGetPsychologist(req, res);
      case 'get_availability':
        return handleGetAvailability(req, res);
      case 'create_booking':
        return handleCreateBooking(req, res);
      case 'confirm_payment':
        return handleConfirmPayment(req, res);
      case 'cancel_booking':
        return handleCancelBooking(req, res);
      case 'get_booking':
        return handleGetBooking(req, res);
      case 'rate_session':
        return handleRateSession(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Consultation Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * List available psychologists
 */
async function handleListPsychologists(req, res) {
  // In production, fetch from database
  // Mock data for now
  const psychologists = [
    {
      id: 1,
      name: 'ดร.สมใจ รักษาใจ',
      title: 'นักจิตวิทยาคลินิก',
      photo: '/images/psychologists/default.jpg',
      specialties: ['ความเครียด', 'ภาวะซึมเศร้า', 'ความวิตกกังวล'],
      experience: '10+ ปี',
      rating: 4.8,
      totalReviews: 124,
      ratePerSession: 1500,
      sessionDuration: 50,
      isOnline: true,
      nextAvailable: '2025-12-06 10:00'
    },
    {
      id: 2,
      name: 'อ.มานะ ใจดี',
      title: 'นักจิตวิทยาการปรึกษา',
      photo: '/images/psychologists/default.jpg',
      specialties: ['ความสัมพันธ์', 'การทำงาน', 'ครอบครัว'],
      experience: '8 ปี',
      rating: 4.9,
      totalReviews: 89,
      ratePerSession: 1200,
      sessionDuration: 50,
      isOnline: false,
      nextAvailable: '2025-12-07 14:00'
    }
  ];

  return res.json({
    success: true,
    psychologists,
    platformConfig: {
      platformFeePercent: PLATFORM_CONFIG.platformFeePercent,
      sessionDuration: PLATFORM_CONFIG.defaultSessionDuration
    }
  });
}

/**
 * Get single psychologist details
 */
async function handleGetPsychologist(req, res) {
  const { psychologistId } = req.body || req.query;

  if (!psychologistId) {
    return res.status(400).json({ error: 'Missing psychologist ID' });
  }

  // In production, fetch from database
  const psychologist = {
    id: parseInt(psychologistId),
    name: 'ดร.สมใจ รักษาใจ',
    title: 'นักจิตวิทยาคลินิก',
    licenseNumber: 'ท.จ. 12345',
    photo: '/images/psychologists/default.jpg',
    bio: 'นักจิตวิทยาคลินิกที่มีประสบการณ์มากกว่า 10 ปี เชี่ยวชาญด้านการบำบัดความเครียด ภาวะซึมเศร้า และความวิตกกังวล จบการศึกษาระดับปริญญาเอกจากจุฬาลงกรณ์มหาวิทยาลัย',
    education: 'ปริญญาเอก จิตวิทยาคลินิก จุฬาลงกรณ์มหาวิทยาลัย',
    specialties: ['ความเครียด', 'ภาวะซึมเศร้า', 'ความวิตกกังวล', 'การปรับตัว'],
    experience: '10+ ปี',
    rating: 4.8,
    totalReviews: 124,
    ratePerSession: 1500,
    sessionDuration: 50,
    sessionTypes: ['video', 'chat'],
    languages: ['ไทย', 'English'],
    isOnline: true
  };

  return res.json({
    success: true,
    psychologist
  });
}

/**
 * Get psychologist availability
 */
async function handleGetAvailability(req, res) {
  const { psychologistId, date } = req.body || req.query;

  if (!psychologistId) {
    return res.status(400).json({ error: 'Missing psychologist ID' });
  }

  // In production, fetch from database
  // Mock available slots
  const slots = [
    { time: '09:00', available: true },
    { time: '10:00', available: true },
    { time: '11:00', available: false },
    { time: '13:00', available: true },
    { time: '14:00', available: true },
    { time: '15:00', available: false },
    { time: '16:00', available: true }
  ];

  return res.json({
    success: true,
    date: date || new Date().toISOString().split('T')[0],
    psychologistId,
    slots
  });
}

/**
 * Create a new booking
 */
async function handleCreateBooking(req, res) {
  const {
    psychologistId,
    clientName,
    clientPhone,
    clientEmail,
    scheduledDate,
    scheduledTime,
    sessionType,
    notes
  } = req.body;

  // Validate required fields
  if (!psychologistId || !clientPhone || !scheduledDate || !scheduledTime) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  // Validate phone
  if (!/^0[0-9]{9}$/.test(clientPhone)) {
    return res.status(400).json({ error: 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง' });
  }

  // Generate booking reference
  const bookingRef = `APT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // In production, save to database and get psychologist rate
  const amount = 1500; // Get from psychologist profile
  const platformFee = Math.round(amount * PLATFORM_CONFIG.platformFeePercent / 100);
  const psychologistEarning = amount - platformFee;

  const booking = {
    bookingRef,
    psychologistId,
    clientName: clientName || 'Anonymous',
    clientPhone,
    clientEmail,
    scheduledDate,
    scheduledTime,
    sessionType: sessionType || 'video',
    duration: PLATFORM_CONFIG.defaultSessionDuration,
    amount,
    platformFee,
    psychologistEarning,
    notes,
    status: 'pending_payment',
    createdAt: new Date().toISOString()
  };

  return res.json({
    success: true,
    booking,
    message: 'สร้างการจองสำเร็จ กรุณาชำระเงินภายใน 30 นาที',
    paymentInfo: {
      amount,
      accountName: 'นายพณัฐ เชื้อประเสริฐศักดิ์',
      bankName: 'กรุงไทย',
      qrCodeUrl: '/images/qr-consultation.png'
    }
  });
}

/**
 * Confirm payment for booking
 */
async function handleConfirmPayment(req, res) {
  const { bookingRef, slipData, otp } = req.body;

  if (!bookingRef) {
    return res.status(400).json({ error: 'Missing booking reference' });
  }

  // In production, verify OTP and slip, update database

  return res.json({
    success: true,
    message: 'ยืนยันการชำระเงินสำเร็จ!',
    booking: {
      bookingRef,
      status: 'confirmed',
      meetingUrl: 'https://meet.google.com/xxx-xxxx-xxx', // Generate actual meeting link
      confirmedAt: new Date().toISOString()
    }
  });
}

/**
 * Cancel a booking
 */
async function handleCancelBooking(req, res) {
  const { bookingRef, reason } = req.body;

  if (!bookingRef) {
    return res.status(400).json({ error: 'Missing booking reference' });
  }

  // In production, check cancellation policy and process refund

  return res.json({
    success: true,
    message: 'ยกเลิกการจองสำเร็จ',
    refund: {
      amount: 1500,
      status: 'processing',
      estimatedDays: 3
    }
  });
}

/**
 * Get booking details
 */
async function handleGetBooking(req, res) {
  const { bookingRef, phone } = req.body || req.query;

  if (!bookingRef && !phone) {
    return res.status(400).json({ error: 'กรุณาระบุเลขที่จองหรือเบอร์โทรศัพท์' });
  }

  // In production, fetch from database

  return res.json({
    success: true,
    booking: null,
    message: 'ไม่พบข้อมูลการจอง'
  });
}

/**
 * Rate a completed session
 */
async function handleRateSession(req, res) {
  const { bookingRef, rating, feedback } = req.body;

  if (!bookingRef || !rating) {
    return res.status(400).json({ error: 'Missing booking reference or rating' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  // In production, save rating to database

  return res.json({
    success: true,
    message: 'ขอบคุณสำหรับการให้คะแนน!'
  });
}
