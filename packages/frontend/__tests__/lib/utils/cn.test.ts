/**
 * Tests for cn utility functions
 * PURE FUNCTIONS - Perfect for Jest testing (no mocks needed)
 */

import { cn, cnBasic } from '@/lib/utils/cn';

describe('cn utility function', () => {
  describe('cn (with clsx and tailwind-merge)', () => {
    it('merges class names correctly', () => {
      const result = cn('flex', 'items-center', 'justify-between');
      expect(result).toBe('flex items-center justify-between');
    });

    it('handles conditional classes', () => {
      const isActive = true;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toBe('base-class active-class');
    });

    it('filters out falsy values', () => {
      const result = cn('flex', false, null, undefined, 'items-center');
      expect(result).toBe('flex items-center');
    });

    it('handles empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('merges conflicting Tailwind classes', () => {
      // twMerge should handle conflicting classes
      const result = cn('p-4', 'p-6'); // Both are padding classes
      expect(result).toBe('p-6'); // Later class should win
    });

    it('handles arrays of class names', () => {
      const result = cn(['flex', 'items-center'], 'justify-between');
      expect(result).toBe('flex items-center justify-between');
    });

    it('handles objects with conditional classes', () => {
      const result = cn({
        flex: true,
        hidden: false,
        'items-center': true,
      });
      expect(result).toBe('flex items-center');
    });

    it('handles complex mixed inputs', () => {
      const isVisible = true;
      const isDisabled = false;

      const result = cn(
        'base-class',
        ['flex', 'items-center'],
        {
          visible: isVisible,
          disabled: isDisabled,
        },
        isVisible && 'show-me',
        'final-class',
      );

      expect(result).toBe('base-class flex items-center visible show-me final-class');
    });
  });

  describe('cnBasic (without dependencies)', () => {
    it('joins valid class names', () => {
      const result = cnBasic('flex', 'items-center', 'justify-between');
      expect(result).toBe('flex items-center justify-between');
    });

    it('filters out undefined values', () => {
      const result = cnBasic('flex', undefined, 'items-center');
      expect(result).toBe('flex items-center');
    });

    it('filters out null values', () => {
      const result = cnBasic('flex', null, 'items-center');
      expect(result).toBe('flex items-center');
    });

    it('filters out false values', () => {
      const result = cnBasic('flex', false, 'items-center');
      expect(result).toBe('flex items-center');
    });

    it('filters out empty strings', () => {
      const result = cnBasic('flex', '', 'items-center');
      expect(result).toBe('flex items-center');
    });

    it('handles all falsy values', () => {
      const result = cnBasic(undefined, null, false);
      expect(result).toBe('');
    });

    it('handles empty input', () => {
      const result = cnBasic();
      expect(result).toBe('');
    });

    it('handles conditional logic', () => {
      const isActive = true;
      const isDisabled = false;

      const result = cnBasic('base-class', isActive && 'active', isDisabled && 'disabled');

      expect(result).toBe('base-class active');
    });
  });

  describe('comparison between cn and cnBasic', () => {
    it('both handle basic class joining', () => {
      const classes = ['flex', 'items-center', 'gap-4'];

      const cnResult = cn(...classes);
      const cnBasicResult = cnBasic(...classes);

      expect(cnResult).toBe(cnBasicResult);
    });

    it('both filter falsy values', () => {
      const cnResult = cn('flex', false, null, undefined, 'items-center');
      const cnBasicResult = cnBasic('flex', false, null, undefined, 'items-center');

      expect(cnResult).toBe(cnBasicResult);
    });

    it('cn handles Tailwind conflicts while cnBasic does not', () => {
      const cnResult = cn('p-4', 'p-6');
      const cnBasicResult = cnBasic('p-4', 'p-6');

      expect(cnResult).toBe('p-6'); // Merged by tailwind-merge
      expect(cnBasicResult).toBe('p-4 p-6'); // Simple join
    });
  });
});
