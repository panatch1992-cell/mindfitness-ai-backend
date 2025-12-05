/**
 * Crisis Detection Tests
 *
 * CRITICAL: These tests ensure suicide/self-harm detection works correctly.
 * 100% coverage is required for this module.
 */

import { describe, it, expect } from 'vitest';
import {
  crisisPatterns,
  crisisResources,
  crisisMessages,
  detectCrisis,
  createCrisisResponse,
  handleCrisisCheck,
  getCrisisMessage,
  createLocalizedCrisisResponse,
} from '../utils/crisis.js';

describe('Crisis Detection Module', () => {
  describe('crisisPatterns', () => {
    it('should have patterns for Thai language', () => {
      const thaiPatterns = crisisPatterns.filter(p =>
        p.source.includes('ฆ่าตัวตาย') ||
        p.source.includes('อยากตาย') ||
        p.source.includes('ไม่อยากอยู่') ||
        p.source.includes('ไม่อยากมีชีวิต') ||
        p.source.includes('ทำร้ายตัวเอง')
      );
      expect(thaiPatterns.length).toBeGreaterThanOrEqual(3);
    });

    it('should have patterns for English language', () => {
      const englishPatterns = crisisPatterns.filter(p =>
        p.source.includes('suicide') ||
        p.source.includes('kill myself') ||
        p.source.includes('end my life') ||
        p.source.includes('hurt myself') ||
        p.source.includes('want to die')
      );
      expect(englishPatterns.length).toBeGreaterThanOrEqual(4);
    });

    it('should have patterns for Chinese language', () => {
      const chinesePatterns = crisisPatterns.filter(p =>
        p.source.includes('自杀') ||
        p.source.includes('想死') ||
        p.source.includes('不想活') ||
        p.source.includes('自残')
      );
      expect(chinesePatterns.length).toBeGreaterThanOrEqual(3);
    });

    it('should have comprehensive crisis patterns', () => {
      expect(crisisPatterns.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('crisisResources', () => {
    it('should include Thailand Hotline 1323', () => {
      const hotline = crisisResources.find(r => r.info === '1323');
      expect(hotline).toBeDefined();
      expect(hotline.name).toBe('Thailand Hotline');
    });

    it('should include Samaritans Thailand', () => {
      const samaritans = crisisResources.find(r => r.info === '02-713-6793');
      expect(samaritans).toBeDefined();
      expect(samaritans.name).toBe('Samaritans Thailand');
    });

    it('should have at least 2 resources', () => {
      expect(crisisResources.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('detectCrisis()', () => {
    describe('Thai language detection', () => {
      it('should detect "ฆ่าตัวตาย" (kill oneself)', () => {
        expect(detectCrisis('ฉันอยากฆ่าตัวตาย')).toBe(true);
      });

      it('should detect "อยากตาย" (want to die)', () => {
        expect(detectCrisis('ฉันอยากตาย')).toBe(true);
      });

      it('should detect crisis in longer Thai sentences', () => {
        expect(detectCrisis('วันนี้รู้สึกแย่มาก อยากตาย ไม่อยากอยู่แล้ว')).toBe(true);
      });
    });

    describe('English language detection', () => {
      it('should detect "suicide"', () => {
        expect(detectCrisis('I am thinking about suicide')).toBe(true);
      });

      it('should detect "kill myself"', () => {
        expect(detectCrisis('I want to kill myself')).toBe(true);
      });

      it('should be case insensitive for "SUICIDE"', () => {
        expect(detectCrisis('SUICIDE')).toBe(true);
      });

      it('should be case insensitive for "Suicide"', () => {
        expect(detectCrisis('Suicide')).toBe(true);
      });

      it('should be case insensitive for "Kill Myself"', () => {
        expect(detectCrisis('Kill Myself')).toBe(true);
      });

      it('should detect crisis in longer English sentences', () => {
        expect(detectCrisis('I have been feeling so depressed lately and sometimes I think about suicide')).toBe(true);
      });
    });

    describe('Chinese language detection', () => {
      it('should detect "自杀" (suicide)', () => {
        expect(detectCrisis('我想自杀')).toBe(true);
      });

      it('should detect "想死" (want to die)', () => {
        expect(detectCrisis('我想死了')).toBe(true);
      });

      it('should detect crisis in longer Chinese sentences', () => {
        expect(detectCrisis('我感觉很绝望，想死')).toBe(true);
      });
    });

    describe('Non-crisis messages', () => {
      it('should not detect crisis in normal greeting', () => {
        expect(detectCrisis('Hello, how are you?')).toBe(false);
      });

      it('should not detect crisis in Thai greeting', () => {
        expect(detectCrisis('สวัสดีครับ')).toBe(false);
      });

      it('should not detect crisis in Chinese greeting', () => {
        expect(detectCrisis('你好')).toBe(false);
      });

      it('should not detect crisis in emotional but non-crisis messages', () => {
        expect(detectCrisis('I feel sad today')).toBe(false);
        expect(detectCrisis('ฉันเศร้ามาก')).toBe(false);
        expect(detectCrisis('我很难过')).toBe(false);
      });

      it('should not detect crisis in anxiety messages', () => {
        expect(detectCrisis('I am anxious about my exam')).toBe(false);
      });

      it('should not detect crisis in work stress messages', () => {
        expect(detectCrisis('Work is so stressful')).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should return false for null input', () => {
        expect(detectCrisis(null)).toBe(false);
      });

      it('should return false for undefined input', () => {
        expect(detectCrisis(undefined)).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(detectCrisis('')).toBe(false);
      });

      it('should return false for non-string input (number)', () => {
        expect(detectCrisis(123)).toBe(false);
      });

      it('should return false for non-string input (object)', () => {
        expect(detectCrisis({ message: 'suicide' })).toBe(false);
      });

      it('should return false for non-string input (array)', () => {
        expect(detectCrisis(['suicide'])).toBe(false);
      });

      it('should handle whitespace-only strings', () => {
        expect(detectCrisis('   ')).toBe(false);
      });

      it('should detect crisis keyword surrounded by whitespace', () => {
        expect(detectCrisis('   suicide   ')).toBe(true);
      });
    });

    describe('Mixed language messages', () => {
      it('should detect Thai crisis keyword in mixed message', () => {
        expect(detectCrisis('I feel อยากตาย today')).toBe(true);
      });

      it('should detect English crisis keyword in mixed message', () => {
        expect(detectCrisis('ฉันคิดเรื่อง suicide')).toBe(true);
      });
    });
  });

  describe('createCrisisResponse()', () => {
    it('should return crisis: true', () => {
      const response = createCrisisResponse();
      expect(response.crisis).toBe(true);
    });

    it('should return message: "CRISIS_DETECTED"', () => {
      const response = createCrisisResponse();
      expect(response.message).toBe('CRISIS_DETECTED');
    });

    it('should include resources array', () => {
      const response = createCrisisResponse();
      expect(Array.isArray(response.resources)).toBe(true);
      expect(response.resources.length).toBeGreaterThan(0);
    });

    it('should include Thailand Hotline in resources', () => {
      const response = createCrisisResponse();
      const hasHotline = response.resources.some(r => r.info === '1323');
      expect(hasHotline).toBe(true);
    });
  });

  describe('handleCrisisCheck()', () => {
    it('should return crisis response for crisis message', () => {
      const result = handleCrisisCheck('I want to kill myself');
      expect(result).not.toBeNull();
      expect(result.crisis).toBe(true);
      expect(result.message).toBe('CRISIS_DETECTED');
    });

    it('should return null for non-crisis message', () => {
      const result = handleCrisisCheck('Hello, I need help with my anxiety');
      expect(result).toBeNull();
    });

    it('should return null for empty message', () => {
      const result = handleCrisisCheck('');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = handleCrisisCheck(null);
      expect(result).toBeNull();
    });
  });

  describe('crisisMessages', () => {
    it('should have Thai message', () => {
      expect(crisisMessages.th).toBeDefined();
      expect(crisisMessages.th).toContain('1323');
    });

    it('should have English message', () => {
      expect(crisisMessages.en).toBeDefined();
      expect(crisisMessages.en).toContain('1323');
    });

    it('should have Chinese message', () => {
      expect(crisisMessages.cn).toBeDefined();
      expect(crisisMessages.cn).toContain('1323');
    });
  });

  describe('getCrisisMessage()', () => {
    it('should return Thai message for th', () => {
      const message = getCrisisMessage('th');
      expect(message).toContain('เราเป็นห่วง');
    });

    it('should return English message for en', () => {
      const message = getCrisisMessage('en');
      expect(message).toContain('worried about you');
    });

    it('should return Chinese message for cn', () => {
      const message = getCrisisMessage('cn');
      expect(message).toContain('担心');
    });

    it('should default to Thai for unknown language', () => {
      const message = getCrisisMessage('unknown');
      expect(message).toBe(crisisMessages.th);
    });
  });

  describe('createLocalizedCrisisResponse()', () => {
    it('should return crisis: true', () => {
      const response = createLocalizedCrisisResponse('th');
      expect(response.crisis).toBe(true);
    });

    it('should include localized message', () => {
      const thResponse = createLocalizedCrisisResponse('th');
      expect(thResponse.message).toContain('เราเป็นห่วง');

      const enResponse = createLocalizedCrisisResponse('en');
      expect(enResponse.message).toContain('worried');
    });

    it('should include resources', () => {
      const response = createLocalizedCrisisResponse('en');
      expect(response.resources).toBeDefined();
      expect(response.resources.length).toBeGreaterThan(0);
    });
  });
});
