import { describe, it, expect } from "vitest";
import { parse } from "../src/index.js";

describe("parse() — auto-detect", () => {
  it("auto-detects Track 1 from % prefix", () => {
    const result = parse("%B4111111111111111^DOE/JOHN^2512101?");

    expect(result.data).toBeDefined();
    expect(result.data!.track).toBe(1);
    if (result.data!.track === 1) {
      expect(result.data!.name.surname).toBe("DOE");
    }
  });

  it("auto-detects Track 2 from ; prefix", () => {
    const result = parse(";4111111111111111=2512101?");

    expect(result.data).toBeDefined();
    expect(result.data!.track).toBe(2);
    expect(result.data!.pan).toBe("4111111111111111");
  });

  it("throws on empty input", () => {
    expect(() => parse("")).toThrow("Input is empty");
  });

  it("throws on unrecognized track format", () => {
    expect(() => parse("X4111111111111111")).toThrow("Unrecognized track format");
  });

  it("throws on numeric-only input without sentinel", () => {
    expect(() => parse("4111111111111111")).toThrow("Unrecognized track format");
  });

  describe("type narrowing by track field", () => {
    it("allows narrowing Track 1 data via track discriminant", () => {
      const result = parse("%B4111111111111111^DOE/JOHN^2512101?");

      if (result.data && result.data.track === 1) {
        // TypeScript should narrow this to Track1Data
        expect(result.data.name.surname).toBe("DOE");
        expect(result.data.formatCode).toBe("B");
      } else {
        throw new Error("Expected Track 1 data");
      }
    });

    it("allows narrowing Track 2 data via track discriminant", () => {
      const result = parse(";4111111111111111=2512101?");

      if (result.data && result.data.track === 2) {
        // TypeScript should narrow this to Track2Data
        expect(result.data.pan).toBe("4111111111111111");
        // @ts-expect-error — Track2Data doesn't have a name field
        const _name = result.data.name;
      } else {
        throw new Error("Expected Track 2 data");
      }
    });
  });
});
