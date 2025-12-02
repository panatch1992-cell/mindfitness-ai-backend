/**
 * Mode Configuration Utility
 *
 * Handles different interaction modes: Free, Premium, Workshop, Toolkit, Vent
 */

/**
 * Case type instructions for emotional support
 */
export const caseInstructions = {
  anxiety: `[CASE: ANXIETY (Rank 1)] Focus: Restless, Overthinking. Stigma: "Crazy/Weak". Goal: Grounding.`,
  sadness: `[CASE: SADNESS (Rank 2)] Focus: Low energy, Anhedonia. Stigma: "Lazy". Goal: Acceptance.`,
  anger: `[CASE: ANGER] Focus: Frustration, Irritability. Stigma: "Aggressive". Goal: Regulation.`,
  loneliness: `[CASE: LONELINESS] Focus: Isolation, Disconnection. Stigma: "Unlikeable". Goal: Connection.`,
  stress: `[CASE: STRESS] Focus: Overwhelmed, Pressure. Stigma: "Can't handle it". Goal: Relief.`,
  grief: `[CASE: GRIEF] Focus: Loss, Mourning. Stigma: "Move on already". Goal: Processing.`,
  shame: `[CASE: SHAME] Focus: Self-blame, Unworthiness. Stigma: "Deserve it". Goal: Self-compassion.`,
  burnout: `[CASE: BURNOUT] Focus: Exhaustion, Cynicism. Stigma: "Weak worker". Goal: Recovery.`,
  relationship: `[CASE: RELATIONSHIP] Focus: Interpersonal conflict. Stigma: "Drama". Goal: Understanding.`,
  general: `[CASE: GENERAL] Focus: Listening.`,
};

/**
 * Gets the case instruction for a specific case type
 * @param {string} caseType - The type of emotional case
 * @returns {string} - Case instruction string
 */
export function getCaseInstruction(caseType) {
  const normalizedCase = (caseType || 'general').toLowerCase();
  return caseInstructions[normalizedCase] || caseInstructions.general;
}

/**
 * Gets the mode instruction based on premium status
 * @param {boolean} isPremium - Whether user has premium access
 * @returns {string} - Mode instruction string
 */
export function getModeInstruction(isPremium) {
  if (isPremium) {
    return `[MODE: PREMIUM DEEP DIVE] Senior Analyst. Deconstruct Stigma using DSM-5 & Research. Length: 5-8 sentences.`;
  }
  return `[MODE: FREE BASIC SUPPORT] Validate feeling -> Identify Stigma -> Ask 1 Reflective Question. Upsell Premium if needed. Length: 3-4 sentences.`;
}

/**
 * Gets max tokens based on premium status
 * @param {boolean} isPremium - Whether user has premium access
 * @returns {number} - Max tokens for API call
 */
export function getMaxTokens(isPremium) {
  return isPremium ? 1500 : 600;
}

/**
 * Workshop keyword patterns for detection
 */
export const workshopKeywords = /(workshop|training|course|อบรม|หลักสูตร|培训|课程)/i;

/**
 * Detects if a message is requesting workshop design
 * @param {string} message - The message to check
 * @returns {boolean} - True if workshop-related
 */
export function isWorkshopRequest(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }
  return workshopKeywords.test(message);
}

/**
 * Payment keywords for premium upgrade detection
 */
export const paymentKeywords = ["สมัคร", "premium", "จ่ายเงิน", "buy", "pay", "购买", "充值"];

/**
 * Detects if a message is requesting payment/premium
 * @param {string} message - The message to check
 * @returns {boolean} - True if payment-related
 */
export function isPaymentRequest(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }
  const lowerMessage = message.toLowerCase();
  return paymentKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Premium status keywords (mockup detection)
 */
export const premiumKeywords = ["โอนแล้ว", "paid", "已付", "เจาะลึก", "ออกแบบ"];

/**
 * Detects if a user has indicated premium status
 * @param {string} message - The message to check
 * @returns {boolean} - True if premium indicators found
 */
export function hasPremiumIndicator(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }
  return premiumKeywords.some(keyword => message.includes(keyword));
}
