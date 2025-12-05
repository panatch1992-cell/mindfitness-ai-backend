/**
 * Configuration Utility Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ALLOWED_ORIGINS,
  getAnthropicKey,
  getClaudeModel,
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
      expect(ALLOWED_ORIGINS).toContain('https://mindfitness.com');
      expect(ALLOWED_ORIGINS).toContain('https://www.mindfitness.com');
    });
  });

  describe('getAnthropicKey()', () => {
    it('should return invalid when key is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const result = getAnthropicKey();
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should return invalid for wrong format', () => {
      process.env.ANTHROPIC_API_KEY = 'wrong-format-key';
      const result = getAnthropicKey();
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should return valid for correct key format', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-12345';
      const result = getAnthropicKey();
      expect(result.valid).toBe(true);
      expect(result.key).toBe('sk-ant-test-key-12345');
    });
  });

  describe('getClaudeModel()', () => {
    it('should return default model when env not set', () => {
      delete process.env.CLAUDE_MODEL;
      const model = getClaudeModel();
      expect(model).toBe('claude-sonnet-4-20250514');
    });

    it('should return env model when set', () => {
      process.env.CLAUDE_MODEL = 'claude-3-haiku-20240307';
      const model = getClaudeModel();
      expect(model).toBe('claude-3-haiku-20240307');
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
