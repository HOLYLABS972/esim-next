// OTP generation and validation utilities

/**
 * Generate a random 6-digit OTP
 * @returns {string} 6-digit OTP string
 */
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a random 4-digit OTP
 * @returns {string} 4-digit OTP string
 */
export function generateShortOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Validate OTP format (6 digits)
 * @param {string} otp - OTP to validate
 * @returns {boolean} true if valid format
 */
export function validateOTPFormat(otp) {
  return /^\d{6}$/.test(otp);
}

/**
 * Validate short OTP format (4 digits)
 * @param {string} otp - OTP to validate
 * @returns {boolean} true if valid format
 */
export function validateShortOTPFormat(otp) {
  return /^\d{4}$/.test(otp);
}

/**
 * Check if OTP has expired
 * @param {number} timestamp - When OTP was created
 * @param {number} expiryMinutes - Minutes until expiry (default: 10)
 * @returns {boolean} true if expired
 */
export function isOTPExpired(timestamp, expiryMinutes = 10) {
  const now = Date.now();
  const expiryTime = timestamp + (expiryMinutes * 60 * 1000);
  return now > expiryTime;
}

/**
 * Generate OTP with timestamp for tracking expiry
 * @param {number} expiryMinutes - Minutes until expiry (default: 10)
 * @returns {object} {otp: string, timestamp: number, expiresAt: number}
 */
export function generateOTPWithTimestamp(expiryMinutes = 10) {
  const otp = generateOTP();
  const timestamp = Date.now();
  const expiresAt = timestamp + (expiryMinutes * 60 * 1000);
  
  return {
    otp,
    timestamp,
    expiresAt
  };
}
