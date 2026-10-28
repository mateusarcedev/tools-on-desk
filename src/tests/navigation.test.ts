import { describe, it, expect } from 'vitest';
import { NAV_ITEMS } from '../types/navigation';

describe('Navigation Model', () => {
  it('should contain all required sections including creative studio', () => {
    const ids = NAV_ITEMS.map((n) => n.id);
    expect(ids).toEqual([
      'home',
      'creative',
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

  it('should have valid keyboard shortcut keys for all navigation items', () => {
    NAV_ITEMS.forEach((item) => {
      expect(item.key).toBeDefined();
      expect(item.key.length).toBeGreaterThan(0);
    });
  });
});
