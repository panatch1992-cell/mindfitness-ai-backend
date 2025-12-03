/**
 * Mode Configuration Tests
 */

import { describe, it, expect } from 'vitest';
import {
  caseInstructions,
  getCaseInstruction,
  getModeInstruction,
  getMaxTokens,
  workshopKeywords,
  isWorkshopRequest,
  paymentKeywords,
  isPaymentRequest,
  premiumKeywords,
  hasPremiumIndicator,
} from '../utils/modes.js';

describe('Modes Configuration Module', () => {
  describe('caseInstructions', () => {
    it('should have anxiety case', () => {
      expect(caseInstructions.anxiety).toContain('ANXIETY');
    });

    it('should have sadness case', () => {
      expect(caseInstructions.sadness).toContain('SADNESS');
    });

    it('should have general case as fallback', () => {
      expect(caseInstructions.general).toContain('GENERAL');
    });
  });

  describe('getCaseInstruction()', () => {
    it('should return anxiety instruction for "anxiety"', () => {
      const instruction = getCaseInstruction('anxiety');
      expect(instruction).toContain('ANXIETY');
      expect(instruction).toContain('Overthinking');
    });

    it('should return sadness instruction for "sadness"', () => {
      const instruction = getCaseInstruction('sadness');
      expect(instruction).toContain('SADNESS');
      expect(instruction).toContain('Anhedonia');
    });

    it('should be case insensitive', () => {
      expect(getCaseInstruction('ANXIETY')).toBe(getCaseInstruction('anxiety'));
    });

    it('should return general instruction for unknown case', () => {
      expect(getCaseInstruction('unknown')).toBe(caseInstructions.general);
    });

    it('should return general instruction for null', () => {
      expect(getCaseInstruction(null)).toBe(caseInstructions.general);
    });

    it('should return general instruction for undefined', () => {
      expect(getCaseInstruction(undefined)).toBe(caseInstructions.general);
    });
  });

  describe('getModeInstruction()', () => {
    it('should return premium instruction when isPremium is true', () => {
      const instruction = getModeInstruction(true);
      expect(instruction).toContain('PREMIUM');
      expect(instruction).toContain('DSM-5');
    });

    it('should return free instruction when isPremium is false', () => {
      const instruction = getModeInstruction(false);
      expect(instruction).toContain('FREE');
      expect(instruction).toContain('Validate feeling');
    });

    it('should return free instruction when isPremium is undefined', () => {
      const instruction = getModeInstruction(undefined);
      expect(instruction).toContain('FREE');
    });
  });

  describe('getMaxTokens()', () => {
    it('should return 1500 for premium users', () => {
      expect(getMaxTokens(true)).toBe(1500);
    });

    it('should return 600 for free users', () => {
      expect(getMaxTokens(false)).toBe(600);
    });

    it('should return 600 when undefined', () => {
      expect(getMaxTokens(undefined)).toBe(600);
    });
  });

  describe('workshopKeywords', () => {
    it('should match English workshop keywords', () => {
      expect(workshopKeywords.test('workshop')).toBe(true);
      expect(workshopKeywords.test('training')).toBe(true);
      expect(workshopKeywords.test('course')).toBe(true);
    });

    it('should match Thai workshop keywords', () => {
      expect(workshopKeywords.test('อบรม')).toBe(true);
      expect(workshopKeywords.test('หลักสูตร')).toBe(true);
    });

    it('should match Chinese workshop keywords', () => {
      expect(workshopKeywords.test('培训')).toBe(true);
      expect(workshopKeywords.test('课程')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(workshopKeywords.test('WORKSHOP')).toBe(true);
      expect(workshopKeywords.test('Workshop')).toBe(true);
    });
  });

  describe('isWorkshopRequest()', () => {
    it('should return true for workshop-related messages', () => {
      expect(isWorkshopRequest('I want to design a workshop')).toBe(true);
      expect(isWorkshopRequest('ออกแบบหลักสูตรให้หน่อย')).toBe(true);
      expect(isWorkshopRequest('我需要培训课程')).toBe(true);
    });

    it('should return false for non-workshop messages', () => {
      expect(isWorkshopRequest('I feel sad today')).toBe(false);
      expect(isWorkshopRequest('Hello')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isWorkshopRequest(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isWorkshopRequest(undefined)).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(isWorkshopRequest(123)).toBe(false);
      expect(isWorkshopRequest({})).toBe(false);
    });
  });

  describe('paymentKeywords', () => {
    it('should include Thai payment keywords', () => {
      expect(paymentKeywords).toContain('สมัคร');
      expect(paymentKeywords).toContain('จ่ายเงิน');
    });

    it('should include English payment keywords', () => {
      expect(paymentKeywords).toContain('premium');
      expect(paymentKeywords).toContain('buy');
      expect(paymentKeywords).toContain('pay');
    });

    it('should include Chinese payment keywords', () => {
      expect(paymentKeywords).toContain('购买');
      expect(paymentKeywords).toContain('充值');
    });
  });

  describe('isPaymentRequest()', () => {
    it('should detect Thai payment requests', () => {
      expect(isPaymentRequest('อยากสมัคร premium')).toBe(true);
      expect(isPaymentRequest('จ่ายเงิน')).toBe(true);
    });

    it('should detect English payment requests', () => {
      expect(isPaymentRequest('I want to buy premium')).toBe(true);
      expect(isPaymentRequest('How do I pay?')).toBe(true);
    });

    it('should detect Chinese payment requests', () => {
      expect(isPaymentRequest('我要购买')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isPaymentRequest('PREMIUM')).toBe(true);
      expect(isPaymentRequest('Premium')).toBe(true);
    });

    it('should return false for non-payment messages', () => {
      expect(isPaymentRequest('Hello')).toBe(false);
      expect(isPaymentRequest('I feel sad')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isPaymentRequest(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isPaymentRequest(undefined)).toBe(false);
    });
  });

  describe('premiumKeywords', () => {
    it('should include Thai premium indicators', () => {
      expect(premiumKeywords).toContain('โอนแล้ว');
      expect(premiumKeywords).toContain('เจาะลึก');
      expect(premiumKeywords).toContain('ออกแบบ');
    });

    it('should include English premium indicators', () => {
      expect(premiumKeywords).toContain('paid');
    });

    it('should include Chinese premium indicators', () => {
      expect(premiumKeywords).toContain('已付');
    });
  });

  describe('hasPremiumIndicator()', () => {
    it('should detect Thai premium indicators', () => {
      expect(hasPremiumIndicator('โอนแล้วครับ')).toBe(true);
      expect(hasPremiumIndicator('ช่วยเจาะลึกหน่อย')).toBe(true);
    });

    it('should detect English premium indicators', () => {
      expect(hasPremiumIndicator('I have paid already')).toBe(true);
    });

    it('should detect Chinese premium indicators', () => {
      expect(hasPremiumIndicator('已付款了')).toBe(true);
    });

    it('should return false for non-premium messages', () => {
      expect(hasPremiumIndicator('Hello')).toBe(false);
      expect(hasPremiumIndicator('I want to buy')).toBe(false);
    });

    it('should return false for null', () => {
      expect(hasPremiumIndicator(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasPremiumIndicator(undefined)).toBe(false);
    });
  });
});
