/**
 * Mind Fitness B2B Solution Packages
 *
 * ระบบแพ็คเกจสำหรับโรงเรียน
 * แบ่งตาม Domain ที่เป็นจุดอ่อนจากผลประเมิน SMHQA
 *
 * USER: กรุณาตั้งราคาในแต่ละ package ตามต้องการ
 */

export const B2B_PACKAGES = {
  // ================================
  // PACKAGE 1: Teaming & Structure
  // สำหรับโรงเรียนที่คะแนนต่ำใน Domain 1 (Teaming)
  // ================================
  TEAMING_SETUP: {
    id: 'teaming_setup',
    name: 'Mental Health Team Setup',
    nameTH: 'แพ็คเกจจัดตั้งทีมสุขภาพจิต',
    domains: [1], // Maps to Domain 1: Teaming
    description: 'ช่วยโรงเรียนจัดตั้งทีมสุขภาพจิตที่มีประสิทธิภาพ',
    price: 0, // TODO: ตั้งราคา (บาท)
    pricePerStudent: 0, // หรือคิดต่อหัวนักเรียน
    includes: [
      'ประเมินโครงสร้างทีมปัจจุบัน',
      'ออกแบบโครงสร้างทีมสุขภาพจิตที่เหมาะสม',
      'Workshop กำหนดบทบาทหน้าที่ (1 วัน)',
      'Template แผนงานประจำปี',
      'Follow-up 3 เดือน'
    ],
    deliverables: [
      'คู่มือทีมสุขภาพจิตโรงเรียน',
      'แผนผังโครงสร้างทีม',
      'แผนงานประจำปี'
    ],
    duration: '1-2 เดือน',
    icon: '👥'
  },

  // ================================
  // PACKAGE 2: Needs Assessment
  // สำหรับโรงเรียนที่คะแนนต่ำใน Domain 2
  // ================================
  NEEDS_ASSESSMENT: {
    id: 'needs_assessment',
    name: 'Needs Assessment System',
    nameTH: 'แพ็คเกจระบบประเมินความต้องการ',
    domains: [2], // Maps to Domain 2: Needs Assessment
    description: 'ระบบสำรวจและวิเคราะห์ความต้องการด้านสุขภาพจิตของนักเรียน',
    price: 0, // TODO: ตั้งราคา
    pricePerStudent: 0,
    includes: [
      'ระบบแบบสำรวจออนไลน์สำหรับนักเรียน',
      'ระบบแบบสำรวจสำหรับครูและผู้ปกครอง',
      'Dashboard วิเคราะห์ผล',
      'AI Report สรุปความต้องการ',
      'แผนตอบสนองความต้องการ'
    ],
    deliverables: [
      'รายงานผลสำรวจ',
      'Infographic สรุปผล',
      'แผนการดำเนินงาน'
    ],
    duration: '1 เดือน',
    icon: '📊'
  },

  // ================================
  // PACKAGE 3: AI Screening System
  // สำหรับโรงเรียนที่คะแนนต่ำใน Domain 3
  // ================================
  AI_SCREENING: {
    id: 'ai_screening',
    name: 'AI Mental Health Screening',
    nameTH: 'แพ็คเกจคัดกรองสุขภาพจิต AI',
    domains: [3], // Maps to Domain 3: Screening
    description: 'ระบบคัดกรองสุขภาพจิตนักเรียนด้วย AI แบบ Universal Screening',
    price: 0, // TODO: ตั้งราคา (ต่อปีการศึกษา)
    pricePerStudent: 0, // ต่อหัวนักเรียน
    includes: [
      'ระบบคัดกรองออนไลน์ (SDQ, PHQ-9, GAD-7)',
      'AI Risk Assessment',
      'Dashboard สำหรับผู้บริหาร',
      'ระบบติดตามนักเรียนกลุ่มเสี่ยง',
      'รายงานเทอม',
      'อบรมครูใช้งานระบบ'
    ],
    deliverables: [
      'ระบบคัดกรองออนไลน์ (ใช้ได้ 1 ปี)',
      'รายงานผลคัดกรองรายคน',
      'รายงานสรุประดับชั้น/โรงเรียน',
      'Risk Alert System'
    ],
    duration: '1 ปีการศึกษา',
    icon: '🔍',
    isPopular: true
  },

  // ================================
  // PACKAGE 4: SEL & Promotion Program
  // สำหรับโรงเรียนที่คะแนนต่ำใน Domain 4
  // ================================
  SEL_PROGRAM: {
    id: 'sel_program',
    name: 'SEL & Mental Health Promotion',
    nameTH: 'แพ็คเกจส่งเสริมสุขภาพจิต',
    domains: [4], // Maps to Domain 4: Tier 1 Promotion
    description: 'โปรแกรม Social Emotional Learning และส่งเสริมสุขภาพจิตครบวงจร',
    price: 0, // TODO: ตั้งราคา
    pricePerStudent: 0,
    includes: [
      'หลักสูตร SEL 12 บทเรียน',
      'Psychoeducation Comics ทั้ง 6 ตอน',
      'กิจกรรม Anti-bullying',
      'กิจกรรมลดความเครียด (Mindfulness)',
      'สื่อรณรงค์ลดตีตรา',
      'อบรมครูสอน SEL'
    ],
    deliverables: [
      'คู่มือครู + แผนการสอน',
      'สื่อการสอนดิจิทัล',
      'ใบงานและกิจกรรม',
      'Poster & Infographic'
    ],
    duration: '1 ปีการศึกษา',
    icon: '🌟'
  },

  // ================================
  // PACKAGE 5: Intervention System
  // สำหรับโรงเรียนที่คะแนนต่ำใน Domain 5
  // ================================
  INTERVENTION_SYSTEM: {
    id: 'intervention_system',
    name: 'Tier 2-3 Intervention System',
    nameTH: 'แพ็คเกจระบบช่วยเหลือและส่งต่อ',
    domains: [5], // Maps to Domain 5: Tier 2&3 Intervention
    description: 'ระบบช่วยเหลือนักเรียนกลุ่มเสี่ยงและการส่งต่อผู้เชี่ยวชาญ',
    price: 0, // TODO: ตั้งราคา
    pricePerStudent: 0,
    includes: [
      'ระบบ IEP ออนไลน์',
      'คู่มือให้คำปรึกษาเบื้องต้น',
      'ระบบนัดหมาย + ส่งต่อนักจิตวิทยา',
      'Crisis Intervention Protocol',
      'Training ให้คำปรึกษาเบื้องต้น (2 วัน)',
      'Supervision รายเดือน'
    ],
    deliverables: [
      'ระบบ Case Management',
      'Template IEP',
      'คู่มือ Crisis Response',
      'เครือข่ายส่งต่อ'
    ],
    duration: '1 ปีการศึกษา',
    icon: '🤝'
  },

  // ================================
  // PACKAGE 6: Psychologist Consultation
  // สำหรับโรงเรียนที่ต้องการนักจิตวิทยาประจำ
  // ================================
  PSYCHOLOGIST_SERVICE: {
    id: 'psychologist_service',
    name: 'School Psychologist Service',
    nameTH: 'แพ็คเกจนักจิตวิทยาประจำโรงเรียน',
    domains: [5, 3], // Supports both Intervention and Screening
    description: 'บริการนักจิตวิทยาประจำโรงเรียน (Part-time หรือ Full-time)',
    price: 0, // TODO: ตั้งราคาต่อเดือน
    pricePerStudent: 0,
    includes: [
      'นักจิตวิทยาประจำ (ครึ่งวัน/เต็มวัน)',
      'ให้คำปรึกษารายบุคคล',
      'จัดกลุ่มบำบัด',
      'ร่วมประชุมทีม',
      'รายงานประจำเดือน'
    ],
    options: [
      { name: 'Part-time (ครึ่งวัน/สัปดาห์)', priceMultiplier: 0.25 },
      { name: 'Part-time (1 วัน/สัปดาห์)', priceMultiplier: 0.5 },
      { name: 'Part-time (2 วัน/สัปดาห์)', priceMultiplier: 0.8 },
      { name: 'Full-time (5 วัน/สัปดาห์)', priceMultiplier: 1.0 }
    ],
    deliverables: [
      'รายงานการให้บริการรายเดือน',
      'สรุป Case Management',
      'ข้อเสนอแนะเชิงระบบ'
    ],
    duration: 'รายเดือน/รายเทอม/รายปี',
    icon: '🧠',
    isPopular: true
  },

  // ================================
  // PACKAGE 7: Teacher Training
  // สำหรับ Domain 1, 4, 6
  // ================================
  TEACHER_TRAINING: {
    id: 'teacher_training',
    name: 'Teacher Mental Health Training',
    nameTH: 'แพ็คเกจอบรมครู',
    domains: [1, 4, 6], // Supports Teaming, Promotion, Funding (capacity building)
    description: 'อบรมพัฒนาศักยภาพครูด้านการดูแลสุขภาพจิตนักเรียน',
    price: 0, // TODO: ตั้งราคาต่อคอร์ส
    pricePerStudent: 0, // ต่อครู
    includes: [
      'อบรม "การสังเกตและคัดกรองเบื้องต้น" (3 ชม.)',
      'อบรม "ทักษะการรับฟังและให้คำปรึกษา" (6 ชม.)',
      'อบรม "การช่วยเหลือนักเรียนที่มีปัญหา" (3 ชม.)',
      'เอกสารประกอบการอบรม',
      'วุฒิบัตร'
    ],
    options: [
      { name: 'Basic (3 ชม.)', hours: 3 },
      { name: 'Standard (6 ชม.)', hours: 6 },
      { name: 'Comprehensive (12 ชม.)', hours: 12 }
    ],
    deliverables: [
      'เอกสารประกอบการอบรม',
      'คู่มือครู',
      'วุฒิบัตร'
    ],
    duration: 'ครึ่งวัน/1 วัน/2 วัน',
    icon: '📖'
  },

  // ================================
  // PACKAGE 8: Data & Impact
  // สำหรับโรงเรียนที่คะแนนต่ำใน Domain 6, 7
  // ================================
  DATA_SYSTEM: {
    id: 'data_system',
    name: 'Mental Health Data System',
    nameTH: 'แพ็คเกจระบบข้อมูลสุขภาพจิต',
    domains: [6, 7], // Supports Funding and Impact
    description: 'ระบบจัดเก็บข้อมูลและวัดผลกระทบงานสุขภาพจิต',
    price: 0, // TODO: ตั้งราคา (ต่อปี)
    pricePerStudent: 0,
    includes: [
      'Dashboard บริหารจัดการ',
      'ระบบรายงานอัตโนมัติ',
      'วิเคราะห์แนวโน้ม (Trend Analysis)',
      'เปรียบเทียบผลก่อน-หลัง',
      'รายงานสำหรับผู้บริหาร/ต้นสังกัด'
    ],
    deliverables: [
      'Dashboard ออนไลน์',
      'รายงานประจำเทอม',
      'Infographic สรุปผล'
    ],
    duration: '1 ปีการศึกษา',
    icon: '📈'
  }
};

