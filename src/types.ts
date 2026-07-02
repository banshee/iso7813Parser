import type { ILexingError, IRecognitionException } from "chevrotain";

// ─── Track 1 Types ───────────────────────────────────────────────────────────

/**
 * Parsed cardholder name from Track 1.
 * Track 1 encodes the name as `SURNAME/GIVEN NAME.TITLE` separated by field markers.
 */
export interface CardholderName {
  /** Raw name string as it appears on the stripe (e.g. "DOE/JOHN") */
  raw: string;
  /** Surname / last name */
  surname: string;
  /** Given name / first name, if present */
  givenName?: string;
  /** Title (e.g. "MR", "DR"), if present */
  title?: string;
}

/**
 * Parsed expiration date.
 */
export interface ExpirationDate {
  /** Raw 4-digit string as encoded on the stripe (YYMM) */
  raw: string;
  /** Two-digit year */
  year: number;
  /** Month (1–12) */
  month: number;
}

/**
 * Structured data extracted from an ISO/IEC 7813 Track 1 magnetic stripe.
 */
export interface Track1Data {
  track: 1;
  /** Format code — typically "B" for banking */
  formatCode: string;
  /** Primary Account Number, up to 19 digits */
  pan: string;
  /** Cardholder name */
  name: CardholderName;
  /** Expiration date (YYMM), if present */
  expirationDate?: ExpirationDate;
  /** Three-digit service code, if present */
  serviceCode?: string;
  /** Issuer-defined discretionary data, if present */
  discretionaryData?: string;
  /** Longitudinal Redundancy Check character, if present */
  lrc?: string;
}

/**
 * Structured data extracted from an ISO/IEC 7813 Track 2 magnetic stripe.
 */
export interface Track2Data {
  track: 2;
  /** Primary Account Number, up to 19 digits */
  pan: string;
  /** Expiration date (YYMM), if present */
  expirationDate?: ExpirationDate;
  /** Three-digit service code, if present */
  serviceCode?: string;
  /** Issuer-defined discretionary data, if present */
  discretionaryData?: string;
  /** Longitudinal Redundancy Check character, if present */
  lrc?: string;
}

// ─── Parse Result ────────────────────────────────────────────────────────────

/**
 * Result of parsing a magnetic stripe data string.
 * Contains the structured data (if parsing succeeded) along with any
 * lexer or parser errors encountered.
 */
export interface ParseResult<T> {
  /** Parsed data, or undefined if parsing failed completely */
  data?: T;
  /** Lexing errors (unrecognized characters, etc.) */
  lexErrors: ILexingError[];
  /** Parsing errors (unexpected tokens, missing fields, etc.) */
  parseErrors: IRecognitionException[];
}
