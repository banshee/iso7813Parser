import type { CstNode, ICstVisitor, IToken } from "chevrotain";
import { Track1Parser, Track2Parser, track1Parser, track2Parser } from "./parser.js";
import type {
  Track1Data,
  Track2Data,
  CardholderName,
  ExpirationDate,
} from "./types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// Track 1 CST Visitor
// ═══════════════════════════════════════════════════════════════════════════════

const Track1BaseVisitor = track1Parser.getBaseCstVisitorConstructor();

/**
 * Visits a Track 1 CST and produces a typed `Track1Data` result.
 *
 * The trailing data block (everything between the second `^` and `?`) is
 * decomposed into expiration date (4 digits YYMM), service code (3 digits),
 * and discretionary data (remaining digits).
 */
export class Track1Visitor extends Track1BaseVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  track1(ctx: any): Track1Data {
    const formatCode: string = ctx.T1FormatCode[0].image;
    const panNode = this.visit(ctx.pan);
    const nameRaw: string = this.visit(ctx.name);
    const parsedName = parseName(nameRaw);

    let expirationDate: ExpirationDate | undefined;
    let serviceCode: string | undefined;
    let discretionaryData: string | undefined;

    if (ctx.trailingData) {
      const trailing: string = this.visit(ctx.trailingData);
      const parsed = parseTrailingData(trailing);
      expirationDate = parsed.expirationDate;
      serviceCode = parsed.serviceCode;
      discretionaryData = parsed.discretionaryData;
    }

    let lrc: string | undefined;
    if (ctx.T1LRC) {
      lrc = ctx.T1LRC[0].image;
    }

    return {
      track: 1,
      formatCode,
      pan: panNode,
      name: parsedName,
      expirationDate,
      serviceCode,
      discretionaryData,
      lrc,
    };
  }

  pan(ctx: any): string {
    return ctx.T1Digits[0].image;
  }

  name(ctx: any): string {
    if (ctx.T1AlphanumData) {
      return ctx.T1AlphanumData[0].image;
    }
    return "";
  }

  trailingData(ctx: any): string {
    return ctx.T1Digits[0].image;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Track 2 CST Visitor
// ═══════════════════════════════════════════════════════════════════════════════

const Track2BaseVisitor = track2Parser.getBaseCstVisitorConstructor();

/**
 * Visits a Track 2 CST and produces a typed `Track2Data` result.
 */
export class Track2Visitor extends Track2BaseVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  track2(ctx: any): Track2Data {
    const pan: string = this.visit(ctx.pan);

    let expirationDate: ExpirationDate | undefined;
    let serviceCode: string | undefined;
    let discretionaryData: string | undefined;

    if (ctx.trailingData) {
      const trailing: string = this.visit(ctx.trailingData);
      const parsed = parseTrailingData(trailing);
      expirationDate = parsed.expirationDate;
      serviceCode = parsed.serviceCode;
      discretionaryData = parsed.discretionaryData;
    }

    let lrc: string | undefined;
    if (ctx.T2LRC) {
      lrc = ctx.T2LRC[0].image;
    }

    return {
      track: 2,
      pan,
      expirationDate,
      serviceCode,
      discretionaryData,
      lrc,
    };
  }

  pan(ctx: any): string {
    return ctx.T2Digits[0].image;
  }

  trailingData(ctx: any): string {
    return ctx.T2Digits[0].image;
  }
}

// Singleton visitor instances
export const track1Visitor = new Track1Visitor();
export const track2Visitor = new Track2Visitor();

// ═══════════════════════════════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse the trailing data block into expiration date, service code,
 * and discretionary data.
 *
 * The trailing block is a run of digits: `YYMMSCCDDD...`
 * - First 4 digits: Expiration date (YYMM)
 * - Next 3 digits: Service code
 * - Remaining: Discretionary data
 *
 * If fewer than 4 digits, we treat the whole thing as discretionary data
 * (some issuers use non-standard encodings).
 */
function parseTrailingData(trailing: string): {
  expirationDate?: ExpirationDate;
  serviceCode?: string;
  discretionaryData?: string;
} {
  if (trailing.length < 4) {
    // Not enough for an expiration date — treat as discretionary
    return { discretionaryData: trailing.length > 0 ? trailing : undefined };
  }

  const edRaw = trailing.slice(0, 4);
  const year = parseInt(edRaw.slice(0, 2), 10);
  const month = parseInt(edRaw.slice(2, 4), 10);
  const expirationDate: ExpirationDate = { raw: edRaw, year, month };

  let serviceCode: string | undefined;
  let discretionaryData: string | undefined;

  if (trailing.length >= 7) {
    serviceCode = trailing.slice(4, 7);
    if (trailing.length > 7) {
      discretionaryData = trailing.slice(7);
    }
  } else if (trailing.length > 4) {
    // Between 4 and 7 chars — treat remainder as discretionary
    // (service code is normally 3 digits, but data may be truncated)
    discretionaryData = trailing.slice(4);
  }

  return { expirationDate, serviceCode, discretionaryData };
}

/**
 * Parse a Track 1 name field.
 *
 * The name is encoded as: `SURNAME/GIVEN NAME.TITLE`
 * - `/` separates surname from given name
 * - `.` separates given name from title (rarely used)
 * - Spaces may appear within name parts
 */
function parseName(raw: string): CardholderName {
  const result: CardholderName = { raw, surname: raw };

  const slashIdx = raw.indexOf("/");
  if (slashIdx === -1) {
    // No slash — entire field is the surname
    result.surname = raw.trim();
    return result;
  }

  result.surname = raw.slice(0, slashIdx).trim();
  const remainder = raw.slice(slashIdx + 1);

  const dotIdx = remainder.indexOf(".");
  if (dotIdx === -1) {
    result.givenName = remainder.trim() || undefined;
  } else {
    result.givenName = remainder.slice(0, dotIdx).trim() || undefined;
    const titlePart = remainder.slice(dotIdx + 1).trim();
    result.title = titlePart || undefined;
  }

  return result;
}
