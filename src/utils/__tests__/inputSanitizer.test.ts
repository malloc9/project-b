import { describe, it, expect } from 'vitest';
import { sanitizeInput, sanitizeHtml, sanitizeFilename, escapeHtml, unescapeHtml } from '../inputSanitizer';

describe('Input Sanitizer', () => {
  describe('sanitizeInput', () => {
    it('should escape HTML by default', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = sanitizeInput(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;Hello World');
    });

    it('should escape dangerous attributes', () => {
      const input = '<div onclick="alert(\'xss\')">Hello</div>';
      const result = sanitizeInput(input);
      expect(result).toBe('&lt;div onclick=&quot;alert(&#x27;xss&#x27;)&quot;&gt;Hello&lt;&#x2F;div&gt;');
    });

    it('should allow HTML when allowHtml is true', () => {
      const input = '<p><strong>Bold text</strong> and <em>italic text</em></p>';
      const result = sanitizeInput(input, { allowHtml: true });
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

    it('should trim whitespace by default', () => {
      const input = '  Hello World  ';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello World');
    });

    it('should enforce max length', () => {
      const input = 'Hello World';
      const result = sanitizeInput(input, { maxLength: 5 });
      expect(result).toBe('Hello');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags when removeScripts is true', () => {
      const input = '<p>Hello <script>alert("xss")</script> World</p>';
      const result = sanitizeHtml(input, [], true);
      expect(result).toBe('<p>Hello  World</p>');
    });

    it('should remove dangerous attributes', () => {
      const input = '<div onclick="alert(\'xss\')">Hello</div>';
      const result = sanitizeHtml(input, [], true);
      expect(result).toBe('<div>Hello</div>');
    });

    it('should preserve allowed tags only', () => {
      const input = '<p>Hello <strong>World</strong> <script>alert("xss")</script></p>';
      const result = sanitizeHtml(input, ['p'], true);
      expect(result).toBe('<p>Hello World </p>');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      const input = '../../../etc/passwd';
      const result = sanitizeFilename(input);
      expect(result).toBe('etcpasswd');
    });

    it('should preserve safe characters', () => {
      const input = 'my-file_name.txt';
      const result = sanitizeFilename(input);
      expect(result).toBe('my-file_name.txt');
    });

    it('should remove spaces and dots from edges', () => {
      const input = '  my file name.txt  ';
      const result = sanitizeFilename(input);
      expect(result).toBe('my file name.txt');
    });

    it('should remove reserved characters', () => {
      const input = 'file<name>with:bad|chars?.txt';
      const result = sanitizeFilename(input);
      expect(result).toBe('filenamewithbadchars.txt');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = escapeHtml(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });
  });

  describe('unescapeHtml', () => {
    it('should unescape HTML entities', () => {
      const input = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
      const result = unescapeHtml(input);
      expect(result).toBe('<script>alert("xss")</script>');
    });
  });
});
