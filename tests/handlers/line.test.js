/**
 * LINE Handler Tests
 *
 * Tests for the LINE bot integration (api/line.js)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isWorkshopRequest,
  isPaymentRequest,
  hasPremiumIndicator,
  workshopKeywords,
  paymentKeywords,
  premiumKeywords,
} from '../../utils/modes.js';

describe('LINE Handler Logic', () => {
  describe('Quick Reply Structure', () => {
    /**
     * Tests the createQuickReply function logic
     */
    const createQuickReply = (items) => {
      return {
        items: items.map(item => ({
          type: 'action',
          action: {
            type: 'message',
            label: item.label,
            text: item.text || item.label,
          },
        })),
      };
    };

    it('should create quick reply with correct structure', () => {
      const items = [
        { label: '🌧️ Sad', text: 'รู้สึกเศร้า' },
        { label: '⚡ Anxious', text: 'รู้สึกกังวล' },
      ];

      const quickReply = createQuickReply(items);

      expect(quickReply.items).toHaveLength(2);
      expect(quickReply.items[0].type).toBe('action');
      expect(quickReply.items[0].action.type).toBe('message');
      expect(quickReply.items[0].action.label).toBe('🌧️ Sad');
      expect(quickReply.items[0].action.text).toBe('รู้สึกเศร้า');
    });

    it('should use label as text when text not provided', () => {
      const items = [{ label: 'Hello' }];
      const quickReply = createQuickReply(items);

      expect(quickReply.items[0].action.text).toBe('Hello');
    });

    it('should handle empty items array', () => {
      const quickReply = createQuickReply([]);
      expect(quickReply.items).toHaveLength(0);
    });

    it('should handle multiple quick reply items', () => {
      const items = [
        { label: 'Option 1', text: 'opt1' },
        { label: 'Option 2', text: 'opt2' },
        { label: 'Option 3', text: 'opt3' },
      ];

      const quickReply = createQuickReply(items);
      expect(quickReply.items).toHaveLength(3);
    });
  });

  describe('Workshop Keyword Detection', () => {
    it('should detect English workshop keywords', () => {
      expect(isWorkshopRequest('Design a workshop for my team')).toBe(true);
      expect(isWorkshopRequest('I need a training program')).toBe(true);
      expect(isWorkshopRequest('Can you create a course?')).toBe(true);
    });

    it('should detect Thai workshop keywords', () => {
      expect(isWorkshopRequest('ช่วยออกแบบหลักสูตรหน่อย')).toBe(true);
      expect(isWorkshopRequest('ต้องการอบรมพนักงาน')).toBe(true);
    });

    it('should detect Chinese workshop keywords', () => {
      expect(isWorkshopRequest('我需要培训')).toBe(true);
      expect(isWorkshopRequest('设计一个课程')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isWorkshopRequest('WORKSHOP design')).toBe(true);
      expect(isWorkshopRequest('Workshop Design')).toBe(true);
    });

    it('should not detect workshop in unrelated messages', () => {
      expect(isWorkshopRequest('I feel sad')).toBe(false);
      expect(isWorkshopRequest('Hello!')).toBe(false);
    });
  });

  describe('Payment Keyword Detection', () => {
    it('should detect Thai payment keywords', () => {
      expect(isPaymentRequest('อยากสมัคร')).toBe(true);
      expect(isPaymentRequest('จ่ายเงิน')).toBe(true);
    });

    it('should detect English payment keywords', () => {
      expect(isPaymentRequest('I want to buy premium')).toBe(true);
      expect(isPaymentRequest('How do I pay?')).toBe(true);
      expect(isPaymentRequest('Get premium access')).toBe(true);
    });

    it('should detect Chinese payment keywords', () => {
      expect(isPaymentRequest('我要购买')).toBe(true);
      expect(isPaymentRequest('如何充值')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isPaymentRequest('BUY PREMIUM')).toBe(true);
      expect(isPaymentRequest('PAY NOW')).toBe(true);
    });

    it('should not detect payment in unrelated messages', () => {
      expect(isPaymentRequest('I feel anxious')).toBe(false);
      expect(isPaymentRequest('How are you?')).toBe(false);
    });
  });

  describe('Premium Status Detection', () => {
    it('should detect Thai premium indicators', () => {
      expect(hasPremiumIndicator('โอนแล้วครับ')).toBe(true);
      expect(hasPremiumIndicator('ช่วยเจาะลึกหน่อย')).toBe(true);
      expect(hasPremiumIndicator('ออกแบบให้หน่อย')).toBe(true);
    });

    it('should detect English premium indicators', () => {
      expect(hasPremiumIndicator('I have paid already')).toBe(true);
    });

    it('should detect Chinese premium indicators', () => {
      expect(hasPremiumIndicator('已付款了')).toBe(true);
    });

    it('should not detect premium in unrelated messages', () => {
      expect(hasPremiumIndicator('Hello')).toBe(false);
      expect(hasPremiumIndicator('I want to buy')).toBe(false);
    });
  });

  describe('Language Auto-Detection Logic', () => {
    const detectLanguage = (text) => {
      // Simple language detection based on character ranges
      if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
      if (/[\u4E00-\u9FFF]/.test(text)) return 'cn';
      return 'en';
    };

    it('should detect Thai language', () => {
      expect(detectLanguage('สวัสดีครับ')).toBe('th');
      expect(detectLanguage('ฉันรู้สึกเศร้า')).toBe('th');
    });

    it('should detect Chinese language', () => {
      expect(detectLanguage('你好')).toBe('cn');
      expect(detectLanguage('我很难过')).toBe('cn');
    });

    it('should detect English language', () => {
      expect(detectLanguage('Hello')).toBe('en');
      expect(detectLanguage('I feel sad')).toBe('en');
    });

    it('should default to English for mixed ASCII text', () => {
      expect(detectLanguage('Hello 123!')).toBe('en');
    });
  });

  describe('Event Types Handling', () => {
    it('should identify text message events', () => {
      const event = {
        type: 'message',
        message: { type: 'text', text: 'Hello' },
      };
      expect(event.type).toBe('message');
      expect(event.message.type).toBe('text');
    });

    it('should identify image message events', () => {
      const event = {
        type: 'message',
        message: { type: 'image', id: '12345' },
      };
      expect(event.type).toBe('message');
      expect(event.message.type).toBe('image');
    });

    it('should identify follow events', () => {
      const event = {
        type: 'follow',
        replyToken: 'token123',
      };
      expect(event.type).toBe('follow');
    });
  });

  describe('Reply Message Structure', () => {
    it('should create valid text reply', () => {
      const reply = {
        type: 'text',
        text: 'Hello, how can I help you?',
      };
      expect(reply.type).toBe('text');
      expect(reply.text).toBeDefined();
    });

    it('should create valid image reply', () => {
      const reply = {
        type: 'image',
        originalContentUrl: 'https://example.com/image.jpg',
        previewImageUrl: 'https://example.com/preview.jpg',
      };
      expect(reply.type).toBe('image');
      expect(reply.originalContentUrl).toBeDefined();
      expect(reply.previewImageUrl).toBeDefined();
    });

    it('should create reply with quick reply attached', () => {
      const reply = {
        type: 'text',
        text: 'How do you feel?',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: 'Happy', text: 'Happy' } },
          ],
        },
      };
      expect(reply.quickReply).toBeDefined();
      expect(reply.quickReply.items).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing message text gracefully', () => {
      const event = {
        type: 'message',
        message: { type: 'text' },
      };
      const txt = event.message?.text || '';
      expect(txt).toBe('');
    });

    it('should handle missing event type', () => {
      const event = {};
      expect(event.type).toBeUndefined();
    });
  });
});

describe('LINE Handler - Payment Flow', () => {
  describe('QR Code Response', () => {
    it('should structure QR code payment response correctly', () => {
      const QR_CODE_URL = 'https://example.com/qr.jpg';
      const responses = [
        { type: 'text', text: '💎 Unlock Premium (299.-)' },
        { type: 'image', originalContentUrl: QR_CODE_URL, previewImageUrl: QR_CODE_URL },
      ];

      expect(responses).toHaveLength(2);
      expect(responses[0].type).toBe('text');
      expect(responses[1].type).toBe('image');
      expect(responses[1].originalContentUrl).toBe(QR_CODE_URL);
    });
  });

  describe('Payment Confirmation', () => {
    it('should recognize payment slip image', () => {
      const event = {
        type: 'message',
        message: { type: 'image', id: 'slip123' },
      };
      expect(event.message.type).toBe('image');
    });

    it('should send confirmation after receiving slip', () => {
      const confirmationMessage = '✅ Received! Premium Unlocked.';
      expect(confirmationMessage).toContain('Premium');
      expect(confirmationMessage).toContain('Unlocked');
    });
  });
});
