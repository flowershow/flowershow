import "@testing-library/jest-dom";
import { extractTitle } from "./extract-title";

describe("extractTitle", () => {
  it("extracts the first heading correctly", async () => {
    const source = `
## Second Heading
# First Heading
# Another Heading
      `;
    const expected = null;
    const result = await extractTitle(source);
    expect(result).toBe(expected);
  });

  it("returns null if there is no first heading", async () => {
    const source = `
## Heading
Some other content
      `;
    const expected = null;
    const result = await extractTitle(source);
    expect(result).toBe(expected);
  });

  it("extracts link text correctly", async () => {
    const source = `
# [[Link Text]]
      `;
    const expected = "Link Text";
    const result = await extractTitle(source);
    expect(result).toBe(expected);
  });

  it("extracts bold title correctly", async () => {
    const source = `
# **Bold Title**
      `;
    const expected = "Bold Title";
    const result = await extractTitle(source);
    expect(result).toBe(expected);
  });

  it("extracts the first heading with introductory text", async () => {
    const source = `
Some introduction text
# First Heading
## Second Heading
      `;
    const expected = null;
    const result = await extractTitle(source);
    expect(result).toBe(expected);
  });

  it("extracts bold title correctly", async () => {
    const source = `
# __Bold Title__
        `;
    const expected = "Bold Title";
    const result = await extractTitle(source);
    expect(result).toBe(expected);
  });


  it("extracts bold title correctly", async () => {
    const source = `
#Text
        `;
    const expected = null;
    const result = await extractTitle(source);
    expect(result).toBe(expected);
  });
});
