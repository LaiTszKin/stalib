import { describe, expect, it } from "vitest";
import { rankDocumentsByQuery } from "../src/vector/tfidf";

describe("rankDocumentsByQuery (unit)", () => {
  it("會依相似度由高到低排序", () => {
    const results = rankDocumentsByQuery("browser vector", [
      "vector math",
      "browser vector search",
      "static typing",
    ]);

    expect(results[0].index).toBe(1);
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[0].matchedTerms).toEqual(["browser", "vector"]);
  });

  it("分數相同時維持原始索引順序", () => {
    const results = rankDocumentsByQuery("alpha", [
      "alpha beta",
      "alpha gamma",
      "delta",
    ]);

    expect(results[0].index).toBe(0);
    expect(results[1].index).toBe(1);
  });
});
