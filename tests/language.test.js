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
});
