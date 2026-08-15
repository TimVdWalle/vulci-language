// Phase 16

import { StringValue } from "./runtime-value.js";

const graphemeCache = new WeakMap<StringValue, readonly string[]>();

export function createStringValue(value: string): StringValue {
  const result: StringValue = { type: "String", value };
  graphemeCache.set(result, segmentGraphemes(value));
  return result;
}

export function graphemesOf(value: StringValue): readonly string[] {
  const cached = graphemeCache.get(value);
  if (cached !== undefined) return cached;

  const graphemes = segmentGraphemes(value.value);
  graphemeCache.set(value, graphemes);
  return graphemes;
}

function segmentGraphemes(value: string): readonly string[] {
  const segmenter = new Intl.Segmenter(undefined, {
    granularity: "grapheme",
  });
  return Array.from(segmenter.segment(value), (segment) => segment.segment);
}
