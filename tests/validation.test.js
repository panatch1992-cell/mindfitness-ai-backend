/**
 * Input Validation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  VALID_RISK_LEVELS,
  validateMessages,
  validateVentText,
  validateToolkitRequest,
  validateRiskLevel,
  safeJsonParse,
} from '../utils/validation.js';

describe('Validation Module', () => {
  describe('VALID_RISK_LEVELS', () => {
    it('should contain expected risk levels', () => {
      expect(VALID_RISK_LEVELS).toContain('none');
      expect(VALID_RISK_LEVELS).toContain('low');
      expect(VALID_RISK_LEVELS).toContain('medium');
      expect(VALID_RISK_LEVELS).toContain('high');
      expect(VALID_RISK_LEVELS).toContain('unknown');
    });
  });

  describe('validateMessages()', () => {
    it('should accept valid messages array', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];
      const result = validateMessages(messages);
      expect(result.valid).toBe(true);
    });

    it('should accept message with empty string content', () => {
      const messages = [{ role: 'user', content: '' }];
      const result = validateMessages(messages);
      expect(result.valid).toBe(true);
    });

    it('should reject non-array input', () => {
      const result = validateMessages('not an array');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be an array');
    });

    it('should reject null input', () => {
      const result = validateMessages(null);
      expect(result.valid).toBe(false);
    });

    it('should reject empty array', () => {
      const result = validateMessages([]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject message without role', () => {
      const messages = [{ content: 'Hello' }];
      const result = validateMessages(messages);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid role');
    });

    it('should reject message without content', () => {
      const messages = [{ role: 'user' }];
      const result = validateMessages(messages);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must have content');
    });

    it('should reject non-object message', () => {
      const messages = ['invalid'];
      const result = validateMessages(messages);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be an object');
    });

    it('should reject null message in array', () => {
      const messages = [null];
      const result = validateMessages(messages);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateVentText()', () => {
    it('should accept valid text', () => {
      const result = validateVentText('I feel sad today');
      expect(result.valid).toBe(true);
      expect(result.text).toBe('I feel sad today');
    });

    it('should trim whitespace', () => {
      const result = validateVentText('  Hello  ');
      expect(result.valid).toBe(true);
      expect(result.text).toBe('Hello');
    });

    it('should reject null', () => {
      const result = validateVentText(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject undefined', () => {
      const result = validateVentText(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject non-string', () => {
      const result = validateVentText(123);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string');
    });

    it('should reject empty string', () => {
      const result = validateVentText('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject whitespace-only string', () => {
      const result = validateVentText('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });
  });

  describe('validateToolkitRequest()', () => {
    it('should accept valid request body', () => {
      const body = { mood: 'anxious', userWork: 'description', lang: 'en' };
      const result = validateToolkitRequest(body);
      expect(result.valid).toBe(true);
      expect(result.data.mood).toBe('anxious');
      expect(result.data.userWork).toBe('description');
      expect(result.data.lang).toBe('en');
    });

    it('should provide defaults for missing fields', () => {
      const body = {};
      const result = validateToolkitRequest(body);
      expect(result.valid).toBe(true);
      expect(result.data.mood).toBe('');
      expect(result.data.userWork).toBe('');
      expect(result.data.lang).toBe('th');
    });

    it('should reject null body', () => {
      const result = validateToolkitRequest(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject undefined body', () => {
      const result = validateToolkitRequest(undefined);
      expect(result.valid).toBe(false);
    });

    it('should reject non-object body', () => {
      const result = validateToolkitRequest('string');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateRiskLevel()', () => {
    it('should accept valid risk levels', () => {
      expect(validateRiskLevel('none')).toBe('none');
      expect(validateRiskLevel('low')).toBe('low');
      expect(validateRiskLevel('medium')).toBe('medium');
      expect(validateRiskLevel('high')).toBe('high');
    });

    it('should normalize to lowercase', () => {
      expect(validateRiskLevel('LOW')).toBe('low');
      expect(validateRiskLevel('HIGH')).toBe('high');
    });

    it('should return unknown for invalid risk level', () => {
      expect(validateRiskLevel('invalid')).toBe('unknown');
    });

    it('should return unknown for null', () => {
      expect(validateRiskLevel(null)).toBe('unknown');
    });

    it('should return unknown for undefined', () => {
      expect(validateRiskLevel(undefined)).toBe('unknown');
    });

    it('should return unknown for non-string', () => {
      expect(validateRiskLevel(123)).toBe('unknown');
    });
  });

  describe('safeJsonParse()', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"name": "test"}');
      expect(result).toEqual({ name: 'test' });
    });

    it('should parse JSON arrays', () => {
      const result = safeJsonParse('[1, 2, 3]');
      expect(result).toEqual([1, 2, 3]);
    });

    it('should return fallback for invalid JSON', () => {
      const result = safeJsonParse('not json', { default: true });
      expect(result).toEqual({ default: true });
    });

    it('should return null as default fallback', () => {
      const result = safeJsonParse('not json');
      expect(result).toBeNull();
    });

    it('should handle empty string', () => {
      const result = safeJsonParse('', 'fallback');
      expect(result).toBe('fallback');
    });

    it('should handle null input', () => {
      // JSON.parse(null) returns null (doesn't throw)
      const result = safeJsonParse(null, 'fallback');
      expect(result).toBeNull();
    });
  });
});
