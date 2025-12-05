/**
 * Auto Pitch API
 * ระบบส่ง Email Pitch อัตโนมัติหลังจากโรงเรียนทำแบบประเมิน
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  B2B_PACKAGES,
  BUNDLE_PACKAGES,
  generateProposal,
  calculateBundlePrice,
  PRICING_CONFIG
} from '../config/b2b-packages.js';

const anthropic = new Anthropic();

// Email configuration (use environment variables)
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'contact@mindfitness.co',
  replyTo: process.env.EMAIL_REPLY_TO || 'sales@mindfitness.co',
  ccAdmin: process.env.EMAIL_CC_ADMIN || 'admin@mindfitness.co'
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, ...data } = req.body;

    switch (action) {
      case 'generate_pitch':
        return await generatePitch(data, res);
      case 'send_pitch':
        return await sendPitchEmail(data, res);
      case 'generate_proposal_pdf':
        return await generateProposalContent(data, res);
      case 'schedule_followup':
        return await scheduleFollowUp(data, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Auto Pitch Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Generate pitch content
 */
async function generatePitch(data, res) {
  const { schoolInfo, scores, contactInfo, pitchType = 'email' } = data;

  if (!schoolInfo || !scores) {
    return res.status(400).json({
      error: 'Missing required fields: schoolInfo, scores'
    });
  }

  // Generate proposal
  const proposal = generateProposal(schoolInfo, scores);

  // Get recommended packages text
  const recommendedPackages = proposal.recommendations
    .slice(0, 3)
    .map(r => ({
      name: r.package.nameTH,
      reason: r.reason,
      includes: r.package.includes.slice(0, 3),
      price: r.package.price || 'ติดต่อสอบถาม'
    }));

  // Generate AI pitch content based on type
  const pitchContent = await generateAIPitch({
    schoolInfo,
    scores,
    proposal,
    recommendedPackages,
    pitchType
  });

  return res.status(200).json({
    success: true,
    pitch: pitchContent,
    proposal,
    recommendedPackages
  });
}

/**
 * Generate AI pitch content
 */
