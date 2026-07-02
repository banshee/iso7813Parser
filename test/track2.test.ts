import { describe, it, expect } from "vitest";
import { parseTrack2 } from "../src/index.js";

describe("Track 2 Parser", () => {
  describe("valid data — all fields present", () => {
    it("parses a standard Track 2 string", () => {
      const input = ";4111111111111111=25121011234?";
      const result = parseTrack2(input);

      expect(result.lexErrors).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(0);
      expect(result.data).toBeDefined();

      const data = result.data!;
      expect(data.track).toBe(2);
      expect(data.pan).toBe("4111111111111111");
      expect(data.expirationDate).toBeDefined();
      expect(data.expirationDate!.raw).toBe("2512");
      expect(data.expirationDate!.year).toBe(25);
      expect(data.expirationDate!.month).toBe(12);
      expect(data.serviceCode).toBe("101");
      expect(data.discretionaryData).toBe("1234");
    });

    it("parses Track 2 with LRC", () => {
      const input = ";4111111111111111=2512101?3";
      const result = parseTrack2(input);

      expect(result.lexErrors).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(0);
      expect(result.data).toBeDefined();
      expect(result.data!.lrc).toBe("3");
    });
  });

  describe("optional fields", () => {
    it("handles missing trailing data (no ED, SC, DD)", () => {
      const input = ";4111111111111111=?";
      const result = parseTrack2(input);

      expect(result.lexErrors).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(0);
      expect(result.data).toBeDefined();
      expect(result.data!.expirationDate).toBeUndefined();
      expect(result.data!.serviceCode).toBeUndefined();
      expect(result.data!.discretionaryData).toBeUndefined();
    });

    it("handles expiration date only", () => {
      const input = ";4111111111111111=2512?";
      const result = parseTrack2(input);

      expect(result.data).toBeDefined();
      expect(result.data!.expirationDate).toBeDefined();
      expect(result.data!.expirationDate!.year).toBe(25);
      expect(result.data!.expirationDate!.month).toBe(12);
      expect(result.data!.serviceCode).toBeUndefined();
    });

    it("handles ED + SC but no discretionary data", () => {
      const input = ";4111111111111111=2512101?";
      const result = parseTrack2(input);

      expect(result.data).toBeDefined();
      expect(result.data!.expirationDate!.year).toBe(25);
      expect(result.data!.serviceCode).toBe("101");
      expect(result.data!.discretionaryData).toBeUndefined();
    });
  });

  describe("PAN edge cases", () => {
    it("parses minimum-length PAN (1 digit)", () => {
      const input = ";1=2512101?";
      const result = parseTrack2(input);

      expect(result.data).toBeDefined();
      expect(result.data!.pan).toBe("1");
    });

    it("parses maximum-length PAN (19 digits)", () => {
      const input = ";1234567890123456789=2512101?";
      const result = parseTrack2(input);

      expect(result.data).toBeDefined();
      expect(result.data!.pan).toBe("1234567890123456789");
    });
  });

  describe("real-world-like data", () => {
    it("parses a typical Visa card", () => {
      const input = ";4012345678901234=2908201123456789?";
      const result = parseTrack2(input);

      expect(result.data).toBeDefined();
      const data = result.data!;
      expect(data.pan).toBe("4012345678901234");
      expect(data.expirationDate!.year).toBe(29);
      expect(data.expirationDate!.month).toBe(8);
      expect(data.serviceCode).toBe("201");
    });

    it("parses a typical Mastercard", () => {
      const input = ";5412345678901234=2711201987654321?";
      const result = parseTrack2(input);

      expect(result.data).toBeDefined();
      expect(result.data!.pan).toBe("5412345678901234");
      expect(result.data!.expirationDate!.month).toBe(11);
    });
  });

  describe("error handling", () => {
    it("returns errors for missing start sentinel", () => {
      const input = "4111111111111111=2512101?";
      const result = parseTrack2(input);

      expect(result.lexErrors.length + result.parseErrors.length).toBeGreaterThan(0);
    });

    it("returns errors for missing end sentinel", () => {
      const input = ";4111111111111111=2512101";
      const result = parseTrack2(input);

      expect(result.lexErrors.length + result.parseErrors.length).toBeGreaterThan(0);
    });

    it("returns errors for missing field separator", () => {
      const input = ";41111111111111112512101?";
      const result = parseTrack2(input);

      // The lexer will consume all digits as PAN, then fail looking for =
      expect(result.lexErrors.length + result.parseErrors.length).toBeGreaterThan(0);
    });
  });
});
