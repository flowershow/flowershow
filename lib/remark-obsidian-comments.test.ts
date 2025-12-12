import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import remarkObsidianComments from './remark-obsidian-comments';

describe('remarkObsidianComments', () => {
  const processMarkdown = async (input: string) => {
    const result = await unified()
      .use(remarkParse)
      .use(remarkObsidianComments)
      .use(remarkStringify)
      .process(input);
    return result.toString().trim();
  };

  it('should remove a single inline comment', async () => {
    const input = 'This is visible %%this is hidden%% text';
    const output = await processMarkdown(input);
    expect(output).toBe('This is visible  text');
  });

  it('should remove multiple inline comments', async () => {
    const input = 'Start %%comment1%% middle %%comment2%% end';
    const output = await processMarkdown(input);
    expect(output).toBe('Start  middle  end');
  });

  it('should remove comment at the beginning', async () => {
    const input = '%%hidden%% visible text';
    const output = await processMarkdown(input);
    // remark-stringify may encode leading spaces as &#x20;
    expect(output.replace(/&#x20;/g, ' ').trim()).toBe('visible text');
  });

  it('should remove comment at the end', async () => {
    const input = 'visible text %%hidden%%';
    const output = await processMarkdown(input);
    // remark-stringify may encode trailing spaces as &#x20;
    expect(output.replace(/&#x20;/g, ' ').trim()).toBe('visible text');
  });

  it('should handle text with only a comment', async () => {
    const input = '%%only comment%%';
    const output = await processMarkdown(input);
    expect(output).toBe('');
  });

  it('should handle multi-line comments', async () => {
    const input = `This is visible %%this is
a multi-line
comment%% and this is also visible`;
    const output = await processMarkdown(input);
    expect(output).toBe('This is visible  and this is also visible');
  });

  it('should handle comments in headings', async () => {
    const input = '# Heading %%comment%% text';
    const output = await processMarkdown(input);
    expect(output).toContain('# Heading  text');
  });

  it('should handle comments in lists', async () => {
    const input = `- Item 1 %%hidden%%
- Item 2 %%also hidden%%`;
    const output = await processMarkdown(input);
    expect(output).toContain('Item 1');
    expect(output).toContain('Item 2');
    expect(output).not.toContain('hidden');
  });

  it('should handle empty comments', async () => {
    const input = 'Text %%%% more text';
    const output = await processMarkdown(input);
    expect(output).toBe('Text  more text');
  });

  it('should handle text without comments', async () => {
    const input = 'This text has no comments at all';
    const output = await processMarkdown(input);
    expect(output).toBe('This text has no comments at all');
  });

  it('should handle single % signs (not comments)', async () => {
    const input = 'This has 50% completion rate';
    const output = await processMarkdown(input);
    expect(output).toBe('This has 50% completion rate');
  });

  it('should handle unmatched %% (treated as literal)', async () => {
    const input = 'Text with %% unmatched marker';
    const output = await processMarkdown(input);
    expect(output).toBe('Text with %% unmatched marker');
  });

  it('should handle complex nested markdown with comments', async () => {
    const input = `# Title %%draft%%

This is a paragraph %%with comment%% and more text.

- List item 1 %%todo%%
- List item 2

%%
This entire block
should be hidden
%%

Final paragraph.`;
    const output = await processMarkdown(input);
    expect(output).toContain('# Title');
    expect(output).toContain('This is a paragraph  and more text.');
    expect(output).toContain('List item 1');
    expect(output).toContain('List item 2');
    expect(output).toContain('Final paragraph.');
    expect(output).not.toContain('draft');
    expect(output).not.toContain('with comment');
    expect(output).not.toContain('todo');
    expect(output).not.toContain('This entire block');
  });
});
