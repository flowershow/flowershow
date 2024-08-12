// jest.setup.ts
jest.mock("gray-matter", () => ({
  default: jest.fn().mockImplementation((source) => ({
    content: source,
    data: {},
  })),
}));
jest.mock("mdx-mermaid", () => jest.fn().mockImplementation(() => ({})));
jest.mock("hastscript", () => ({
  h: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("@portaljs/remark-callouts", () =>
  jest.fn().mockImplementation(() => ({})),
);
jest.mock("@portaljs/remark-embed", () =>
  jest.fn().mockImplementation(() => ({})),
);
jest.mock("remark-gfm", () => jest.fn().mockImplementation(() => ({})));
jest.mock("remark-math", () => jest.fn().mockImplementation(() => ({})));
jest.mock("remark-smartypants", () => jest.fn().mockImplementation(() => ({})));
jest.mock("remark-toc", () => jest.fn().mockImplementation(() => ({})));
jest.mock("@portaljs/remark-wiki-link", () => ({
  remarkWikiLink: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("rehype-autolink-headings", () => ({
  default: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("rehype-katex", () => jest.fn().mockImplementation(() => ({})));
jest.mock("rehype-slug", () => jest.fn().mockImplementation(() => ({})));
jest.mock("rehype-prism-plus", () => jest.fn().mockImplementation(() => ({})));
jest.mock("next-mdx-remote/serialize", () => ({
  serialize: jest.fn().mockResolvedValue("<div>Mocked MDX</div>"),
}));

// Import the function you want to test
import { processContent } from "./markdown";
import "@testing-library/jest-dom";

describe("processContent", () => {
  it("should replace < with &lt;", () => {
    const result = processContent("<");
    expect(result).toBe("&lt;");
  });

  it("should replace > with &gt;", () => {
    const result = processContent(">");
    expect(result).toBe("&gt;");
  });

  it("should replace <= with &lt;=", () => {
    const result = processContent("<=");
    expect(result).toBe("&lt;=");
  });

  it("should replace >= with &gt;=", () => {
    const result = processContent(">=");
    expect(result).toBe("&gt;=");
  });

  it("should replace <=> with &lt;=&gt;", () => {
    const result = processContent("<=>");
    expect(result).toBe("&lt;=&gt;");
  });

  it("should handle a string with multiple replacements", () => {
    const result = processContent("A <= B > C <=> D");
    expect(result).toBe("A &lt;= B &gt; C &lt;=&gt; D");
  });
});
