/**
 * Commission Calculator
 * 
 * Deterministic, integer-based calculation for payment commissions.
 * Uses minor currency units (cents for USD, pence for GBP, etc.)
 * to avoid floating-point errors in financial calculations.
 * 
 * Rules:
 * - Platform commission: 15%
 * - Expert share: 85%
 * - All amounts in minor units (integers)
 * - Verification: platformCommission + expertShare === grossAmount
 */

class CommissionCalculator {
  /**
   * Platform commission rate: 15%
   */
  static PLATFORM_RATE = 0.15;

  /**
   * Expert share rate: 85%
   */
  static EXPERT_RATE = 0.85;

  /**
   * Verify rates sum to 100%
   */
  static {
    if (this.PLATFORM_RATE + this.EXPERT_RATE !== 1.0) {
      throw new Error('Commission rates do not sum to 100%');
    }
  }

  /**
   * Calculate commission split for a gross amount
   * 
   * @param {number} grossAmountCents - Amount in minor currency units (cents)
   * @param {string} currency - Currency code (USD, EUR, GBP, etc.)
   * @returns {object} { grossAmount, platformCommission, expertShare, currency }
   * 
   * @example
   * // For $100 booking (10000 cents)
   * const result = CommissionCalculator.calculateSplit(10000, 'USD');
   * // Returns: {
   * //   grossAmount: 10000,
   * //   platformCommission: 1500,  (15%)
   * //   expertShare: 8500,          (85%)
   * //   currency: 'USD'
   * // }
   */
  static calculateSplit(grossAmountCents, currency = 'USD') {
    // Validate input
    if (!Number.isInteger(grossAmountCents) || grossAmountCents < 0) {
      throw new Error('Gross amount must be a non-negative integer (minor units)');
    }

    if (grossAmountCents === 0) {
      return {
        grossAmount: 0,
        platformCommission: 0,
        expertShare: 0,
        currency
      };
    }

    // Calculate using integer arithmetic to avoid floating-point errors
    // Round platform commission to nearest cent
    const platformCommission = Math.round(grossAmountCents * this.PLATFORM_RATE);
    
    // Expert share is remainder (guarantees sum = gross)
    const expertShare = grossAmountCents - platformCommission;

    // Verify split
    if (platformCommission + expertShare !== grossAmountCents) {
      throw new Error('Commission calculation integrity check failed');
    }

    return {
      grossAmount: grossAmountCents,
      platformCommission,
      expertShare,
      currency
    };
  }

  /**
   * Verify a commission breakdown matches expected split
   * 
   * @param {object} breakdown - { grossAmount, platformCommission, expertShare }
   * @returns {boolean} True if breakdown is valid
   */
  static verifyBreakdown(breakdown) {
    const {
      grossAmount,
      platformCommission,
      expertShare
    } = breakdown;

    // Check all are integers
    if (!Number.isInteger(grossAmount) ||
        !Number.isInteger(platformCommission) ||
        !Number.isInteger(expertShare)) {
      return false;
    }

    // Check sum
    if (platformCommission + expertShare !== grossAmount) {
      return false;
    }

    // Check platform rate is approximately 15%
    if (grossAmount === 0) return true;
    
    const actualRate = platformCommission / grossAmount;
    const expectedRate = this.PLATFORM_RATE;
    
    // Allow ±1 cent deviation due to rounding
    const deviation = Math.abs(platformCommission - Math.round(grossAmount * expectedRate));
    return deviation <= 1;
  }

  /**
   * Get currency info for minor-unit conversion
   * 
   * @param {string} currency - Currency code
   * @returns {object} { code, minorUnit, symbol }
   */
  static getCurrencyInfo(currency = 'USD') {
    const info = {
      USD: { code: 'USD', minorUnit: 2, symbol: '$' },
      EUR: { code: 'EUR', minorUnit: 2, symbol: '€' },
      GBP: { code: 'GBP', minorUnit: 2, symbol: '£' },
      JPY: { code: 'JPY', minorUnit: 0, symbol: '¥' },
      INR: { code: 'INR', minorUnit: 2, symbol: '₹' },
      CAD: { code: 'CAD', minorUnit: 2, symbol: 'C$' },
      AUD: { code: 'AUD', minorUnit: 2, symbol: 'A$' }
    };

    return info[currency] || { code: currency, minorUnit: 2, symbol: '' };
  }

  /**
   * Convert decimal amount to minor units
   * 
   * @param {number} decimalAmount - Amount as decimal (e.g., 100.50)
   * @param {number} minorUnit - Number of decimal places (2 for USD)
   * @returns {number} Amount in minor units
   */
  static toMinorUnits(decimalAmount, minorUnit = 2) {
    return Math.round(decimalAmount * Math.pow(10, minorUnit));
  }

  /**
   * Convert minor units to decimal amount
   * 
   * @param {number} minorUnits - Amount in minor units
   * @param {number} minorUnit - Number of decimal places
   * @returns {number} Amount as decimal
   */
  static toDecimal(minorUnits, minorUnit = 2) {
    return minorUnits / Math.pow(10, minorUnit);
  }
}

export default CommissionCalculator;
