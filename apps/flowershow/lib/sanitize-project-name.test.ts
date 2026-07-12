import { describe, expect, it } from 'vitest';

import { sanitizeProjectName } from './sanitize-project-name';

describe('sanitizeProjectName', () => {
  it('lowercases uppercase letters', () => {
    expect(sanitizeProjectName('MyNotes')).toBe('mynotes');
  });

  it('replaces spaces with hyphens', () => {
    expect(sanitizeProjectName('My Notes')).toBe('my-notes');
  });

  it('replaces characters outside [a-z0-9-_] with hyphens', () => {
    expect(sanitizeProjectName('My.Notes!')).toBe('my-notes-');
  });

  it('preserves hyphens and underscores', () => {
    expect(sanitizeProjectName('my-notes_vault')).toBe('my-notes_vault');
  });

  it('leaves an already-slug-safe name unchanged', () => {
    expect(sanitizeProjectName('my-notes')).toBe('my-notes');
  });

  it('is idempotent (sanitizing a sanitized name is a no-op)', () => {
    const once = sanitizeProjectName('My Notes!');
    expect(sanitizeProjectName(once)).toBe(once);
  });

  it('matches the create-site transform for a name with capitals and spaces', () => {
    // The stored projectName must equal what a raw lookup gets sanitized to,
    // so a site created from "My Notes" is later found by looking up "My Notes".
    expect(sanitizeProjectName('My Notes')).toBe(
      sanitizeProjectName('my-notes'),
    );
  });
});
