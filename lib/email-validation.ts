/**
 * Email validation utilities
 */

// List of common personal email domains to block
const PERSONAL_EMAIL_DOMAINS = [
  // Major providers
  'gmail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.fr',
  'yahoo.de',
  'yahoo.es',
  'yahoo.it',
  'yahoo.ca',
  'yahoo.com.au',
  'yahoo.co.in',
  'hotmail.com',
  'hotmail.co.uk',
  'hotmail.fr',
  'hotmail.de',
  'hotmail.es',
  'hotmail.it',
  'outlook.com',
  'outlook.co.uk',
  'outlook.fr',
  'outlook.de',
  'outlook.es',
  'live.com',
  'live.co.uk',
  'live.fr',
  'live.de',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'aim.com',
  'protonmail.com',
  'proton.me',
  'pm.me',
  'zoho.com',
  'zohomail.com',
  'yandex.com',
  'yandex.ru',
  'mail.com',
  'mail.ru',
  'inbox.com',
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'gmx.at',
  'gmx.ch',
  'fastmail.com',
  'fastmail.fm',
  'tutanota.com',
  'tutanota.de',
  'tuta.io',
  'mailfence.com',
  'disroot.org',
  'riseup.net',
  'runbox.com',
  'posteo.de',
  'posteo.net',
  'kolabnow.com',
  'mailbox.org',
  '163.com',
  '126.com',
  'qq.com',
  'sina.com',
  'sohu.com',
  'naver.com',
  'daum.net',
  'hanmail.net',
  'rediffmail.com',
  'lycos.com',
  'hushmail.com',
  'cock.li',
  'tormail.org',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'mailinator.com',
  'maildrop.cc',
  'temp-mail.org',
  'trashmail.com',
  'sharklasers.com',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.org',
  'guerrillamail.de',
];

// Additional patterns for temporary/disposable email services
const DISPOSABLE_EMAIL_PATTERNS = [
  /.*\.tk$/,
  /.*\.ml$/,
  /.*\.ga$/,
  /.*\.cf$/,
  /temp.*\..*/,
  /trash.*\..*/,
  /fake.*\..*/,
  /disposable.*\..*/,
  /throwaway.*\..*/,
  /guerrilla.*\..*/,
  /mailinator.*\..*/,
  /10minute.*\..*/,
  /minute.*mail\..*/,
];

export interface EmailValidationResult {
  isValid: boolean;
  isBusinessEmail: boolean;
  error?: string;
  domain?: string;
}

/**
 * Validates an email address and checks if it's a business email
 */
export function validateBusinessEmail(email: string): EmailValidationResult {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || !emailRegex.test(email)) {
    return {
      isValid: false,
      isBusinessEmail: false,
      error: 'Please enter a valid email address',
    };
  }

  const emailLower = email.toLowerCase();
  const domain = emailLower.split('@')[1];

  if (!domain) {
    return {
      isValid: false,
      isBusinessEmail: false,
      error: 'Invalid email format',
    };
  }

  // Check against personal email domains
  if (PERSONAL_EMAIL_DOMAINS.includes(domain)) {
    return {
      isValid: true,
      isBusinessEmail: false,
      error: 'Please use your business email address. Personal email addresses are not accepted.',
      domain,
    };
  }

  // Check against disposable email patterns
  for (const pattern of DISPOSABLE_EMAIL_PATTERNS) {
    if (pattern.test(domain)) {
      return {
        isValid: true,
        isBusinessEmail: false,
        error: 'Temporary or disposable email addresses are not accepted. Please use your business email.',
        domain,
      };
    }
  }

  // Additional checks for obviously fake domains
  if (domain.length < 4 || !domain.includes('.') || domain.endsWith('.')) {
    return {
      isValid: false,
      isBusinessEmail: false,
      error: 'Please enter a valid business email address',
      domain,
    };
  }

  // Check for numeric-only domains (often spam)
  if (/^\d+\.\d+$/.test(domain)) {
    return {
      isValid: true,
      isBusinessEmail: false,
      error: 'Please use a valid business email address',
      domain,
    };
  }

  // If all checks pass, it's likely a business email
  return {
    isValid: true,
    isBusinessEmail: true,
    domain,
  };
}

/**
 * Get a user-friendly error message for non-business emails
 */
export function getBusinessEmailErrorMessage(domain?: string): string {
  if (!domain) {
    return 'Please enter a valid email address';
  }

  if (PERSONAL_EMAIL_DOMAINS.includes(domain)) {
    const provider = domain.split('.')[0];
    return `Personal email addresses (${provider}) are not accepted. Please use your business email address to sign up.`;
  }

  return 'Please use your business email address. Personal email addresses are not accepted.';
}

/**
 * Check if an email domain is whitelisted (for special cases)
 */
const WHITELISTED_DOMAINS: string[] = [
  // Add any domains that should bypass the business email check
  // For example, during development or for specific partners
];

export function isWhitelistedDomain(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  return domain ? WHITELISTED_DOMAINS.includes(domain) : false;
} 