// ================================
// BUNDLE PACKAGES (แพ็คเกจรวม)
// ================================
export const BUNDLE_PACKAGES = {
  // ================================
  // STARTER BUNDLE
  // ================================
  STARTER: {
    id: 'bundle_starter',
    name: 'Starter Bundle',
    nameTH: 'แพ็คเกจเริ่มต้น',
    description: 'เหมาะสำหรับโรงเรียนที่เริ่มต้นระบบสุขภาพจิต',
    includes: ['AI_SCREENING', 'TEACHER_TRAINING'],
    price: 0, // TODO: ตั้งราคา
    discount: 15, // ส่วนลด %
    icon: '🌱'
  },

  // ================================
  // STANDARD BUNDLE
  // ================================
  STANDARD: {
    id: 'bundle_standard',
    name: 'Standard Bundle',
    nameTH: 'แพ็คเกจมาตรฐาน',
    description: 'ระบบสุขภาพจิตครบวงจรสำหรับโรงเรียนทั่วไป',
    includes: ['AI_SCREENING', 'SEL_PROGRAM', 'TEACHER_TRAINING', 'DATA_SYSTEM'],
    price: 0, // TODO: ตั้งราคา
    discount: 20, // ส่วนลด %
    icon: '⭐',
    isPopular: true
  },

  // ================================
  // PREMIUM BUNDLE
  // ================================
  PREMIUM: {
    id: 'bundle_premium',
    name: 'Premium Bundle',
    nameTH: 'แพ็คเกจพรีเมียม',
    description: 'ระบบสุขภาพจิตเต็มรูปแบบ + นักจิตวิทยาประจำ',
    includes: [
      'TEAMING_SETUP',
      'NEEDS_ASSESSMENT',
      'AI_SCREENING',
      'SEL_PROGRAM',
      'INTERVENTION_SYSTEM',
      'PSYCHOLOGIST_SERVICE',
      'TEACHER_TRAINING',
      'DATA_SYSTEM'
    ],
    price: 0, // TODO: ตั้งราคา
    discount: 30, // ส่วนลด %
    icon: '👑'
  }
};

