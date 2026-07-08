import { describe, expect, it } from 'vitest';
import { slugifyUsername } from './generate-username';

describe('slugifyUsername', () => {
  it('lowercases the local part', () => {
    expect(slugifyUsername('JohnDoe@example.com')).toBe('johndoe');
  });

  it('strips dots, plus and underscores', () => {
    expect(slugifyUsername('john.doe@example.com')).toBe('johndoe');
    expect(slugifyUsername('john+tag@example.com')).toBe('johntag');
    expect(slugifyUsername('john_doe@example.com')).toBe('johndoe');
  });

  it('strips every other non-alphanumeric character', () => {
    expect(slugifyUsername('john  doe@example.com')).toBe('johndoe');
    expect(slugifyUsername('john!!doe@example.com')).toBe('johndoe');
    expect(slugifyUsername('!john!@example.com')).toBe('john');
  });

  it('transliterates accented Latin characters to ASCII', () => {
    expect(slugifyUsername('józef@example.com')).toBe('jozef');
    expect(slugifyUsername('André@example.com')).toBe('andre');
    expect(slugifyUsername('müller@example.com')).toBe('muller');
    expect(slugifyUsername('joão@example.com')).toBe('joao');
  });

  it('falls back to "user" when nothing usable remains', () => {
    expect(slugifyUsername('...@example.com')).toBe('user');
    expect(slugifyUsername('@example.com')).toBe('user');
  });

  it('keeps digits', () => {
    expect(slugifyUsername('user123@example.com')).toBe('user123');
  });
});
