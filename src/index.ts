import { tokenizeTrack1, tokenizeTrack2 } from "./tokens.js";
import { track1Parser, track2Parser } from "./parser.js";
import { track1Visitor, track2Visitor } from "./visitor.js";
import type {
  Track1Data,
  Track2Data,
  ParseResult,
  CardholderName,
  ExpirationDate,
  SwipeResult,
} from "./types.js";

// Re-export all public types
export type {
  Track1Data,
  Track2Data,
  ParseResult,
  CardholderName,
  ExpirationDate,
  SwipeResult,
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

/**
 * Split a raw card swipe string into individual track segments.
 *
 * Most card readers output all tracks concatenated on a single line,
 * e.g. `%B...^NAME^...?;PAN=...?`. This function splits that into
 * separate track strings using the sentinel characters.
 *
 * @returns An array of individual track strings (e.g. ["%B...?", ";PAN=...?"])
 */
export function splitTracks(input: string): string[] {
  const tracks: string[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (ch === "%" || ch === ";") {
      // Find the end sentinel `?` for this track
      const endIdx = input.indexOf("?", i);
      if (endIdx === -1) {
        // No end sentinel found — take the rest as a (malformed) track
        tracks.push(input.slice(i));
        break;
      }
      // Include one optional LRC character after `?`
      let trackEnd = endIdx + 1;
      if (
        trackEnd < input.length &&
        input[trackEnd] !== "%" &&
        input[trackEnd] !== ";"
      ) {
        trackEnd++; // include LRC
      }
      tracks.push(input.slice(i, trackEnd));
      i = trackEnd;
    } else {
      // Skip unexpected characters between tracks
      i++;
    }
  }

  return tracks;
}

/**
 * Parse a full card swipe that may contain multiple tracks concatenated
 * together, as is typical of card reader output.
 *
 * Handles formats like:
 * - `%B...?;...?` (Track 1 + Track 2)
 * - `%B...?` (Track 1 only)
 * - `;...?` (Track 2 only)
 *
 * @throws {Error} If the input is empty
 *
 * @example
 * ```typescript
 * const swipe = parseSwipe(
 *   "%B4111111111111111^DOE/JOHN^2512101?;4111111111111111=2512101?"
 * );
 * console.log(swipe.track1?.data?.name.surname); // "DOE"
 * console.log(swipe.track2?.data?.pan);           // "4111111111111111"
 * ```
 */
export function parseSwipe(input: string): SwipeResult {
  if (!input || input.length === 0) {
    throw new Error("Input is empty");
  }

  const segments = splitTracks(input);
  const result: SwipeResult = {};

  for (const segment of segments) {
    const firstChar = segment[0];
    if (firstChar === "%" && !result.track1) {
      result.track1 = parseTrack1(segment);
    } else if (firstChar === ";" && !result.track2) {
      result.track2 = parseTrack2(segment);
    }
  }

  return result;
}
