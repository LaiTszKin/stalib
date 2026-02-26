import fc from "fast-check";
import { describe, it } from "vitest";
import { rankDocumentsByQuery } from "../src/vector/tfidf";

describe("rankDocumentsByQuery (property)", () => {
  it("任意輸入都保證分數落在 0 到 1", () => {
    const tokenArbitrary = fc.constantFrom(
      "browser",
      "vector",
      "search",
      "library",
      "api",
      "match",
    );
    const sentenceArbitrary = fc
      .array(tokenArbitrary, { minLength: 1, maxLength: 6 })
      .map((tokens) => tokens.join(" "));

    fc.assert(
      fc.property(
        sentenceArbitrary,
        fc.array(sentenceArbitrary, { minLength: 1, maxLength: 8 }),
        (query, documents) => {
          const results = rankDocumentsByQuery(query, documents);
          return results.every(
            (result) =>
              Number.isFinite(result.score) &&
              result.score >= 0 &&
              result.score <= 1,
          );
        },
      ),
    );
  });

  it("同一輸入可重現相同排序", () => {
    const tokenArbitrary = fc.constantFrom(
      "browser",
      "vector",
      "search",
      "library",
      "api",
      "match",
    );
    const sentenceArbitrary = fc
      .array(tokenArbitrary, { minLength: 1, maxLength: 6 })
      .map((tokens) => tokens.join(" "));

    fc.assert(
      fc.property(
        sentenceArbitrary,
        fc.array(sentenceArbitrary, { minLength: 1, maxLength: 8 }),
        (query, documents) => {
          const first = rankDocumentsByQuery(query, documents);
          const second = rankDocumentsByQuery(query, documents);

          return JSON.stringify(first) === JSON.stringify(second);
        },
      ),
    );
  });
});
