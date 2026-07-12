import { describe, it, expect } from 'vitest';
import { classifyPerishability } from './perishability';

describe('classifyPerishability — regression guard', () => {
  it('classifies root vegetables (long shelf life) as donatable, not perishable', () => {
    // Bug: 'produce' used to be treated as unambiguously perishable, so
    // potatoes (shelfLife 30) never got a chance to fall through to the
    // shelfLife check and were wrongly flagged "keep at home" alongside
    // bananas. Verified against real foodDatabase.ts category/shelfLife data.
    expect(classifyPerishability({ name: 'potato', category: 'produce' })).toBe('non-perishable');
    expect(classifyPerishability({ name: 'onion', category: 'produce' })).toBe('non-perishable');
    expect(classifyPerishability({ name: 'garlic', category: 'produce' })).toBe('non-perishable');
  });

  it('classifies soft produce (short shelf life) as perishable', () => {
    expect(classifyPerishability({ name: 'banana', category: 'produce' })).toBe('perishable');
    expect(classifyPerishability({ name: 'tomato', category: 'produce' })).toBe('perishable');
    expect(classifyPerishability({ name: 'lettuce', category: 'produce' })).toBe('perishable');
  });

  it('still treats dairy/meat/frozen as unambiguously perishable', () => {
    expect(classifyPerishability({ name: 'milk', category: 'dairy' })).toBe('perishable');
    expect(classifyPerishability({ name: 'chicken breast', category: 'meat' })).toBe('perishable');
  });

  it('still treats canned/grains as unambiguously non-perishable', () => {
    expect(classifyPerishability({ name: 'canned black beans', category: 'canned' })).toBe('non-perishable');
    expect(classifyPerishability({ name: 'rice', category: 'grains' })).toBe('non-perishable');
  });
});
