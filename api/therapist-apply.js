/**
 * Therapist Application API
 *
 * Handles psychologist/therapist registration applications
 * Stores data in MySQL database
 */

import { setCORSHeaders } from '../utils/config.js';
import { query, queryOne, insert } from '../utils/database.js';

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
    const {
      // Personal info
      prefix,
      fullname,
      nickname,
      email,
      phone,
      line_id,
      // Professional info
      position,
      work_type,
      education,
      license_number,
      experience_hours,
      experience_years,
      // Specializations & languages
      specializations,
      languages,
      // Additional
      work_history,
      motivation
    } = req.body;

    // Validation
    if (!fullname || !email || !phone || !position || !education || !experience_hours) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบอีเมลไม่ถูกต้อง'
      });
    }

    // Validate phone format
    if (!/^0[0-9]{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'
      });
    }

    // Check if email already exists
    const existingEmail = await queryOne(
      'SELECT id FROM psychologists WHERE email = ?',
      [email]
    );

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'อีเมลนี้ถูกใช้สมัครแล้ว'
      });
    }

    // Check if phone already exists
    const existingPhone = await queryOne(
      'SELECT id FROM psychologists WHERE phone = ?',
      [phone]
    );

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        error: 'เบอร์โทรศัพท์นี้ถูกใช้สมัครแล้ว'
      });
    }

    // Generate reference number: PSY-YYYYMMDD-XXXX
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const refNumber = `PSY-${today}-${randomSuffix}`;

    // Map position to database value
    const positionMap = {
      'psychiatrist': 'psychiatrist',
      'clinical': 'clinical_psychologist',
      'counseling': 'counseling_psychologist'
    };

    // Insert into database
    const insertId = await insert(
      `INSERT INTO psychologists (
        ref_number,
        fullname_th,
        fullname_en,
        nickname,
        email,
        phone,
        line_id,
        position,
        work_type,
        education,
        license_number,
        experience_hours,
        experience_years,
        specializations,
        languages,
        work_history,
        motivation,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        refNumber,
        `${prefix || ''} ${fullname}`.trim(),
        '', // fullname_en - can be added later
        nickname || '',
        email,
        phone,
        line_id || '',
        positionMap[position] || position,
        work_type || 'parttime',
        education,
        license_number || '',
        experience_hours,
        experience_years || '',
        JSON.stringify(specializations || []),
        JSON.stringify(languages || ['thai']),
        work_history || '',
        motivation || '',
      ]
    );

    // Log the application
    console.log(`New therapist application: ${refNumber} - ${fullname} - ${email}`);

    // TODO: Send notification email to hr@mindfitness.co
    // TODO: Send confirmation SMS to applicant

    return res.json({
      success: true,
      application_id: refNumber,
      message: 'ส่งใบสมัครเรียบร้อยแล้ว ทีมงานจะติดต่อกลับภายใน 5-7 วันทำการ'
    });

  } catch (error) {
    console.error('Therapist application error:', error);

    // Check for database configuration error
    if (error.message === 'Database not configured') {
      return res.status(500).json({
        success: false,
        error: 'ระบบกำลังปรับปรุง กรุณาลองใหม่ภายหลัง'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    });
  }
}
