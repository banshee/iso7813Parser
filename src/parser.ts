import { CstParser } from "chevrotain";
import {
  T1StartSentinel,
  T1FormatCode,
  T1FieldSeparator,
  T1EndSentinel,
  T1Digits,
  T1AlphanumData,
  T1LRC,
  track1Tokens,
  T2StartSentinel,
  T2FieldSeparator,
  T2EndSentinel,
  T2Digits,
  T2LRC,
  track2Tokens,
} from "./tokens.js";

// ═══════════════════════════════════════════════════════════════════════════════
// Track 1 Parser
//
// Grammar:
//   track1 → T1StartSentinel T1FormatCode PAN T1FieldSeparator Name
//            T1FieldSeparator TrailingData? T1EndSentinel T1LRC?
//
//   PAN → T1Digits
//   Name → T1AlphanumData?
//   TrailingData → T1Digits   (contains ED + SC + DD concatenated)
// ═══════════════════════════════════════════════════════════════════════════════

export class Track1Parser extends CstParser {
  constructor() {
    super(track1Tokens);
    this.performSelfAnalysis();
  }

  public track1 = this.RULE("track1", () => {
    this.CONSUME(T1StartSentinel);
    this.CONSUME(T1FormatCode);
    this.SUBRULE(this.pan);
    this.CONSUME(T1FieldSeparator);
    this.SUBRULE(this.name);
    this.CONSUME2(T1FieldSeparator);
    this.OPTION(() => {
      this.SUBRULE(this.trailingData);
    });
    this.CONSUME(T1EndSentinel);
    this.OPTION2(() => {
      this.CONSUME(T1LRC);
    });
  });

  private pan = this.RULE("pan", () => {
    this.CONSUME(T1Digits);
  });

  private name = this.RULE("name", () => {
    this.OPTION(() => {
      this.CONSUME(T1AlphanumData);
    });
  });

  private trailingData = this.RULE("trailingData", () => {
    this.CONSUME(T1Digits);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Track 2 Parser
//
// Grammar:
//   track2 → T2StartSentinel PAN T2FieldSeparator TrailingData?
//            T2EndSentinel T2LRC?
//
//   PAN → T2Digits
//   TrailingData → T2Digits   (contains ED + SC + DD concatenated)
// ═══════════════════════════════════════════════════════════════════════════════

export class Track2Parser extends CstParser {
  constructor() {
    super(track2Tokens);
    this.performSelfAnalysis();
  }

  public track2 = this.RULE("track2", () => {
    this.CONSUME(T2StartSentinel);
    this.SUBRULE(this.pan);
    this.CONSUME(T2FieldSeparator);
    this.OPTION(() => {
      this.SUBRULE(this.trailingData);
    });
    this.CONSUME(T2EndSentinel);
    this.OPTION2(() => {
      this.CONSUME(T2LRC);
    });
  });

  private pan = this.RULE("pan", () => {
    this.CONSUME(T2Digits);
  });

  private trailingData = this.RULE("trailingData", () => {
    this.CONSUME(T2Digits);
  });
}

// Singleton parser instances — Chevrotain parsers are stateless between parses
// and can be reused by setting `parser.input = tokens`.
export const track1Parser = new Track1Parser();
export const track2Parser = new Track2Parser();
