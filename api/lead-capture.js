/**
 * Lead Capture API
 * บันทึกข้อมูล Lead จากโรงเรียนที่ทำแบบประเมิน SMHQA
 * และสร้าง Proposal อัตโนมัติ
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  B2B_PACKAGES,
  BUNDLE_PACKAGES,
  getRecommendedPackages,
  calculateBundlePrice,
  generateProposal
} from '../config/b2b-packages.js';

const anthropic = new Anthropic();

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
      case 'capture':
        return await captureLead(data, res);
      case 'generate_proposal':
        return await generateSchoolProposal(data, res);
      case 'get_packages':
        return getPackages(res);
      case 'get_bundles':
        return getBundles(res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Lead Capture Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Capture lead from school assessment
 */
async function captureLead(data, res) {
  const { schoolInfo, scores, contactInfo } = data;

  if (!schoolInfo?.schoolName || !scores) {
    return res.status(400).json({
      error: 'Missing required fields: schoolInfo, scores'
    });
  }

  // Generate proposal
  const proposal = generateProposal(schoolInfo, scores);

  // Create lead record
  const lead = {
    id: `LEAD-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'new',
    source: 'smhqa_assessment',
    school: {
      name: schoolInfo.schoolName,
      province: schoolInfo.province || '',
      affiliation: schoolInfo.affiliation || '',
      studentCount: schoolInfo.studentCount || 0,
      level: schoolInfo.level || '',
      respondent: schoolInfo.respondent || ''
    },
    contact: contactInfo || null,
    assessment: {
      totalScore: scores.totalPercentage,
      level: scores.overallLevel?.level || 'Unknown',
      weakDomains: Object.values(scores.domainScores)
        .filter(d => d.percentage < 50)
        .map(d => ({
          id: d.id,
          name: d.nameTH,
          score: d.percentage
        })),
      completedAt: new Date().toISOString()
    },
    proposal
  };

  // TODO: Save to database
  // await query('INSERT INTO leads ...', [lead]);

  // Generate AI pitch message
  const pitchMessage = await generatePitchMessage(lead);

  return res.status(200).json({
    success: true,
    leadId: lead.id,
    proposal,
    pitchMessage
  });
}

/**
 * Generate proposal for school
 */
async function generateSchoolProposal(data, res) {
  const { schoolInfo, scores, studentCount } = data;

  if (!schoolInfo || !scores) {
    return res.status(400).json({
      error: 'Missing required fields'
    });
  }

  const proposal = generateProposal(schoolInfo, scores);

  // Get detailed pricing
  const bundlePricing = proposal.suggestedBundle
    ? calculateBundlePrice(
        proposal.suggestedBundle,
        parseInt(studentCount) || 500
      )
    : null;

  return res.status(200).json({
    success: true,
    proposal: {
      ...proposal,
      bundlePricing
    }
  });
}

/**
 * Get all packages
 */
function getPackages(res) {
  return res.status(200).json({
    success: true,
    packages: B2B_PACKAGES
  });
}

/**
 * Get all bundles
 */
function getBundles(res) {
  return res.status(200).json({
    success: true,
    bundles: BUNDLE_PACKAGES
  });
}

/**
 * Generate AI pitch message
 */
async function generatePitchMessage(lead) {
  const weakDomainsText = lead.assessment.weakDomains
    .map(d => `${d.name} (${d.score}%)`)
    .join(', ');

  const recommendations = lead.proposal.recommendations
    .slice(0, 3)
    .map(r => r.package.nameTH)
    .join(', ');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `สร้างข้อความ pitch สั้นๆ สำหรับติดต่อโรงเรียน ใช้ข้อมูลนี้:

โรงเรียน: ${lead.school.name}
จังหวัด: ${lead.school.province}
จำนวนนักเรียน: ${lead.school.studentCount}
ผลประเมิน SMHQA: ${lead.assessment.totalScore}% (${lead.assessment.level})
ด้านที่ต้องพัฒนา: ${weakDomainsText}
บริการที่แนะนำ: ${recommendations}

เขียนข้อความสั้นๆ 3-4 ประโยค ที่:
1. กล่าวถึงผลประเมินอย่างสร้างสรรค์
2. แนะนำบริการที่ตรงกับความต้องการ
3. เชิญชวนให้ติดต่อรับข้อเสนอพิเศษ

น้ำเสียงเป็นมิตร professional ไม่ขายจ๋า`
      }]
    });

    return response.content[0]?.text || '';
  } catch (error) {
    console.error('AI Pitch Error:', error);
    return `เรียน ${lead.school.name}\n\nจากผลประเมิน SMHQA ของโรงเรียน เราขอแนะนำบริการ ${recommendations} เพื่อพัฒนาระบบสุขภาพจิตโรงเรียนให้มีประสิทธิภาพยิ่งขึ้น\n\nติดต่อทีม Mind Fitness เพื่อรับข้อเสนอพิเศษ`;
  }
}
