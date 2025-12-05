/**
 * Configuration Utility Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ALLOWED_ORIGINS,
  getOpenAIKey,
  getOpenAIModel,
  isAllowedOrigin,
  getCORSOrigin,
  getLINEConfig,
  validateLINEConfig,
} from '../utils/config.js';

describe('Config Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('ALLOWED_ORIGINS', () => {
    it('should be an array', () => {
      expect(Array.isArray(ALLOWED_ORIGINS)).toBe(true);
    });

    it('should include main domain', () => {
      expect(ALLOWED_ORIGINS).toContain('https://mindfitness.co');
    });
  });

  describe('getOpenAIKey()', () => {
    it('should return invalid when key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      const result = getOpenAIKey();
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should return invalid for wrong format', () => {
      process.env.OPENAI_API_KEY = 'wrong-format-key';
      const result = getOpenAIKey();
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should return valid for correct key format', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key-12345';
      const result = getOpenAIKey();
      expect(result.valid).toBe(true);
      expect(result.key).toBe('sk-test-key-12345');
    });
  });

  describe('getOpenAIModel()', () => {
    it('should return default model when env not set', () => {
      delete process.env.OPENAI_MODEL;
      const model = getOpenAIModel();
      expect(model).toBe('gpt-4o-mini');
    });

    it('should return env model when set', () => {
      process.env.OPENAI_MODEL = 'gpt-4';
      const model = getOpenAIModel();
      expect(model).toBe('gpt-4');
    });
  });

  describe('isAllowedOrigin()', () => {
    it('should return false for null origin', () => {
      expect(isAllowedOrigin(null)).toBe(false);
    });

    it('should return false for undefined origin', () => {
      expect(isAllowedOrigin(undefined)).toBe(false);
    });

    it('should return true for allowed origin', () => {
      expect(isAllowedOrigin('https://mindfitness.co')).toBe(true);
    });

    it('should return false for unknown origin', () => {
      expect(isAllowedOrigin('https://malicious-site.com')).toBe(false);
    });
  });

  describe('getCORSOrigin()', () => {
    it('should return origin if allowed', () => {
      const result = getCORSOrigin('https://mindfitness.co');
      expect(result).toBe('https://mindfitness.co');
    });

    it('should return empty string for disallowed origin in production', () => {
      process.env.NODE_ENV = 'production';
      const result = getCORSOrigin('https://malicious-site.com');
      expect(result).toBe('');
    });
  });

  describe('getLINEConfig()', () => {
    it('should return config from env', () => {
      process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token';
      process.env.LINE_CHANNEL_SECRET = 'test-secret';
      const config = getLINEConfig();
      expect(config.channelAccessToken).toBe('test-token');
      expect(config.channelSecret).toBe('test-secret');
    });
  });

  describe('validateLINEConfig()', () => {
    it('should return invalid when token missing', () => {
      delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
      process.env.LINE_CHANNEL_SECRET = 'test-secret';
      const result = validateLINEConfig();
      expect(result.valid).toBe(false);
    });

    it('should return invalid when secret missing', () => {
      process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token';
      delete process.env.LINE_CHANNEL_SECRET;
      const result = validateLINEConfig();
      expect(result.valid).toBe(false);
    });

    it('should return valid when both present', () => {
      process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token';
      process.env.LINE_CHANNEL_SECRET = 'test-secret';
      const result = validateLINEConfig();
      expect(result.valid).toBe(true);
    });
  });
});
