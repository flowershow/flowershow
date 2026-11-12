import { describe, expect, it } from 'vitest';
import type { DirNode, FileNode, Node } from './build-site-tree';
import { adjacentPages } from './page-sequence';

const file = (path: string, label: string, urlPath: string): FileNode => ({
  kind: 'file',
  label,
  name: path.split('/').pop()!,
  path,
  urlPath,
  metadata: null,
});

const dir = (path: string, children: Node[]): DirNode => ({
  kind: 'dir',
  label: path.split('/').pop()!,
  name: path.split('/').pop()!,
  path,
  urlPath: `/${path}`,
  children,
});

const tree: Node[] = [
  dir('course', [
    file('course/README.md', 'Course', '/course'),
    dir('course/1-basics', [
      file('course/1-basics/README.md', 'Basics', '/course/1-basics'),
      file('course/1-basics/notes.md', 'Notes', '/course/1-basics/notes'),
    ]),
    dir('course/2-next', [
      file('course/2-next/README.md', 'Next', '/course/2-next'),
    ]),
  ]),
];

describe('adjacentPages', () => {
  it('goes from a folder page to the first child folder page', () => {
    expect(adjacentPages(tree, 'course/README.md').next).toEqual({
      url: '/course/1-basics',
      title: 'Basics',
    });
  });

  it('has no previous for the first page', () => {
    expect(adjacentPages(tree, 'course/README.md').previous).toBeNull();
  });

  it('goes from the last page of a folder to the next folder', () => {
    const r = adjacentPages(tree, 'course/1-basics/notes.md');
    expect(r.next).toEqual({ url: '/course/2-next', title: 'Next' });
    expect(r.previous).toEqual({ url: '/course/1-basics', title: 'Basics' });
  });

  it('has no next for the last page', () => {
    expect(adjacentPages(tree, 'course/2-next/README.md').next).toBeNull();
  });

  it('gives nulls for an unknown path', () => {
    expect(adjacentPages(tree, 'nope.md')).toEqual({
      previous: null,
      next: null,
    });
  });
});
