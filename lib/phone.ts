/**
 * Phone number normalization, validation, and formatting for Minerva Flow.
 * Optimized for North American POS environments (Canada / US) with international support.
 */

/**
 * Strips all non-digits except a leading '+'.
 */
export function sanitizePhoneInput(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Normalizes a phone number to standard E.164 format (+1XXXXXXXXXX).
 * Defaults to North American (+1) if 10 digits without country code.
 * Returns null if the number does not resemble a valid phone number.
 */
export function normalizePhoneNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const sanitized = sanitizePhoneInput(raw);
  if (!sanitized) return null;

  // Case 1: Already has country code prefix '+'
  if (sanitized.startsWith("+")) {
    const digits = sanitized.slice(1);
    if (digits.length >= 10 && digits.length <= 15) {
      return sanitized;
    }
    return null;
  }

  // Case 2: France / Europe numbers starting with 0 (e.g. 06 12 34 56 78 -> 10 digits starting with 0)
  if (sanitized.length === 10 && sanitized.startsWith("0")) {
    return `+33${sanitized.slice(1)}`;
  }

  // Case 3: 10 digits (Standard North American: area code + 7 digits)
  if (sanitized.length === 10) {
    return `+1${sanitized}`;
  }

  // Case 4: 11 digits starting with '1' (North American with leading 1)
  if (sanitized.length === 11 && sanitized.startsWith("1")) {
    return `+${sanitized}`;
  }

  // Case 5: Other international length without leading +
  if (sanitized.length >= 11 && sanitized.length <= 15) {
    return `+${sanitized}`;
  }

  return null;
}

/**
 * Returns raw 10 digits for North American numbers (e.g. '5145551234')
 * useful for simple POS keyboard emulation or POS search boxes.
 */
export function getLocalPhoneDigits(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Formats a phone number for elegant editorial display:
 * +15145551234 -> (514) 555-1234
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");

  // 10 digits (North American): (514) 555-1234
  if (digits.length === 10 && !phone.startsWith("+33") && !phone.startsWith("+44")) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // 11 digits starting with 1 (North American): (514) 555-1234
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone;
}

/**
 * Validates if the input string can be parsed as a phone number.
 */
export function isValidPhoneNumber(raw: string | null | undefined): boolean {
  return normalizePhoneNumber(raw) !== null;
}
