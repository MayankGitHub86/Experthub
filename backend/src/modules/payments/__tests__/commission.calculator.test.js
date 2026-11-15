/**
 * Commission Calculator Tests
 * 
 * Tests for deterministic 15%/85% commission splitting
 * Using integer arithmetic (no floating-point errors)
 */

import { describe, it, expect } from '@jest/globals';
import CommissionCalculator from '../commission.calculator.js';

describe('CommissionCalculator', () => {
  describe('calculateSplit()', () => {
    it('correctly splits $100 into 15%/85%', () => {
      const result = CommissionCalculator.calculateSplit(10000, 'USD');
      
      expect(result.grossAmount).toBe(10000);
      expect(result.platformCommission).toBe(1500);
      expect(result.expertShare).toBe(8500);
      expect(result.currency).toBe('USD');
      
      // Verify sum
      expect(result.platformCommission + result.expertShare)
        .toBe(result.grossAmount);
    });

    it('correctly splits $50.99 with rounding', () => {
      const result = CommissionCalculator.calculateSplit(5099, 'USD');
      
      // 5099 * 0.15 = 764.85 → rounds to 765
      expect(result.platformCommission).toBe(765);
      expect(result.expertShare).toBe(4334);
      
      // Verify sum
      expect(result.platformCommission + result.expertShare)
        .toBe(5099);
    });

    it('correctly splits $1.00 (minimum)', () => {
      const result = CommissionCalculator.calculateSplit(100, 'USD');
      
      // 100 * 0.15 = 15 (rounds to 15)
      expect(result.platformCommission).toBe(15);
      expect(result.expertShare).toBe(85);
      
      expect(result.platformCommission + result.expertShare)
        .toBe(100);
    });

    it('correctly splits $0.50 (edge case)', () => {
      const result = CommissionCalculator.calculateSplit(50, 'USD');
      
      // 50 * 0.15 = 7.5 → rounds to 8
      expect(result.platformCommission).toBe(8);
      expect(result.expertShare).toBe(42);
      
      expect(result.platformCommission + result.expertShare)
        .toBe(50);
    });

    it('handles $0 correctly', () => {
      const result = CommissionCalculator.calculateSplit(0, 'USD');
      
      expect(result.grossAmount).toBe(0);
      expect(result.platformCommission).toBe(0);
      expect(result.expertShare).toBe(0);
    });

    it('correctly splits large amounts ($10,000)', () => {
      const result = CommissionCalculator.calculateSplit(1000000, 'USD');
      
      expect(result.platformCommission).toBe(150000);
      expect(result.expertShare).toBe(850000);
      
      expect(result.platformCommission + result.expertShare)
        .toBe(1000000);
    });

    it('rejects non-integer amounts', () => {
      expect(() => {
        CommissionCalculator.calculateSplit(100.5, 'USD');
      }).toThrow('non-negative integer');
    });

    it('rejects negative amounts', () => {
      expect(() => {
        CommissionCalculator.calculateSplit(-100, 'USD');
      }).toThrow('non-negative integer');
    });
  });

  describe('verifyBreakdown()', () => {
    it('validates correct 15%/85% split', () => {
      const valid = CommissionCalculator.verifyBreakdown({
        grossAmount: 10000,
        platformCommission: 1500,
        expertShare: 8500
      });
      
      expect(valid).toBe(true);
    });

    it('rejects breakdown with wrong sum', () => {
      const invalid = CommissionCalculator.verifyBreakdown({
        grossAmount: 10000,
        platformCommission: 1500,
        expertShare: 8499 // Wrong!
      });
      
      expect(invalid).toBe(false);
    });

    it('rejects breakdown with non-integers', () => {
      const invalid = CommissionCalculator.verifyBreakdown({
        grossAmount: 10000,
        platformCommission: 1500.5,
        expertShare: 8499.5
      });
      
      expect(invalid).toBe(false);
    });

    it('allows ±1 cent rounding deviation', () => {
      // For $333.33 (33333 cents):
      // 33333 * 0.15 = 4999.95 → rounds to 5000
      // expert = 33333 - 5000 = 28333
      const valid = CommissionCalculator.verifyBreakdown({
        grossAmount: 33333,
        platformCommission: 5000,
        expertShare: 28333
      });
      
      expect(valid).toBe(true);
    });
  });

  describe('getCurrencyInfo()', () => {
    it('returns correct info for USD', () => {
      const info = CommissionCalculator.getCurrencyInfo('USD');
      
      expect(info.code).toBe('USD');
      expect(info.minorUnit).toBe(2);
      expect(info.symbol).toBe('$');
    });

    it('returns correct info for JPY (0 minor units)', () => {
      const info = CommissionCalculator.getCurrencyInfo('JPY');
      
      expect(info.code).toBe('JPY');
      expect(info.minorUnit).toBe(0);
      expect(info.symbol).toBe('¥');
    });

    it('returns default for unknown currency', () => {
      const info = CommissionCalculator.getCurrencyInfo('XXX');
      
      expect(info.code).toBe('XXX');
      expect(info.minorUnit).toBe(2);
    });
  });

  describe('toMinorUnits() and toDecimal()', () => {
    it('converts $100.50 to 10050 cents', () => {
      const cents = CommissionCalculator.toMinorUnits(100.50, 2);
      expect(cents).toBe(10050);
    });

    it('converts 10050 cents back to $100.50', () => {
      const dollars = CommissionCalculator.toDecimal(10050, 2);
      expect(dollars).toBe(100.50);
    });

    it('handles JPY (0 decimal places)', () => {
      const yen = CommissionCalculator.toMinorUnits(100, 0);
      expect(yen).toBe(100);
    });

    it('round-trips currency conversions', () => {
      const original = 123.45;
      const cents = CommissionCalculator.toMinorUnits(original, 2);
      const back = CommissionCalculator.toDecimal(cents, 2);
      
      expect(back).toBe(original);
    });
  });

  describe('Rate Verification', () => {
    it('confirms rates sum to 100%', () => {
      expect(
        CommissionCalculator.PLATFORM_RATE + CommissionCalculator.EXPERT_RATE
      ).toBe(1.0);
    });

    it('confirms correct percentages', () => {
      expect(CommissionCalculator.PLATFORM_RATE).toBe(0.15);
      expect(CommissionCalculator.EXPERT_RATE).toBe(0.85);
    });
  });

  describe('Real-World Scenarios', () => {
    it('handles typical booking ($150 consultation)', () => {
      const result = CommissionCalculator.calculateSplit(15000, 'USD');
      
      // Expected: platform=$22.50, expert=$127.50
      expect(result.platformCommission).toBe(2250);
      expect(result.expertShare).toBe(12750);
      
      const breakdown = {
        grossAmount: 15000,
        platformCommission: 2250,
        expertShare: 12750
      };
      
      expect(CommissionCalculator.verifyBreakdown(breakdown)).toBe(true);
    });

    it('handles high-value booking ($5,000)', () => {
      const result = CommissionCalculator.calculateSplit(500000, 'USD');
      
      // Expected: platform=$750, expert=$4,250
      expect(result.platformCommission).toBe(75000);
      expect(result.expertShare).toBe(425000);
      
      expect(result.platformCommission + result.expertShare)
        .toBe(500000);
    });

    it('handles fractional cent amounts after calculation', () => {
      // 77 cents * 0.15 = 11.55 → rounds to 12
      const result = CommissionCalculator.calculateSplit(77, 'USD');
      
      expect(result.platformCommission).toBe(12);
      expect(result.expertShare).toBe(65);
      expect(result.platformCommission + result.expertShare).toBe(77);
    });
  });

  describe('Financial Integrity', () => {
    it('NEVER loses or gains money due to rounding', () => {
      // Test 100 random amounts from $0.01 to $1000
      for (let i = 1; i <= 100000; i += 500) {
        const result = CommissionCalculator.calculateSplit(i, 'USD');
        
        expect(result.platformCommission + result.expertShare)
          .toBe(result.grossAmount);
      }
    });

    it('commission is always between 14% and 16% of gross', () => {
      const amounts = [50, 100, 250, 1000, 5000, 10000];
      
      amounts.forEach(amount => {
        const result = CommissionCalculator.calculateSplit(amount, 'USD');
        const rate = result.platformCommission / result.grossAmount;
        
        // Allow 1% deviation for rounding edge cases
        expect(rate).toBeGreaterThanOrEqual(0.14);
        expect(rate).toBeLessThanOrEqual(0.16);
      });
    });
  });
});
