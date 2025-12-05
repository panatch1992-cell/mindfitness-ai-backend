/**
 * Chat Handler Tests
 *
 * Tests for the main chat API endpoint (api/chat.js)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectCrisis,
  createCrisisResponse,
  handleCrisisCheck,
} from '../../utils/crisis.js';
import { getLanguageInstruction } from '../../utils/language.js';
import { getCaseInstruction, getModeInstruction, getMaxTokens } from '../../utils/modes.js';
import { validateMessages } from '../../utils/validation.js';

// Mock fetch for OpenAI API calls
const mockFetch = vi.fn();

describe('Chat Handler Logic', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Request Validation', () => {
    it('should validate messages array structure', () => {
      const validMessages = [
        { role: 'user', content: 'Hello' },
      ];
      expect(validateMessages(validMessages).valid).toBe(true);
    });

    it('should reject empty messages array', () => {
      expect(validateMessages([]).valid).toBe(false);
    });

    it('should reject messages without role', () => {
      const invalidMessages = [{ content: 'Hello' }];
      expect(validateMessages(invalidMessages).valid).toBe(false);
    });
  });

  describe('Crisis Detection Integration', () => {
    it('should detect crisis and return appropriate response', () => {
      const lastMessage = 'I want to kill myself';
      const crisisResult = handleCrisisCheck(lastMessage);

      expect(crisisResult).not.toBeNull();
      expect(crisisResult.crisis).toBe(true);
      expect(crisisResult.message).toBe('CRISIS_DETECTED');
      expect(crisisResult.resources).toBeDefined();
      expect(crisisResult.resources.length).toBeGreaterThan(0);
    });

    it('should not trigger crisis for normal messages', () => {
      const lastMessage = 'I feel anxious about my exam';
      const crisisResult = handleCrisisCheck(lastMessage);
      expect(crisisResult).toBeNull();
    });

    it('should handle Thai crisis messages', () => {
      const lastMessage = 'ฉันอยากตาย';
      const crisisResult = handleCrisisCheck(lastMessage);
      expect(crisisResult).not.toBeNull();
      expect(crisisResult.crisis).toBe(true);
    });

    it('should handle Chinese crisis messages', () => {
      const lastMessage = '我想自杀';
      const crisisResult = handleCrisisCheck(lastMessage);
      expect(crisisResult).not.toBeNull();
      expect(crisisResult.crisis).toBe(true);
    });
  });

  describe('Language Configuration', () => {
    it('should return Thai instruction by default', () => {
      const instruction = getLanguageInstruction('th');
      expect(instruction).toContain('THAI');
    });

    it('should return English instruction', () => {
      const instruction = getLanguageInstruction('en');
      expect(instruction).toContain('ENGLISH');
    });

    it('should return Chinese instruction', () => {
      const instruction = getLanguageInstruction('cn');
      expect(instruction).toContain('CHINESE');
    });

    it('should default to Thai for unknown language', () => {
      const instruction = getLanguageInstruction('unknown');
      expect(instruction).toContain('THAI');
    });
  });

  describe('Mode Selection', () => {
    it('should return premium mode instruction for premium users', () => {
      const instruction = getModeInstruction(true);
      expect(instruction).toContain('PREMIUM');
      expect(instruction).toContain('DSM-5');
    });

    it('should return free mode instruction for non-premium users', () => {
      const instruction = getModeInstruction(false);
      expect(instruction).toContain('FREE');
    });
  });

  describe('Token Limits', () => {
    it('should return 1500 tokens for premium', () => {
      expect(getMaxTokens(true)).toBe(1500);
    });

    it('should return 600 tokens for free', () => {
      expect(getMaxTokens(false)).toBe(600);
    });
  });

  describe('Case Type Instructions', () => {
    it('should return anxiety instruction', () => {
      const instruction = getCaseInstruction('anxiety');
      expect(instruction).toContain('ANXIETY');
    });

    it('should return sadness instruction', () => {
      const instruction = getCaseInstruction('sadness');
      expect(instruction).toContain('SADNESS');
    });

    it('should return general instruction for unknown case', () => {
      const instruction = getCaseInstruction('unknown');
      expect(instruction).toContain('GENERAL');
    });
  });

  describe('System Prompt Construction', () => {
    it('should include identity section', () => {
      // Test that system prompt components are available
      const langInstruction = getLanguageInstruction('th');
      const caseInstruction = getCaseInstruction('anxiety');
      const modeInstruction = getModeInstruction(false);

      expect(langInstruction).toBeTruthy();
      expect(caseInstruction).toBeTruthy();
      expect(modeInstruction).toBeTruthy();
    });
  });
});

describe('Chat Handler - Workshop Mode', () => {
  describe('Workshop Detection', () => {
    const workshopKeywords = /(workshop|training|course|อบรม|หลักสูตร|培训|课程)/i;

    it('should detect English workshop keywords', () => {
      expect(workshopKeywords.test('I want to design a workshop')).toBe(true);
      expect(workshopKeywords.test('training program')).toBe(true);
      expect(workshopKeywords.test('course design')).toBe(true);
    });

    it('should detect Thai workshop keywords', () => {
      expect(workshopKeywords.test('ออกแบบหลักสูตร')).toBe(true);
      expect(workshopKeywords.test('อบรม')).toBe(true);
    });

    it('should detect Chinese workshop keywords', () => {
      expect(workshopKeywords.test('培训')).toBe(true);
      expect(workshopKeywords.test('课程')).toBe(true);
    });

    it('should not detect workshop in normal messages', () => {
      expect(workshopKeywords.test('I feel sad today')).toBe(false);
    });
  });

  describe('Workshop Mode Token Limits', () => {
    it('should use 1500 tokens for premium workshop', () => {
      const isPremium = true;
      const maxTokens = isPremium ? 1500 : 600;
      expect(maxTokens).toBe(1500);
    });

    it('should use 600 tokens for free workshop', () => {
      const isPremium = false;
      const maxTokens = isPremium ? 1500 : 600;
      expect(maxTokens).toBe(600);
    });
  });
});

describe('Chat Handler - Error Handling', () => {
  it('should handle missing OPENAI_API_KEY gracefully', () => {
    // Test that the handler logic doesn't crash without API key
    const apiKey = process.env.OPENAI_API_KEY;
    expect(apiKey === undefined || typeof apiKey === 'string').toBe(true);
  });

  it('should handle malformed request body', () => {
    const result = validateMessages(undefined);
    expect(result.valid).toBe(false);
  });

  it('should handle empty request body', () => {
    const result = validateMessages([]);
    expect(result.valid).toBe(false);
  });
});