// ================================
// DOMAIN TO PACKAGE MAPPING
// ================================
export const DOMAIN_PACKAGE_MAP = {
  1: ['TEAMING_SETUP', 'TEACHER_TRAINING'], // Teaming
  2: ['NEEDS_ASSESSMENT'], // Needs Assessment
  3: ['AI_SCREENING', 'PSYCHOLOGIST_SERVICE'], // Screening
  4: ['SEL_PROGRAM', 'TEACHER_TRAINING'], // Tier 1 Promotion
  5: ['INTERVENTION_SYSTEM', 'PSYCHOLOGIST_SERVICE'], // Tier 2&3
  6: ['TEACHER_TRAINING', 'DATA_SYSTEM'], // Funding/Resources
  7: ['DATA_SYSTEM'] // Impact
};

// ================================
// PRICING CONFIG
// ================================
export const PRICING_CONFIG = {
  currency: 'THB',
  currencySymbol: '฿',
  vatRate: 7, // VAT 7%
  includeVAT: false, // ราคาที่แสดงยังไม่รวม VAT

  // Student count tiers for per-student pricing
  studentTiers: [
    { min: 1, max: 500, discount: 0 },
    { min: 501, max: 1000, discount: 5 },
    { min: 1001, max: 2000, discount: 10 },
    { min: 2001, max: 9999, discount: 15 }
  ]
};

