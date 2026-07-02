import { tokenizeTrack1, tokenizeTrack2 } from "./tokens.js";
import { track1Parser, track2Parser } from "./parser.js";
import { track1Visitor, track2Visitor } from "./visitor.js";
import type {
  Track1Data,
  Track2Data,
  ParseResult,
  CardholderName,
  ExpirationDate,
} from "./types.js";

// Re-export all public types
export type {
  Track1Data,
  Track2Data,
  ParseResult,
  CardholderName,
  ExpirationDate,
};

/**
 * Parse ISO/IEC 7813 Track 1 magnetic stripe data.
 *
 * Track 1 (IATA format) begins with `%` and contains alphanumeric data
 * including the cardholder name.
 *
 * @example
 * ```typescript
 * const result = parseTrack1("%B4111111111111111^DOE/JOHN^25121011234?");
 * if (result.data) {
 *   console.log(result.data.pan);  // "4111111111111111"
 *   console.log(result.data.name.surname); // "DOE"
 * }
 * ```
 */
export function parseTrack1(input: string): ParseResult<Track1Data> {
  const lexResult = tokenizeTrack1(input);

  track1Parser.input = lexResult.tokens;
  const cst = track1Parser.track1();

  const parseErrors = track1Parser.errors;

  let data: Track1Data | undefined;
  if (parseErrors.length === 0 && lexResult.errors.length === 0) {
    data = track1Visitor.visit(cst) as Track1Data;
  }

  return {
    data,
    lexErrors: lexResult.errors,
    parseErrors,
  };
}

/**
 * Parse ISO/IEC 7813 Track 2 magnetic stripe data.
 *
 * Track 2 (ABA format) begins with `;` and contains numeric-only data.
 *
 * @example
 * ```typescript
 * const result = parseTrack2(";4111111111111111=25121011234?");
 * if (result.data) {
 *   console.log(result.data.pan);  // "4111111111111111"
 *   console.log(result.data.expirationDate?.month); // 12
 * }
 * ```
 */
export function parseTrack2(input: string): ParseResult<Track2Data> {
  const lexResult = tokenizeTrack2(input);

  track2Parser.input = lexResult.tokens;
  const cst = track2Parser.track2();

  const parseErrors = track2Parser.errors;

  let data: Track2Data | undefined;
  if (parseErrors.length === 0 && lexResult.errors.length === 0) {
    data = track2Visitor.visit(cst) as Track2Data;
  }

  return {
    data,
    lexErrors: lexResult.errors,
    parseErrors,
  };
}

/**
 * Parse ISO/IEC 7813 magnetic stripe data, auto-detecting the track format.
 *
 * Inspects the first character to determine the track:
 * - `%` → Track 1 (IATA, alphanumeric)
 * - `;` → Track 2 (ABA, numeric)
 *
 * @throws {Error} If the input is empty or starts with an unrecognized character
 *
 * @example
 * ```typescript
 * const result = parse("%B4111111111111111^DOE/JOHN^25121011234?");
 * if (result.data?.track === 1) {
 *   console.log(result.data.name.surname); // "DOE"
 * }
 * ```
 */
export function parse(
  input: string,
): ParseResult<Track1Data | Track2Data> {
  if (!input || input.length === 0) {
    throw new Error("Input is empty");
  }

  const firstChar = input[0];
  switch (firstChar) {
    case "%":
      return parseTrack1(input);
    case ";":
      return parseTrack2(input);
    default:
      throw new Error(
        `Unrecognized track format: input starts with '${firstChar}'. ` +
          `Expected '%' (Track 1) or ';' (Track 2).`,
      );
  }
}
