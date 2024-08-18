import { processMdxString } from "./process-mdx-string";
import "@testing-library/jest-dom";

describe("processMdxString", () => {
  it("should replace 'stanadlone' < with &lt;", () => {
    const result = processMdxString("abc < xyz");
    expect(result).toBe("abc &lt; xyz");
  });

  it("should replace 'stanadlone' > with &gt;", () => {
    const result = processMdxString("abc > xyz");
    expect(result).toBe("abc &gt; xyz");
  });

  it("should replace => with =&gt;", () => {
    const result = processMdxString("abc => xyz");
    expect(result).toBe("abc =&gt; xyz");
  });

  it("should replace <= with &lt;=", () => {
    const result = processMdxString("abc <= xyz");
    expect(result).toBe("abc &lt;= xyz");
  });

  it("shouldn't replace < and > in JSX elements", () => {
    const input = `
<div className="test"
     id="test"
  >
  <p>abc<br/>xyz</p>
  <p>abc < xyz</p>
  <p>abc > xyz</p>
</div>`;
    const expectedOutput = `
<div className="test"
     id="test"
  >
  <p>abc<br/>xyz</p>
  <p>abc &lt; xyz</p>
  <p>abc &gt; xyz</p>
</div>`;
    const result = processMdxString(input);
    expect(result).toBe(expectedOutput);
  });
});
