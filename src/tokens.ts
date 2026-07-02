import { createToken, Lexer, type TokenType } from "chevrotain";

// ═══════════════════════════════════════════════════════════════════════════════
// Track 1 Tokens (IATA format, alphanumeric)
// Format: %FC PAN ^ NAME ^ EDSC DD ?LRC
// ═══════════════════════════════════════════════════════════════════════════════

export const T1StartSentinel = createToken({
  name: "T1StartSentinel",
  pattern: /%/,
});

export const T1FormatCode = createToken({
  name: "T1FormatCode",
  pattern: /[A-Za-z]/,
});

export const T1FieldSeparator = createToken({
  name: "T1FieldSeparator",
  pattern: /\^/,
});

export const T1EndSentinel = createToken({
  name: "T1EndSentinel",
  pattern: /\?/,
});

// Digits — matches one or more digit characters
export const T1Digits = createToken({
  name: "T1Digits",
  pattern: /[0-9]+/,
});

// Alphanumeric data — matches characters valid in Track 1 fields (name, discretionary)
// Track 1 uses a 6-bit character set that includes A-Z, 0-9, space, and some specials.
// The name field and discretionary data can contain: A-Z, 0-9, space, . / -
export const T1AlphanumData = createToken({
  name: "T1AlphanumData",
  pattern: /[A-Za-z0-9 .\/\-]+/,
});

// LRC — single character after end sentinel (any printable character)
export const T1LRC = createToken({
  name: "T1LRC",
  pattern: /./,
});

/**
 * Ordered token list for Track 1. Order matters for Chevrotain's lexer —
 * more specific patterns must come before more general ones.
 *
 * However, Track 1's format is positional, so we use a custom lexer approach:
 * we break the input into structural tokens first using a regex-based tokenizer,
 * then feed those tokens to the parser.
 */
export const track1Tokens: TokenType[] = [
  T1StartSentinel,
  T1FormatCode,
  T1FieldSeparator,
  T1EndSentinel,
  T1Digits,
  T1AlphanumData,
  T1LRC,
];

// ═══════════════════════════════════════════════════════════════════════════════
// Track 2 Tokens (ABA format, numeric only)
// Format: ;PAN=EDSCDD?LRC
// ═══════════════════════════════════════════════════════════════════════════════

export const T2StartSentinel = createToken({
  name: "T2StartSentinel",
  pattern: /;/,
});

export const T2FieldSeparator = createToken({
  name: "T2FieldSeparator",
  pattern: /=/,
});

export const T2EndSentinel = createToken({
  name: "T2EndSentinel",
  pattern: /\?/,
});

export const T2Digits = createToken({
  name: "T2Digits",
  pattern: /[0-9]+/,
});

export const T2LRC = createToken({
  name: "T2LRC",
  pattern: /./,
});

export const track2Tokens: TokenType[] = [
  T2StartSentinel,
  T2FieldSeparator,
  T2EndSentinel,
  T2Digits,
  T2LRC,
];

// ═══════════════════════════════════════════════════════════════════════════════
// Custom Tokenizers
//
// Standard Chevrotain lexers match greedily from left to right, which doesn't
// work well for magstripe data where the meaning of characters is positional
// (e.g., the first char after `%` is always the format code, regardless of
// whether it's a letter that could also appear in a name field).
//
// We use custom tokenization functions that understand the positional structure
// of each track format, producing Chevrotain IToken arrays.
// ═══════════════════════════════════════════════════════════════════════════════

import type { IToken, ILexingError } from "chevrotain";
import { createTokenInstance } from "chevrotain";

interface LexResult {
  tokens: IToken[];
  errors: ILexingError[];
}

/**
 * Custom tokenizer for Track 1 data.
 *
 * Track 1 structure: `%` FC PAN `^` NAME `^` ED SC DD `?` LRC?
 *
 * We parse this positionally because the Chevrotain lexer can't disambiguate
 * between T1FormatCode, T1AlphanumData, and T1Digits based on pattern alone —
 * the format code is a single letter that would also match alphanumeric data.
 */
