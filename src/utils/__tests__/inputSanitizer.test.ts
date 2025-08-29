import { describe, it, expect } from 'vitest';
import { sanitizeInput, sanitizeHtml, sanitizeFileName, validateInput } from '../inputSanitizer';

describe('Input Sanitizer', () => {
  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello World');
    });

    it('should remove dangerous attributes', () => {
      const input = '<div onclick="alert(\'xss\')">Hello</div>';
      const result = sanitizeInput(input);
      expect(result).toBe('<div>Hello</div>');
    });

    it('should preserve safe HTML', () => {
      const input = '<p><strong>Bold text</strong> and <em>italic text</em></p>';
      const result = sanitizeInput(input);
      expect(result).toBe('<p><strong>Bold text</strong> and <em>italic text</em></p>');
    });

    it('should handle empty input', () => {
      const result = sanitizeInput('');
      expect(result).toBe('');
    });

    it('should handle null input', () => {
      const result = sanitizeInput(null as any);
      expect(result).toBe('');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHtml(input);
      expect(result).toBe('Hello World');
    });

    it('should decode HTML entities', () => {
      const input = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
      const result = sanitizeHtml(input);
      expect(result).toBe('<script>alert("xss")</script>');
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove dangerous characters', () => {
      const input = '../../../etc/passwd';
      const result = sanitizeFileName(input);
      expect(result).toBe('etcpasswd');
    });

    it('should preserve safe characters', () => {
      const input = 'my-file_name.txt';
      const result = sanitizeFileName(input);
      expect(result).toBe('my-file_name.txt');
    });

    it('should handle spaces', () => {
      const input = 'my file name.txt';
      const result = sanitizeFileName(input);
      expect(result).toBe('my_file_name.txt');
    });
  });

  describe('validateInput', () => {
    it('should return true for safe input', () => {
      const input = 'Hello World';
      const result = validateInput(input);
      expect(result).toBe(true);
    });

    it('should return false for dangerous input', () => {
      const input = '<script>alert("xss")</script>';
      const result = validateInput(input);
      expect(result).toBe(false);
    });

    it('should return false for SQL injection attempts', () => {
      const input = "'; DROP TABLE users; --";
      const result = validateInput(input);
      expect(result).toBe(false);
    });
  });
});