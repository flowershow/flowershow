/**
 * @jest-environment node
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MDXRemote } from 'next-mdx-remote'

import parse from "../../lib/markdown.mjs";

const md = `---
title: Test title
---
# Test heading
`

describe('Markdown lib', () => {
  it('parses frontmatter', async () => {
    const { frontMatter } = await parse(md);
    expect(frontMatter.title).toBe("Test title");

    // TODO testing components (will throw an error atm)
    // render(<MDXRemote {...mdxSource}/>)
    // const heading = screen.getByRole('heading', {
    //   name: /Test heading/,
    // })
    // expect(heading).toBeInTheDocument();

  })
})
