/**
 * Input sanitization utilities to prevent XSS attacks and ensure data integrity
 */

interface SanitizeOptions {
  allowHtml?: boolean;
  maxLength?: number;
  trimWhitespace?: boolean;
  allowedTags?: string[];
  removeScripts?: boolean;
}

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(
  input: string, 
  options: SanitizeOptions = {}
): string {
  const {
    allowHtml = false,
    maxLength,
    trimWhitespace = true,
    allowedTags = [],
    removeScripts = true
  } = options;

  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Trim whitespace if enabled
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }

  // Remove or escape HTML if not allowed
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized);
  } else {
    // If HTML is allowed, sanitize it
    sanitized = sanitizeHtml(sanitized, allowedTags, removeScripts);
  }

  // Enforce maximum length
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Escape HTML characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return text.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
}

/**
 * Unescape HTML characters
 */
export function unescapeHtml(text: string): string {
  const htmlUnescapes: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/'
  };

  return text.replace(/&(?:amp|lt|gt|quot|#x27|#x2F);/g, (match) => htmlUnescapes[match]);
}

/**
 * Sanitize HTML content by removing dangerous elements and attributes
 */
export function sanitizeHtml(
  html: string, 
  allowedTags: string[] = [], 
  removeScripts: boolean = true
): string {
  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Remove script tags and event handlers
  if (removeScripts) {
    // Remove script tags
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach(script => script.remove());

    // Remove elements with javascript: URLs
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(element => {
      // Remove dangerous attributes
      const dangerousAttrs = [
        'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
        'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur',
        'onchange', 'onsubmit', 'onreset', 'onselect', 'onresize',
        'onscroll', 'onunload', 'onbeforeunload'
      ];

      dangerousAttrs.forEach(attr => {
        if (element.hasAttribute(attr)) {
          element.removeAttribute(attr);
        }
      });

      // Check href and src attributes for javascript:
      ['href', 'src', 'action'].forEach(attr => {
        const value = element.getAttribute(attr);
        if (value && value.toLowerCase().startsWith('javascript:')) {
          element.removeAttribute(attr);
        }
      });
    });
  }

  // If allowedTags is specified, remove all other tags
  if (allowedTags.length > 0) {
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(element => {
      if (!allowedTags.includes(element.tagName.toLowerCase())) {
        // Replace with text content
        const textNode = document.createTextNode(element.textContent || '');
        element.parentNode?.replaceChild(textNode, element);
      }
    });
  }

  return tempDiv.innerHTML;
}

/**
 * Sanitize filename to prevent directory traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return '';
  }

  return filename
    // Remove directory traversal attempts
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    // Remove reserved characters
    .replace(/[<>:"|?*]/g, '')
    // Trim whitespace and dots
    .replace(/^[\s.]+|[\s.]+$/g, '')
    // Limit length
    .substring(0, 255);
}

/**
 * Sanitize URL to prevent malicious redirects
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();

  // Block javascript: and data: URLs
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return '';
  }

  // Allow relative URLs, http, and https
  if (/^(https?:\/\/|\/|\.\/|#)/i.test(trimmed)) {
    return trimmed;
  }

  // For other cases, prepend https://
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return '';
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  return email
    .trim()
    .toLowerCase()
    // Remove any HTML
    .replace(/<[^>]*>/g, '')
    // Basic email format validation
    .replace(/[^a-zA-Z0-9@._-]/g, '');
}

/**
 * Sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  if (typeof phone !== 'string') {
    return '';
  }

  return phone
    .trim()
    // Keep only digits, spaces, hyphens, parentheses, and plus sign
    .replace(/[^0-9\s\-\(\)\+]/g, '')
    // Limit length
    .substring(0, 20);
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(
  input: string, 
  options: { 
    allowDecimals?: boolean; 
    allowNegative?: boolean; 
    min?: number; 
    max?: number; 
  } = {}
): string {
  const { allowDecimals = true, allowNegative = true, min, max } = options;

  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Remove all non-numeric characters except decimal point and minus sign
  if (allowDecimals && allowNegative) {
    sanitized = sanitized.replace(/[^0-9.-]/g, '');
  } else if (allowDecimals) {
    sanitized = sanitized.replace(/[^0-9.]/g, '');
  } else if (allowNegative) {
    sanitized = sanitized.replace(/[^0-9-]/g, '');
  } else {
    sanitized = sanitized.replace(/[^0-9]/g, '');
  }

  // Ensure only one decimal point
  if (allowDecimals) {
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }
  }

  // Ensure only one minus sign at the beginning
  if (allowNegative) {
    const minusCount = (sanitized.match(/-/g) || []).length;
    if (minusCount > 1 || (minusCount === 1 && !sanitized.startsWith('-'))) {
      sanitized = sanitized.replace(/-/g, '');
      if (input.startsWith('-')) {
        sanitized = '-' + sanitized;
      }
    }
  }

  // Apply min/max constraints
  if (sanitized && !isNaN(Number(sanitized))) {
    const numValue = Number(sanitized);
    if (min !== undefined && numValue < min) {
      sanitized = min.toString();
    }
    if (max !== undefined && numValue > max) {
      sanitized = max.toString();
    }
  }

  return sanitized;
}

/**
 * Remove potentially dangerous content from text
 */
export function removeDangerousContent(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  return text
    // Remove SQL injection patterns
    .replace(/['\\;|*%<>{}[\]()]/g, '')
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove object and embed tags
    .replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')
    // Remove form tags
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
}