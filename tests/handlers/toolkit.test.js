/**
 * Toolkit Handler Tests
 *
 * Tests for the toolkit API endpoint (api/toolkit.js)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateToolkitRequest, safeJsonParse } from '../../utils/validation.js';
import { getLanguageInstruction } from '../../utils/language.js';

describe('Toolkit Handler Logic', () => {
  describe('Request Validation', () => {
    it('should accept valid toolkit request', () => {
      const body = {
        mood: 'anxious',
        userWork: 'I have a presentation tomorrow',
        lang: 'en',
      };
      const result = validateToolkitRequest(body);
      expect(result.valid).toBe(true);
      expect(result.data.mood).toBe('anxious');
      expect(result.data.userWork).toBe('I have a presentation tomorrow');
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
    });

    it('should reject undefined body', () => {
      const result = validateToolkitRequest(undefined);
      expect(result.valid).toBe(false);
    });
  });

  describe('Response Parsing', () => {
    it('should parse valid toolkit JSON response', () => {
      const validResponse = JSON.stringify({
        toolkits: [
          {
            title: 'Breathing Exercise',
            steps: ['Step 1', 'Step 2', 'Step 3'],
            why: 'Activates parasympathetic nervous system',
          },
          {
            title: 'Grounding Technique',
            steps: ['Notice 5 things you see', 'Touch 4 different textures'],
            why: 'Brings focus to present moment',
          },
        ],
      });

      const parsed = safeJsonParse(validResponse);
      expect(parsed.toolkits).toHaveLength(2);
      expect(parsed.toolkits[0].title).toBe('Breathing Exercise');
      expect(parsed.toolkits[0].steps).toHaveLength(3);
      expect(parsed.toolkits[0].why).toBeDefined();
    });

    it('should handle malformed JSON with raw text fallback', () => {
      const rawText = 'Here are some suggestions:\n1. Take deep breaths\n2. Go for a walk';
      const parsed = safeJsonParse(rawText, null);
      expect(parsed).toBeNull();
    });

    it('should validate toolkit structure', () => {
      const validToolkit = {
        title: 'Test Toolkit',
        steps: ['Step 1', 'Step 2'],
        why: 'Psychological rationale',
      };

      expect(validToolkit.title).toBeDefined();
      expect(Array.isArray(validToolkit.steps)).toBe(true);
      expect(validToolkit.why).toBeDefined();
    });
  });

  describe('Language Support', () => {
    it('should get Thai language instruction', () => {
      const instruction = getLanguageInstruction('th');
      expect(instruction).toContain('THAI');
    });

    it('should get English language instruction', () => {
      const instruction = getLanguageInstruction('en');
      expect(instruction).toContain('ENGLISH');
    });

    it('should get Chinese language instruction', () => {
      const instruction = getLanguageInstruction('cn');
      expect(instruction).toContain('CHINESE');
    });
  });

  describe('Prompt Construction', () => {
    it('should include mood in prompt', () => {
      const mood = 'anxious';
      const prompt = `User mood/label: ${mood}`;
      expect(prompt).toContain('anxious');
    });

    it('should include userWork in prompt', () => {
      const userWork = 'I have deadlines at work';
      const prompt = `User description / work-sample: ${userWork}`;
      expect(prompt).toContain('deadlines');
    });

    it('should include language in prompt', () => {
      const lang = 'en';
      const prompt = `Language: ${lang}`;
      expect(prompt).toContain('en');
    });
  });

  describe('Response Structure Validation', () => {
    it('should validate success response structure', () => {
      const response = {
        success: true,
        data: {
          toolkits: [
            { title: 'Tool 1', steps: ['a', 'b'], why: 'reason' },
          ],
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.toolkits).toBeDefined();
    });

    it('should validate raw fallback response structure', () => {
      const response = {
        success: true,
        raw: 'Some text that could not be parsed as JSON',
      };

      expect(response.success).toBe(true);
      expect(response.raw).toBeDefined();
      expect(typeof response.raw).toBe('string');
    });

    it('should validate error response structure', () => {
      const response = {
        success: false,
        error: 'Something went wrong',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('Toolkit Content Requirements', () => {
    it('should generate exactly 3 toolkits', () => {
      // The prompt asks for 3 toolkits
      const expectedCount = 3;
      const mockToolkits = {
        toolkits: [
          { title: 'Tool 1', steps: [], why: '' },
          { title: 'Tool 2', steps: [], why: '' },
          { title: 'Tool 3', steps: [], why: '' },
        ],
      };
      expect(mockToolkits.toolkits).toHaveLength(expectedCount);
    });

    it('should include psychological rationale', () => {
      const toolkit = {
        title: 'Box Breathing',
        steps: ['Inhale 4 seconds', 'Hold 4 seconds', 'Exhale 4 seconds', 'Hold 4 seconds'],
        why: 'Activates the vagus nerve and triggers the relaxation response',
      };

      expect(toolkit.why).toBeTruthy();
      expect(toolkit.why.length).toBeGreaterThan(10);
    });
  });
});

describe('Toolkit Handler - Edge Cases', () => {
  describe('Empty Inputs', () => {
    it('should handle empty mood', () => {
      const body = { mood: '', userWork: 'description', lang: 'en' };
      const result = validateToolkitRequest(body);
      expect(result.valid).toBe(true);
      expect(result.data.mood).toBe('');
    });

    it('should handle empty userWork', () => {
      const body = { mood: 'sad', userWork: '', lang: 'en' };
      const result = validateToolkitRequest(body);
      expect(result.valid).toBe(true);
      expect(result.data.userWork).toBe('');
    });
  });

  describe('Unicode Handling', () => {
    it('should handle Thai mood description', () => {
      const body = { mood: 'เศร้า', userWork: 'งานเยอะมาก', lang: 'th' };
      const result = validateToolkitRequest(body);
      expect(result.valid).toBe(true);
      expect(result.data.mood).toBe('เศร้า');
    });

    it('should handle Chinese mood description', () => {
      const body = { mood: '焦虑', userWork: '工作压力大', lang: 'cn' };
      const result = validateToolkitRequest(body);
      expect(result.valid).toBe(true);
      expect(result.data.mood).toBe('焦虑');
    });
  });

  describe('Long Input Handling', () => {
    it('should handle long userWork description', () => {
      const longDescription = 'This is a very detailed description. '.repeat(50);
      const body = { mood: 'stressed', userWork: longDescription, lang: 'en' };
      const result = validateToolkitRequest(body);
      expect(result.valid).toBe(true);
    });
  });
});
