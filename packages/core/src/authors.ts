/**
 * Normalizes a user-controlled frontmatter `authors` value into a clean list of
 * author strings.
 *
 * `authors` is documented as a list, but users naturally write a single scalar
 * (`authors: Jane`) when there's one author, and YAML frontmatter can hold
 * arbitrary shapes. Consumers that need `string[]` (the app's `getAuthors`
 * query, the search index's `authors` field) would reject a scalar. Coerce a
 * scalar to a single-item list, keep only non-empty string entries from a
 * list, and drop anything else — never throw.
 */
export function normalizeAuthors(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value];
  return list.filter(
    (entry): entry is string =>
      typeof entry === 'string' && entry.trim().length > 0,
  );
}
