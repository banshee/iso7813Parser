#!/usr/bin/env node

import { createInterface } from "node:readline";
import { parseSwipe } from "./index.js";

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const swipe = parseSwipe(trimmed);
    const output: Record<string, any> = {};
    let hasError = false;

    if (swipe.track1) {
      output.track1 = {};
      if (swipe.track1.data) {
        output.track1.data = swipe.track1.data;
      }
      if (swipe.track1.lexErrors.length > 0) {
        hasError = true;
        output.track1.lexErrors = swipe.track1.lexErrors.map((e) => ({
          message: e.message,
          offset: e.offset,
          length: e.length,
        }));
      }
      if (swipe.track1.parseErrors.length > 0) {
        hasError = true;
        output.track1.parseErrors = swipe.track1.parseErrors.map((e) => ({
          message: e.message,
        }));
      }
    }

    if (swipe.track2) {
      output.track2 = {};
      if (swipe.track2.data) {
        output.track2.data = swipe.track2.data;
      }
      if (swipe.track2.lexErrors.length > 0) {
        hasError = true;
        output.track2.lexErrors = swipe.track2.lexErrors.map((e) => ({
          message: e.message,
          offset: e.offset,
          length: e.length,
        }));
      }
      if (swipe.track2.parseErrors.length > 0) {
        hasError = true;
        output.track2.parseErrors = swipe.track2.parseErrors.map((e) => ({
          message: e.message,
        }));
      }
    }

    console.log(JSON.stringify(output, null, 2));
    if (hasError) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
  }
});
