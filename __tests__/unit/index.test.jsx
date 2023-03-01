// import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import parse from "../../lib/markdown.js";

const md = `
---
title: Test title
date: 01/03/2023
---
# Test heading
`

describe('Markdown lib', () => {
  it('parses frontmatter', () => {
    const parsed = parse(md);
    console.log({parsed});

    // expect(heading).toBeInTheDocument()
  })
})