export function tokenizeTrack1(input: string): LexResult {
  const tokens: IToken[] = [];
  const errors: ILexingError[] = [];
  let offset = 0;
  let line = 1;
  let column = 1;

  function makeToken(
    type: TokenType,
    image: string,
    startOffset: number,
    startColumn: number,
  ): IToken {
    return createTokenInstance(type, image, startOffset, startOffset + image.length - 1, line, NaN, startColumn, startColumn + image.length - 1);
  }

  function addError(message: string, offset: number, length: number): void {
    errors.push({
      message,
      offset,
      length,
      line,
      column,
    });
  }

  // 1. Start Sentinel: %
  if (offset < input.length && input[offset] === "%") {
    tokens.push(makeToken(T1StartSentinel, "%", offset, column));
    offset++;
    column++;
  } else {
    addError("Expected start sentinel '%'", offset, 1);
    return { tokens, errors };
  }

  // 2. Format Code: single alpha char
  if (offset < input.length && /[A-Za-z]/.test(input[offset])) {
    tokens.push(makeToken(T1FormatCode, input[offset], offset, column));
    offset++;
    column++;
  } else {
    addError("Expected format code (A-Z)", offset, 1);
    return { tokens, errors };
  }

  // 3. PAN: digits up to next ^
  const panStart = offset;
  const panStartCol = column;
  let panImage = "";
  while (offset < input.length && /[0-9]/.test(input[offset])) {
    panImage += input[offset];
    offset++;
    column++;
  }
  if (panImage.length > 0) {
    tokens.push(makeToken(T1Digits, panImage, panStart, panStartCol));
  } else {
    addError("Expected PAN digits", offset, 1);
    return { tokens, errors };
  }

  // 4. First Field Separator: ^
  if (offset < input.length && input[offset] === "^") {
    tokens.push(makeToken(T1FieldSeparator, "^", offset, column));
    offset++;
    column++;
  } else {
    addError("Expected field separator '^'", offset, 1);
    return { tokens, errors };
  }

  // 5. Name: everything up to next ^
  const nameStart = offset;
  const nameStartCol = column;
  let nameImage = "";
  while (offset < input.length && input[offset] !== "^") {
    nameImage += input[offset];
    offset++;
    column++;
  }
  if (nameImage.length > 0) {
    tokens.push(makeToken(T1AlphanumData, nameImage, nameStart, nameStartCol));
  }
  // Name can be empty (though unusual)

  // 6. Second Field Separator: ^
  if (offset < input.length && input[offset] === "^") {
    tokens.push(makeToken(T1FieldSeparator, "^", offset, column));
    offset++;
    column++;
  } else {
    addError("Expected field separator '^'", offset, 1);
    return { tokens, errors };
  }

  // 7. Remaining data before end sentinel: ED (4 digits) + SC (3 digits) + DD (variable)
  //    All run together as a single digit string until `?`
  const dataStart = offset;
  const dataStartCol = column;
  let dataImage = "";
  while (offset < input.length && input[offset] !== "?") {
    dataImage += input[offset];
    offset++;
    column++;
  }
  if (dataImage.length > 0) {
    tokens.push(makeToken(T1Digits, dataImage, dataStart, dataStartCol));
  }

  // 8. End Sentinel: ?
  if (offset < input.length && input[offset] === "?") {
    tokens.push(makeToken(T1EndSentinel, "?", offset, column));
    offset++;
    column++;
  } else {
    addError("Expected end sentinel '?'", offset, 1);
    return { tokens, errors };
  }

  // 9. Optional LRC: single character
  if (offset < input.length) {
    tokens.push(makeToken(T1LRC, input[offset], offset, column));
    offset++;
    column++;
  }

  // Anything remaining is an error
  if (offset < input.length) {
    addError(
      `Unexpected characters after LRC: '${input.slice(offset)}'`,
      offset,
      input.length - offset,
    );
  }

  return { tokens, errors };
}

/**
 * Custom tokenizer for Track 2 data.
 *
 * Track 2 structure: `;` PAN `=` ED SC DD `?` LRC?
 */
export function tokenizeTrack2(input: string): LexResult {
  const tokens: IToken[] = [];
  const errors: ILexingError[] = [];
  let offset = 0;
  let line = 1;
  let column = 1;

  function makeToken(
    type: TokenType,
    image: string,
    startOffset: number,
    startColumn: number,
  ): IToken {
    return createTokenInstance(type, image, startOffset, startOffset + image.length - 1, line, NaN, startColumn, startColumn + image.length - 1);
  }

  function addError(message: string, offset: number, length: number): void {
    errors.push({
      message,
      offset,
      length,
      line,
      column,
    });
  }

  // 1. Start Sentinel: ;
  if (offset < input.length && input[offset] === ";") {
    tokens.push(makeToken(T2StartSentinel, ";", offset, column));
    offset++;
    column++;
  } else {
    addError("Expected start sentinel ';'", offset, 1);
    return { tokens, errors };
  }

  // 2. PAN: digits up to next =
  const panStart = offset;
  const panStartCol = column;
  let panImage = "";
  while (offset < input.length && /[0-9]/.test(input[offset])) {
    panImage += input[offset];
    offset++;
    column++;
  }
  if (panImage.length > 0) {
    tokens.push(makeToken(T2Digits, panImage, panStart, panStartCol));
  } else {
    addError("Expected PAN digits", offset, 1);
    return { tokens, errors };
  }

  // 3. Field Separator: =
  if (offset < input.length && input[offset] === "=") {
    tokens.push(makeToken(T2FieldSeparator, "=", offset, column));
    offset++;
    column++;
  } else {
    addError("Expected field separator '='", offset, 1);
    return { tokens, errors };
  }

  // 4. Remaining data before end sentinel: ED (4 digits) + SC (3 digits) + DD (variable)
  const dataStart = offset;
  const dataStartCol = column;
  let dataImage = "";
  while (offset < input.length && input[offset] !== "?") {
    dataImage += input[offset];
    offset++;
    column++;
  }
  if (dataImage.length > 0) {
    tokens.push(makeToken(T2Digits, dataImage, dataStart, dataStartCol));
  }

  // 5. End Sentinel: ?
  if (offset < input.length && input[offset] === "?") {
    tokens.push(makeToken(T2EndSentinel, "?", offset, column));
    offset++;
    column++;
  } else {
    addError("Expected end sentinel '?'", offset, 1);
    return { tokens, errors };
  }

  // 6. Optional LRC: single character
  if (offset < input.length) {
    tokens.push(makeToken(T2LRC, input[offset], offset, column));
    offset++;
    column++;
  }

  // Anything remaining is an error
  if (offset < input.length) {
    addError(
      `Unexpected characters after LRC: '${input.slice(offset)}'`,
      offset,
      input.length - offset,
    );
  }

  return { tokens, errors };
}