async function generateAIPitch({ schoolInfo, scores, proposal, recommendedPackages, pitchType }) {
  const weakDomains = proposal.assessment.weakDomains
    .map(d => `${d.name} (${d.score}%)`)
    .join(', ');

  const packagesText = recommendedPackages
    .map(p => `- ${p.name}: ${p.reason}`)
    .join('\n');

  const bundleName = proposal.suggestedBundle?.nameTH || 'แพ็คเกจมาตรฐาน';
  const bundleDiscount = proposal.suggestedBundle?.discount || 15;

  let prompt = '';

  if (pitchType === 'email') {
    prompt = `สร้าง Email pitch สำหรับโรงเรียน โดยใช้ข้อมูลนี้:

โรงเรียน: ${schoolInfo.schoolName}
จังหวัด: ${schoolInfo.province || '-'}
จำนวนนักเรียน: ${schoolInfo.studentCount || '-'}
ผู้ติดต่อ: ${schoolInfo.respondent || '-'}

ผลประเมิน SMHQA:
- คะแนนรวม: ${scores.totalPercentage}%
- ระดับ: ${scores.overallLevel?.levelTH || '-'}
- ด้านที่ต้องพัฒนา: ${weakDomains}

บริการที่แนะนำ:
${packagesText}

แพ็คเกจแนะนำ: ${bundleName} (ส่วนลดพิเศษ ${bundleDiscount}%)

เขียน Email ที่:
1. หัวเรื่อง: น่าสนใจ เกี่ยวกับผลประเมินและโอกาสพัฒนา
2. เปิดเรื่อง: ขอบคุณที่ทำแบบประเมิน ชมจุดแข็ง
3. นำเสนอ: แนะนำบริการที่ตรงกับจุดอ่อน (2-3 บริการ)
4. ข้อเสนอ: แพ็คเกจพิเศษพร้อมส่วนลด
5. Call to action: เชิญนัดหมายหรือโทรปรึกษา
6. ลงท้าย: ข้อมูลติดต่อ Mind Fitness

น้ำเสียง: เป็นมิตร professional ไม่ขายจ๋า เน้นประโยชน์ที่โรงเรียนจะได้รับ

Format response as JSON:
{
  "subject": "หัวเรื่อง Email",
  "body": "เนื้อหา Email (รองรับ HTML)",
  "summary": "สรุปสั้นๆ 1-2 ประโยค"
}`;
  } else if (pitchType === 'line') {
    prompt = `สร้างข้อความ LINE สั้นๆ สำหรับติดต่อโรงเรียน:

โรงเรียน: ${schoolInfo.schoolName}
ผลประเมิน: ${scores.totalPercentage}%
ด้านที่ต้องพัฒนา: ${weakDomains}
บริการแนะนำ: ${recommendedPackages.map(p => p.name).join(', ')}

เขียนข้อความ LINE ที่:
- สั้นกระชับ 3-4 บรรทัด
- เปิดด้วยการทักทาย
- กล่าวถึงผลประเมินสั้นๆ
- แนะนำบริการ 1-2 อย่าง
- ชวนนัดคุยเพิ่มเติม

Format response as JSON:
{
  "message": "ข้อความ LINE",
  "summary": "สรุปสั้นๆ"
}`;
  } else {
    prompt = `สร้างสคริปต์โทรศัพท์สำหรับติดต่อโรงเรียน:

โรงเรียน: ${schoolInfo.schoolName}
ผู้ติดต่อ: ${schoolInfo.respondent || '-'}
ผลประเมิน: ${scores.totalPercentage}%
ด้านที่ต้องพัฒนา: ${weakDomains}
บริการแนะนำ: ${recommendedPackages.map(p => p.name).join(', ')}

เขียนสคริปต์ที่:
1. แนะนำตัว
2. กล่าวถึงผลประเมิน
3. นำเสนอบริการสั้นๆ
4. ขอนัดหมาย

Format response as JSON:
{
  "script": "สคริปต์โทรศัพท์",
  "keyPoints": ["จุดสำคัญ 1", "จุดสำคัญ 2"],
  "objectionHandling": {"ข้อโต้แย้ง": "คำตอบ"}
}`;
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0]?.text || '';

    // Try to parse JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Return as plain text if JSON parsing fails
    }

    return {
      subject: `ผลประเมิน SMHQA - ${schoolInfo.schoolName}`,
      body: content,
      summary: 'ข้อเสนอบริการพัฒนาระบบสุขภาพจิตโรงเรียน'
    };

  } catch (error) {
    console.error('AI Pitch Generation Error:', error);
    return getDefaultPitchContent(schoolInfo, scores, proposal);
  }
}

/**
 * Get default pitch content (fallback)
 */
function getDefaultPitchContent(schoolInfo, scores, proposal) {
  const weakDomains = proposal.assessment.weakDomains
    .map(d => d.name)
    .join(', ');

  const recommendedServices = proposal.recommendations
    .slice(0, 3)
    .map(r => r.package.nameTH)
    .join(', ');

  return {
    subject: `ผลประเมิน SMHQA ${schoolInfo.schoolName} - ข้อเสนอพิเศษจาก Mind Fitness`,
    body: `
      <h2>เรียน ${schoolInfo.respondent || 'ผู้บริหาร'} ${schoolInfo.schoolName}</h2>

      <p>ขอบคุณที่ใช้บริการประเมิน SMHQA จาก Mind Fitness</p>

      <p>จากผลประเมิน โรงเรียนได้คะแนนรวม <strong>${scores.totalPercentage}%</strong>
      อยู่ในระดับ <strong>${scores.overallLevel?.levelTH || '-'}</strong></p>

      <p>ด้านที่ควรพัฒนา: ${weakDomains}</p>

      <h3>บริการที่เราแนะนำ:</h3>
      <p>${recommendedServices}</p>

      <p><strong>ข้อเสนอพิเศษ:</strong> ${proposal.suggestedBundle?.nameTH || 'แพ็คเกจเริ่มต้น'}
      พร้อมส่วนลด ${proposal.suggestedBundle?.discount || 15}%</p>

      <p>ติดต่อทีม Mind Fitness เพื่อนัดหมายรับคำปรึกษาฟรี</p>

      <p>
        โทร: 02-XXX-XXXX<br>
        LINE: @mindfitness<br>
        Email: sales@mindfitness.co
      </p>

      <p>ด้วยความเคารพ<br>
      ทีม Mind Fitness</p>
    `,
    summary: `แนะนำ ${recommendedServices} สำหรับพัฒนาด้าน ${weakDomains}`
  };
}

