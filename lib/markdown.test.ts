// Import the function you want to test
import { escapeSpecialCharacters } from "./escape-special-character";
import "@testing-library/jest-dom";

describe("processContent", () => {
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
    const result = escapeSpecialCharacters("A <= B > C <=> D");
    expect(result).toBe("A &lt;= B &gt; C &lt;=&gt; D");
  });
});
