/**
 * Language Configuration Tests
 */

import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  languageInstructions,
  getLanguageInstruction,
  isValidLanguage,
  normalizeLanguage,
  detectLanguage,
  detectCaseType,
} from '../utils/language.js';

describe('Language Configuration Module', () => {
  describe('Constants', () => {
    it('should support Thai, English, and Chinese', () => {
      expect(SUPPORTED_LANGUAGES).toContain('th');
      expect(SUPPORTED_LANGUAGES).toContain('en');
      expect(SUPPORTED_LANGUAGES).toContain('cn');
    });

    it('should have Thai as default language', () => {
      expect(DEFAULT_LANGUAGE).toBe('th');
    });

    it('should have instructions for all supported languages', () => {
      SUPPORTED_LANGUAGES.forEach(lang => {
        expect(languageInstructions[lang]).toBeDefined();
        expect(typeof languageInstructions[lang]).toBe('string');
      });
    });
  });

  describe('getLanguageInstruction()', () => {
    it('should return Thai instruction for "th"', () => {
      const instruction = getLanguageInstruction('th');
      expect(instruction).toContain('Thai');
      expect(instruction).toContain('MindBot');
    });

    it('should return English instruction for "en"', () => {
      const instruction = getLanguageInstruction('en');
      expect(instruction).toContain('English');
      expect(instruction).toContain('Professional');
    });

    it('should return Chinese instruction for "cn"', () => {
      const instruction = getLanguageInstruction('cn');
      expect(instruction).toContain('Chinese');
    });

    it('should be case insensitive', () => {
      expect(getLanguageInstruction('TH')).toBe(getLanguageInstruction('th'));
      expect(getLanguageInstruction('EN')).toBe(getLanguageInstruction('en'));
      expect(getLanguageInstruction('CN')).toBe(getLanguageInstruction('cn'));
    });

    it('should return Thai instruction for invalid language', () => {
      expect(getLanguageInstruction('invalid')).toBe(languageInstructions.th);
    });

    it('should return Thai instruction for null', () => {
      expect(getLanguageInstruction(null)).toBe(languageInstructions.th);
    });

    it('should return Thai instruction for undefined', () => {
      expect(getLanguageInstruction(undefined)).toBe(languageInstructions.th);
    });

    it('should return Thai instruction for empty string', () => {
      expect(getLanguageInstruction('')).toBe(languageInstructions.th);
    });
  });

  describe('isValidLanguage()', () => {
    it('should return true for supported languages', () => {
      expect(isValidLanguage('th')).toBe(true);
      expect(isValidLanguage('en')).toBe(true);
      expect(isValidLanguage('cn')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isValidLanguage('TH')).toBe(true);
      expect(isValidLanguage('EN')).toBe(true);
      expect(isValidLanguage('CN')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isValidLanguage('jp')).toBe(false);
      expect(isValidLanguage('kr')).toBe(false);
      expect(isValidLanguage('fr')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidLanguage(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidLanguage(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidLanguage('')).toBe(false);
    });
  });

  describe('normalizeLanguage()', () => {
    it('should return the same language for valid lowercase input', () => {
      expect(normalizeLanguage('th')).toBe('th');
      expect(normalizeLanguage('en')).toBe('en');
      expect(normalizeLanguage('cn')).toBe('cn');
    });

    it('should normalize uppercase to lowercase', () => {
      expect(normalizeLanguage('TH')).toBe('th');
      expect(normalizeLanguage('EN')).toBe('en');
      expect(normalizeLanguage('CN')).toBe('cn');
    });

    it('should return default language for invalid input', () => {
      expect(normalizeLanguage('invalid')).toBe(DEFAULT_LANGUAGE);
    });

    it('should return default language for null', () => {
      expect(normalizeLanguage(null)).toBe(DEFAULT_LANGUAGE);
    });

    it('should return default language for undefined', () => {
      expect(normalizeLanguage(undefined)).toBe(DEFAULT_LANGUAGE);
    });

    it('should return default language for empty string', () => {
      expect(normalizeLanguage('')).toBe(DEFAULT_LANGUAGE);
    });
  });

  describe('detectLanguage()', () => {
    it('should detect Thai from Thai characters', () => {
      expect(detectLanguage('สวัสดีครับ')).toBe('th');
      expect(detectLanguage('รู้สึกเครียด')).toBe('th');
    });

    it('should detect Chinese from Chinese characters', () => {
      expect(detectLanguage('你好')).toBe('cn');
      expect(detectLanguage('我感到难过')).toBe('cn');
    });

    it('should detect English from Latin characters', () => {
      expect(detectLanguage('Hello')).toBe('en');
      expect(detectLanguage('I feel sad')).toBe('en');
    });

    it('should prioritize Chinese over Thai', () => {
      expect(detectLanguage('你好 สวัสดี')).toBe('cn');
    });

    it('should return default for null', () => {
      expect(detectLanguage(null)).toBe(DEFAULT_LANGUAGE);
    });

    it('should return default for undefined', () => {
      expect(detectLanguage(undefined)).toBe(DEFAULT_LANGUAGE);
    });

    it('should return default for non-string', () => {
      expect(detectLanguage(123)).toBe(DEFAULT_LANGUAGE);
    });
  });

  describe('detectCaseType()', () => {
    it('should detect stress in Thai', () => {
      expect(detectCaseType('รู้สึกเครียดมาก')).toBe('stress');
    });

    it('should detect stress in English', () => {
      expect(detectCaseType('I am so stressed')).toBe('stress');
    });

    it('should detect sadness', () => {
      expect(detectCaseType('รู้สึกเศร้า')).toBe('sadness');
      expect(detectCaseType('I feel sad')).toBe('sadness');
    });

    it('should detect anxiety', () => {
      expect(detectCaseType('กังวลมาก')).toBe('anxiety');
      expect(detectCaseType('I feel anxious')).toBe('anxiety');
    });

    it('should detect anger', () => {
      expect(detectCaseType('โกรธมาก')).toBe('anger');
      expect(detectCaseType('I am angry')).toBe('anger');
    });

    it('should detect loneliness', () => {
      expect(detectCaseType('รู้สึกเหงา')).toBe('loneliness');
      expect(detectCaseType('I feel lonely')).toBe('loneliness');
    });

    it('should detect burnout', () => {
      expect(detectCaseType('หมดไฟ')).toBe('burnout');
      expect(detectCaseType('I have burnout')).toBe('burnout');
    });

    it('should return general for unrecognized', () => {
      expect(detectCaseType('Hello world')).toBe('general');
    });

    it('should return general for null', () => {
      expect(detectCaseType(null)).toBe('general');
    });

    it('should return general for non-string', () => {
      expect(detectCaseType(123)).toBe('general');
    });
  });
});