/**
 * Get recommended packages based on SMHQA scores
 * @param {Object} domainScores - Scores by domain from SMHQA
 * @returns {Array} Recommended packages sorted by priority
 */
export function getRecommendedPackages(domainScores) {
  const recommendations = [];

  // Get weak domains (score < 50%)
  const weakDomains = Object.entries(domainScores)
    .filter(([_, score]) => score.percentage < 50)
    .sort((a, b) => a[1].percentage - b[1].percentage);

  // Map weak domains to packages
  const addedPackages = new Set();

  for (const [domainId, score] of weakDomains) {
    const packages = DOMAIN_PACKAGE_MAP[domainId] || [];

    for (const packageId of packages) {
      if (!addedPackages.has(packageId)) {
        addedPackages.add(packageId);
        recommendations.push({
          package: B2B_PACKAGES[packageId],
          priority: 100 - score.percentage, // Higher priority for lower scores
          reason: `พัฒนาด้าน${score.nameTH} (ปัจจุบัน ${score.percentage}%)`
        });
      }
    }
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
}

/**
 * Calculate bundle price with discount
 * @param {Object} bundle - Bundle package
 * @param {number} studentCount - Number of students
 * @returns {Object} Price breakdown
 */
export function calculateBundlePrice(bundle, studentCount = 500) {
  let totalBase = 0;
  const packageDetails = [];

  for (const packageId of bundle.includes) {
    const pkg = B2B_PACKAGES[packageId];
    if (pkg) {
      const basePrice = pkg.price || (pkg.pricePerStudent * studentCount);
      totalBase += basePrice;
      packageDetails.push({
        id: packageId,
        name: pkg.nameTH,
        price: basePrice
      });
    }
  }

  const discountAmount = totalBase * (bundle.discount / 100);
  const discountedPrice = totalBase - discountAmount;

  // Apply student tier discount
  const tier = PRICING_CONFIG.studentTiers.find(
    t => studentCount >= t.min && studentCount <= t.max
  );
  const tierDiscount = tier ? tier.discount : 0;
  const tierDiscountAmount = discountedPrice * (tierDiscount / 100);
  const finalPrice = discountedPrice - tierDiscountAmount;

  // VAT
  const vatAmount = PRICING_CONFIG.includeVAT ? 0 : finalPrice * (PRICING_CONFIG.vatRate / 100);
  const totalWithVAT = finalPrice + vatAmount;

  return {
    packages: packageDetails,
    subtotal: totalBase,
    bundleDiscount: bundle.discount,
    bundleDiscountAmount: discountAmount,
    afterBundleDiscount: discountedPrice,
    tierDiscount,
    tierDiscountAmount,
    beforeVAT: finalPrice,
    vatRate: PRICING_CONFIG.vatRate,
    vatAmount,
    total: totalWithVAT
  };
}

/**
 * Generate proposal for school
 * @param {Object} schoolInfo - School information
 * @param {Object} scores - SMHQA scores
 * @returns {Object} Proposal data
 */
export function generateProposal(schoolInfo, scores) {
  const recommendations = getRecommendedPackages(scores.domainScores);
  const studentCount = parseInt(schoolInfo.studentCount) || 500;

  // Suggest appropriate bundle
  let suggestedBundle;
  const weakDomainsCount = Object.values(scores.domainScores)
    .filter(d => d.percentage < 50).length;

  if (weakDomainsCount >= 5) {
    suggestedBundle = BUNDLE_PACKAGES.PREMIUM;
  } else if (weakDomainsCount >= 3) {
    suggestedBundle = BUNDLE_PACKAGES.STANDARD;
  } else {
    suggestedBundle = BUNDLE_PACKAGES.STARTER;
  }

  return {
    proposalId: `PROP-${Date.now()}`,
    createdAt: new Date().toISOString(),
    school: schoolInfo,
    assessment: {
      totalScore: scores.totalPercentage,
      level: scores.overallLevel,
      weakDomains: Object.values(scores.domainScores)
        .filter(d => d.percentage < 50)
        .map(d => ({ name: d.nameTH, score: d.percentage }))
    },
    recommendations: recommendations.slice(0, 5),
    suggestedBundle,
    bundlePricing: calculateBundlePrice(suggestedBundle, studentCount),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };
}

export default {
  B2B_PACKAGES,
  BUNDLE_PACKAGES,
  DOMAIN_PACKAGE_MAP,
  PRICING_CONFIG,
  getRecommendedPackages,
  calculateBundlePrice,
  generateProposal
};
