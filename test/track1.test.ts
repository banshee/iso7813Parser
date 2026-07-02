import { describe, it, expect } from "vitest";
import { parseTrack1 } from "../src/index.js";

describe("Track 1 Parser", () => {
  describe("valid data — all fields present", () => {
    it("parses a standard banking card (format code B)", () => {
      const input = "%B4111111111111111^DOE/JOHN^2512101123400000?";
      const result = parseTrack1(input);

      expect(result.lexErrors).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(0);
      expect(result.data).toBeDefined();

      const data = result.data!;
      expect(data.track).toBe(1);
      expect(data.formatCode).toBe("B");
      expect(data.pan).toBe("4111111111111111");
      expect(data.name.surname).toBe("DOE");
      expect(data.name.givenName).toBe("JOHN");
      expect(data.expirationDate).toBeDefined();
      expect(data.expirationDate!.raw).toBe("2512");
      expect(data.expirationDate!.year).toBe(25);
      expect(data.expirationDate!.month).toBe(12);
      expect(data.serviceCode).toBe("101");
      expect(data.discretionaryData).toBe("123400000");
    });

    it("parses Track 1 with LRC character", () => {
      const input = "%B4111111111111111^DOE/JOHN^2512101?X";
      const result = parseTrack1(input);

      expect(result.lexErrors).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(0);
      expect(result.data).toBeDefined();
      expect(result.data!.lrc).toBe("X");
    });
  });

  describe("name field parsing", () => {
    it("parses surname only", () => {
      const input = "%B4111111111111111^DOE^2512101?";
      const result = parseTrack1(input);

      expect(result.data).toBeDefined();
      expect(result.data!.name.surname).toBe("DOE");
      expect(result.data!.name.givenName).toBeUndefined();
      expect(result.data!.name.title).toBeUndefined();
    });

    it("parses surname and given name", () => {
      const input = "%B4111111111111111^DOE/JOHN^2512101?";
      const result = parseTrack1(input);

      expect(result.data).toBeDefined();
      expect(result.data!.name.surname).toBe("DOE");
      expect(result.data!.name.givenName).toBe("JOHN");
    });

    it("parses surname, given name, and title", () => {
      const input = "%B4111111111111111^DOE/JOHN.MR^2512101?";
      const result = parseTrack1(input);

      expect(result.data).toBeDefined();
      expect(result.data!.name.surname).toBe("DOE");
      expect(result.data!.name.givenName).toBe("JOHN");
      expect(result.data!.name.title).toBe("MR");
    });

    it("preserves the raw name string", () => {
      const input = "%B4111111111111111^DOE/JOHN.MR^2512101?";
      const result = parseTrack1(input);

      expect(result.data!.name.raw).toBe("DOE/JOHN.MR");
    });

    it("handles name with spaces", () => {
      const input = "%B4111111111111111^VAN DER BERG/ANNA MARIA^2512101?";
      const result = parseTrack1(input);

      expect(result.data).toBeDefined();
      expect(result.data!.name.surname).toBe("VAN DER BERG");
      expect(result.data!.name.givenName).toBe("ANNA MARIA");
    });
  });

  describe("optional fields", () => {
    it("handles missing trailing data (no ED, SC, DD)", () => {
      const input = "%B4111111111111111^DOE/JOHN^?";
      const result = parseTrack1(input);

      expect(result.lexErrors).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(0);
      expect(result.data).toBeDefined();
      expect(result.data!.expirationDate).toBeUndefined();
      expect(result.data!.serviceCode).toBeUndefined();
      expect(result.data!.discretionaryData).toBeUndefined();
    });

    it("handles expiration date only (no service code or DD)", () => {
      const input = "%B4111111111111111^DOE/JOHN^2512?";
      const result = parseTrack1(input);

      expect(result.data).toBeDefined();
      expect(result.data!.expirationDate).toBeDefined();
      expect(result.data!.expirationDate!.year).toBe(25);
      expect(result.data!.expirationDate!.month).toBe(12);
      expect(result.data!.serviceCode).toBeUndefined();
    });

    it("handles ED + SC but no discretionary data", () => {
      const input = "%B4111111111111111^DOE/JOHN^2512101?";
      const result = parseTrack1(input);

      expect(result.data).toBeDefined();
      expect(result.data!.expirationDate!.year).toBe(25);
      expect(result.data!.serviceCode).toBe("101");
      expect(result.data!.discretionaryData).toBeUndefined();
    });
  });

  describe("format codes", () => {
    it("parses format code A", () => {
      const input = "%A4111111111111111^DOE/JOHN^2512101?";
      const result = parseTrack1(input);

      expect(result.data).toBeDefined();
      expect(result.data!.formatCode).toBe("A");
    });

    it("parses format code B", () => {
      const input = "%B4111111111111111^DOE/JOHN^2512101?";
      const result = parseTrack1(input);

      expect(result.data).toBeDefined();
      expect(result.data!.formatCode).toBe("B");
    });
  });

  describe("PAN edge cases", () => {
    it("parses minimum-length PAN (1 digit)", () => {
      const input = "%B1^DOE/JOHN^2512101?";
      const result = parseTrack1(input);

      expect(result.data).toBeDefined();
      expect(result.data!.pan).toBe("1");
    });

    it("parses maximum-length PAN (19 digits)", () => {
      const input = "%B1234567890123456789^DOE/JOHN^2512101?";
      const result = parseTrack1(input);

      expect(result.data).toBeDefined();
      expect(result.data!.pan).toBe("1234567890123456789");
    });
  });

  describe("error handling", () => {
    it("returns errors for missing start sentinel", () => {
      const input = "B4111111111111111^DOE/JOHN^2512101?";
      const result = parseTrack1(input);

      expect(result.lexErrors.length + result.parseErrors.length).toBeGreaterThan(0);
    });

    it("returns errors for missing end sentinel", () => {
      const input = "%B4111111111111111^DOE/JOHN^2512101";
      const result = parseTrack1(input);

      expect(result.lexErrors.length + result.parseErrors.length).toBeGreaterThan(0);
    });

    it("returns errors for missing field separators", () => {
      const input = "%B4111111111111111DOE/JOHN2512101?";
      const result = parseTrack1(input);

      expect(result.lexErrors.length + result.parseErrors.length).toBeGreaterThan(0);
    });
  });
});
