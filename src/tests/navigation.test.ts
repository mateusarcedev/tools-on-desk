import { describe, it, expect } from 'vitest';
import { NAV_ITEMS } from '../types/navigation';

describe('Navigation Model', () => {
  it('should contain all 9 required sections from the approved prototype', () => {
    const ids = NAV_ITEMS.map((n) => n.id);
    expect(ids).toEqual([
      'home',
      'downloads',
      'documents',
      'audio',
      'video',
      'images',
      'posters',
      'history',
      'settings',
    ]);
  });

  it('should have sequential keyboard shortcut keys 1 to 9', () => {
    NAV_ITEMS.forEach((item, index) => {
      expect(item.key).toBe(String(index + 1));
    });
  });
});
