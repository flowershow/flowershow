import { processMdxString } from "./process-mdx-string";
import "@testing-library/jest-dom";

describe("processMdxString", () => {
  it("should replace < with &lt;", () => {
    const result = processMdxString("<");
    expect(result).toBe("&lt;");
  });

  it("should replace > with &gt;", () => {
    const result = processMdxString(">");
    expect(result).toBe("&gt;");
  });

  it("should replace <= with &lt;=", () => {
    const result = processMdxString("<=");
    expect(result).toBe("&lt;=");
  });

  it("should replace => with =&gt;", () => {
    const result = processMdxString("=>");
    expect(result).toBe("=&gt;");
  });

  it("should replace >= with &gt;=", () => {
    const result = processMdxString(">=");
    expect(result).toBe("&gt;=");
  });

  it("should replace <=> with &lt;=&gt;", () => {
    const result = processMdxString("<=>");
    expect(result).toBe("&lt;=&gt;");
  });

  it("shouldn't replace < and > in JSX elements", () => {
    const input = `<LineChart data={[]}/>`;
    const expectedOutput = input;
    const result = processMdxString(input);
    expect(result).toBe(expectedOutput);
  });
});
