import { describe, it, expect } from 'vitest';
import {
  isPackIcon,
  parsePackIconRef,
  toPackIconValue,
} from './iconLibrary';

describe('pack icon refs', () => {
  it('detects pack prefix', () => {
    expect(isPackIcon('pack:a:b')).toBe(true);
    expect(isPackIcon('lib:x')).toBe(false);
    expect(isPackIcon('/abs')).toBe(false);
  });

  it('round-trips parse and format', () => {
    expect(parsePackIconRef(toPackIconValue('dev-tools', 'terminal'))).toEqual({
      packId: 'dev-tools',
      iconId: 'terminal',
    });
  });

  it('returns null for malformed refs', () => {
    expect(parsePackIconRef('pack:')).toBe(null);
    expect(parsePackIconRef('pack:only')).toBe(null);
  });
});