/**
 * Send pitch email (placeholder - integrate with email service)
 */
async function sendPitchEmail(data, res) {
  const { to, pitch, leadId } = data;

  if (!to || !pitch) {
    return res.status(400).json({
      error: 'Missing required fields: to, pitch'
    });
  }

  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // For now, return success with email content

  const emailData = {
    id: `EMAIL-${Date.now()}`,
    to,
    from: EMAIL_CONFIG.from,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: pitch.subject,
    html: pitch.body,
    leadId,
    sentAt: new Date().toISOString(),
    status: 'queued' // Will be 'sent' after actual sending
  };

  // TODO: Save email record to database
  // await query('INSERT INTO email_logs ...', [emailData]);

  return res.status(200).json({
    success: true,
    message: 'Email queued for sending',
    email: {
      id: emailData.id,
      to: emailData.to,
      subject: emailData.subject,
      status: emailData.status
    }
  });
}

/**
 * Generate proposal content (for PDF generation)
 */
async function generateProposalContent(data, res) {
  const { schoolInfo, scores } = data;

  if (!schoolInfo || !scores) {
    return res.status(400).json({
      error: 'Missing required fields'
    });
  }

  const proposal = generateProposal(schoolInfo, scores);
  const studentCount = parseInt(schoolInfo.studentCount) || 500;

  // Calculate all bundle prices for comparison
  const bundleComparison = Object.entries(BUNDLE_PACKAGES).map(([key, bundle]) => ({
    id: key,
    ...bundle,
    pricing: calculateBundlePrice(bundle, studentCount)
  }));

  // Get detailed package info
  const recommendedPackagesDetail = proposal.recommendations.map(r => ({
    ...r,
    packageDetail: B2B_PACKAGES[r.package.id]
  }));

  const proposalContent = {
    title: `ข้อเสนอบริการพัฒนาระบบสุขภาพจิตโรงเรียน`,
    subtitle: schoolInfo.schoolName,
    date: new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),

    sections: {
      schoolInfo: {
        title: 'ข้อมูลโรงเรียน',
        data: schoolInfo
      },

      assessmentSummary: {
        title: 'สรุปผลประเมิน SMHQA',
        totalScore: scores.totalPercentage,
        level: scores.overallLevel,
        domainScores: Object.values(scores.domainScores).map(d => ({
          name: d.nameTH,
          icon: d.icon,
          score: d.percentage,
          level: d.level
        }))
      },

      recommendations: {
        title: 'บริการที่แนะนำ',
        items: recommendedPackagesDetail
      },

      bundles: {
        title: 'แพ็คเกจบริการ',
        suggested: proposal.suggestedBundle,
        comparison: bundleComparison
      },

      pricing: {
        title: 'ราคาและเงื่อนไข',
        currency: PRICING_CONFIG.currencySymbol,
        vatNote: PRICING_CONFIG.includeVAT
          ? 'ราคารวม VAT แล้ว'
          : `ราคายังไม่รวม VAT ${PRICING_CONFIG.vatRate}%`,
        suggestedPricing: proposal.bundlePricing
      },

      nextSteps: {
        title: 'ขั้นตอนถัดไป',
        steps: [
          'นัดหมายประชุมออนไลน์เพื่อนำเสนอรายละเอียด',
          'สำรวจความต้องการเพิ่มเติม',
          'ปรับแผนให้เหมาะกับโรงเรียน',
          'เริ่มดำเนินการ'
        ]
      },

      contact: {
        title: 'ติดต่อเรา',
        phone: '02-XXX-XXXX',
        email: 'sales@mindfitness.co',
        line: '@mindfitness',
        website: 'www.mindfitness.co'
      }
    }
  };

  return res.status(200).json({
    success: true,
    proposal: proposalContent
  });
}

/**
 * Schedule follow-up reminder
 */
async function scheduleFollowUp(data, res) {
  const { leadId, followUpDate, notes } = data;

  if (!leadId || !followUpDate) {
    return res.status(400).json({
      error: 'Missing required fields: leadId, followUpDate'
    });
  }

  const followUp = {
    id: `FU-${Date.now()}`,
    leadId,
    scheduledDate: followUpDate,
    notes: notes || '',
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };

  // TODO: Save to database and create calendar reminder
  // await query('INSERT INTO follow_ups ...', [followUp]);

  return res.status(200).json({
    success: true,
    followUp
  });
}
