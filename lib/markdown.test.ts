// Import the function you want to test
import { escapeSpecialCharacters } from "./escape-special-character";
import "@testing-library/jest-dom";

describe("escapeSpecialCharacters", () => {
  it("should replace < with &lt;", () => {
    const result = escapeSpecialCharacters("<");
    expect(result).toBe("&lt;");
  });

  it("should replace > with &gt;", () => {
    const result = escapeSpecialCharacters(">");
    expect(result).toBe("&gt;");
  });

  it("should replace <= with &lt;=", () => {
    const result = escapeSpecialCharacters("<=");
    expect(result).toBe("&lt;=");
  });

  it("should replace >= with &gt;=", () => {
    const result = escapeSpecialCharacters(">=");
    expect(result).toBe("&gt;=");
  });

  it("should replace <=> with &lt;=&gt;", () => {
    const result = escapeSpecialCharacters("<=>");
    expect(result).toBe("&lt;=&gt;");
  });

  it("should handle a string with multiple replacements", () => {
    const result = escapeSpecialCharacters(
      "<LineChart/> <= <BarChart/> <=> <PieChart/>",
    );
    expect(result).toBe("<LineChart/> &lt;= <BarChart/> &lt;=&gt; <PieChart/>");
  });
  it("should handle complex strings with tags and attributes", () => {
    const input = `<LineChart
  data={{
    values: [
      {
        value: -0.41765878,
        year: '1850'
      }
    ]
  }}
  xAxis="year"
  yAxis="value"
/>`;
    const expectedOutput = `<LineChart
  data={{
    values: [
      {
        value: -0.41765878,
        year: '1850'
      }
    ]
  }}
  xAxis="year"
  yAxis="value"
/>`;
    const result = escapeSpecialCharacters(input);
    expect(result).toBe(expectedOutput);
  });

  it("should handle a string with multiple replacements", () => {
    const result = escapeSpecialCharacters(
      '<div data-testid="obsidian-wiki-links">',
    );
    expect(result).toBe('<div data-testid="obsidian-wiki-links">');
  });
});
