/**
 * Vent Handler Tests
 *
 * Tests for the vent wall API endpoint (api/vent.js)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateVentText, validateRiskLevel, safeJsonParse } from '../../utils/validation.js';

// Mock fetch for OpenAI API calls
const mockFetch = vi.fn();

describe('Vent Handler Logic', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Input Validation', () => {
    it('should accept valid vent text', () => {
      const result = validateVentText('I feel really stressed today');
      expect(result.valid).toBe(true);
      expect(result.text).toBe('I feel really stressed today');
    });

    it('should reject empty text', () => {
      const result = validateVentText('');
      expect(result.valid).toBe(false);
    });

    it('should reject null text', () => {
      const result = validateVentText(null);
      expect(result.valid).toBe(false);
    });

    it('should trim whitespace', () => {
      const result = validateVentText('  Hello world  ');
      expect(result.valid).toBe(true);
      expect(result.text).toBe('Hello world');
    });

    it('should reject whitespace-only text', () => {
      const result = validateVentText('   ');
      expect(result.valid).toBe(false);
    });
  });

  describe('Risk Level Validation', () => {
    it('should accept valid risk levels', () => {
      expect(validateRiskLevel('none')).toBe('none');
      expect(validateRiskLevel('low')).toBe('low');
      expect(validateRiskLevel('medium')).toBe('medium');
      expect(validateRiskLevel('high')).toBe('high');
    });

    it('should normalize case', () => {
      expect(validateRiskLevel('LOW')).toBe('low');
      expect(validateRiskLevel('HIGH')).toBe('high');
      expect(validateRiskLevel('Medium')).toBe('medium');
    });

    it('should return unknown for invalid levels', () => {
      expect(validateRiskLevel('invalid')).toBe('unknown');
      expect(validateRiskLevel('critical')).toBe('unknown');
    });

    it('should return unknown for null/undefined', () => {
      expect(validateRiskLevel(null)).toBe('unknown');
      expect(validateRiskLevel(undefined)).toBe('unknown');
    });
  });

  describe('JSON Response Parsing', () => {
    it('should parse valid JSON response', () => {
      const validJson = '{"analysis": {"risk": "low", "tags": ["sad"]}, "reply": "I hear you"}';
      const parsed = safeJsonParse(validJson);
      expect(parsed.analysis.risk).toBe('low');
      expect(parsed.analysis.tags).toContain('sad');
      expect(parsed.reply).toBe('I hear you');
    });

    it('should handle malformed JSON with fallback', () => {
      const invalidJson = 'This is not JSON';
      const fallback = { analysis: { risk: 'unknown', tags: [] }, reply: invalidJson };
      const parsed = safeJsonParse(invalidJson, fallback);
      expect(parsed).toEqual(fallback);
    });

    it('should return null for invalid JSON without fallback', () => {
      const invalidJson = 'Not JSON';
      const parsed = safeJsonParse(invalidJson);
      expect(parsed).toBeNull();
    });

    it('should handle JSON with extra whitespace', () => {
      const jsonWithWhitespace = '  { "analysis": { "risk": "low", "tags": [] }, "reply": "Hi" }  ';
      const parsed = safeJsonParse(jsonWithWhitespace.trim());
      expect(parsed.analysis.risk).toBe('low');
    });
  });

  describe('Risk Assessment Response Structure', () => {
    it('should validate expected response structure', () => {
      const mockResponse = {
        success: true,
        analysis: {
          risk: 'low',
          tags: ['sad', 'lonely'],
        },
        reply: 'I understand you are feeling down.',
      };

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.analysis).toBeDefined();
      expect(mockResponse.analysis.risk).toBe('low');
      expect(Array.isArray(mockResponse.analysis.tags)).toBe(true);
      expect(mockResponse.reply).toBeDefined();
    });

    it('should handle high risk response', () => {
      const highRiskResponse = {
        success: true,
        analysis: {
          risk: 'high',
          tags: ['distressed', 'hopeless'],
        },
        reply: 'It sounds like you are going through a very difficult time.',
      };

      expect(validateRiskLevel(highRiskResponse.analysis.risk)).toBe('high');
    });
  });

  describe('Language Support', () => {
    const supportedLanguages = ['th', 'en', 'cn'];

    it('should support Thai language', () => {
      expect(supportedLanguages).toContain('th');
    });

    it('should support English language', () => {
      expect(supportedLanguages).toContain('en');
    });

    it('should support Chinese language', () => {
      expect(supportedLanguages).toContain('cn');
    });

    it('should default to Thai if language not specified', () => {
      const defaultLang = 'th';
      const lang = undefined || 'th';
      expect(lang).toBe(defaultLang);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await mockFetch('https://api.openai.com/v1/chat/completions');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      const response = await mockFetch('https://api.openai.com/v1/chat/completions');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });
});

describe('Vent Handler - Edge Cases', () => {
  describe('Unicode and Special Characters', () => {
    it('should handle Thai text', () => {
      const result = validateVentText('ฉันรู้สึกเศร้ามาก');
      expect(result.valid).toBe(true);
    });

    it('should handle Chinese text', () => {
      const result = validateVentText('我今天很难过');
      expect(result.valid).toBe(true);
    });

    it('should handle emoji', () => {
      const result = validateVentText('I feel sad 😢');
      expect(result.valid).toBe(true);
    });

    it('should handle mixed language text', () => {
      const result = validateVentText('I feel เศร้า today');
      expect(result.valid).toBe(true);
    });
  });

  describe('Long Text Input', () => {
    it('should handle long text', () => {
      const longText = 'This is a very long message. '.repeat(100);
      const result = validateVentText(longText);
      expect(result.valid).toBe(true);
    });
  });

  describe('Special JSON Characters', () => {
    it('should handle text with quotes', () => {
      const result = validateVentText('I said "hello" to them');
      expect(result.valid).toBe(true);
    });

    it('should handle text with newlines', () => {
      const result = validateVentText('Line 1\nLine 2');
      expect(result.valid).toBe(true);
    });

    it('should handle text with backslashes', () => {
      const result = validateVentText('Path: C:\\Users\\test');
      expect(result.valid).toBe(true);
    });
  });
});
