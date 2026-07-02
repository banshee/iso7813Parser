import { describe, it, expect } from "vitest";
import { parse, parseSwipe, splitTracks } from "../src/index.js";

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

describe("splitTracks()", () => {
  it("splits a combined track 1 and track 2 swipe", () => {
    const input = "%B5113320854537821^07675051298$20000$^3312121000000000000000624000000?;5113320854537821=331212100000624000?";
    const segments = splitTracks(input);
    expect(segments).toEqual([
      "%B5113320854537821^07675051298$20000$^3312121000000000000000624000000?",
      ";5113320854537821=331212100000624000?"
    ]);
  });
});

describe("parseSwipe()", () => {
  it("parses combined track 1 and track 2 swipe successfully", () => {
    const input = "%B5113320854537821^07675051298$20000$^3312121000000000000000624000000?;5113320854537821=331212100000624000?";
    const swipe = parseSwipe(input);

    expect(swipe.track1).toBeDefined();
    expect(swipe.track1!.lexErrors).toHaveLength(0);
    expect(swipe.track1!.parseErrors).toHaveLength(0);
    expect(swipe.track1!.data).toBeDefined();
    expect(swipe.track1!.data!.pan).toBe("5113320854537821");

    expect(swipe.track2).toBeDefined();
    expect(swipe.track2!.lexErrors).toHaveLength(0);
    expect(swipe.track2!.parseErrors).toHaveLength(0);
    expect(swipe.track2!.data).toBeDefined();
    expect(swipe.track2!.data!.pan).toBe("5113320854537821");
  });
});

