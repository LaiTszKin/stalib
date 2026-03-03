import { describe, expect, it, vi } from "vitest";
import { SearchClient } from "../src/search-client";
import type { SearchProvider } from "../src/types";

describe("SearchClient (integration)", () => {
  it("provider 成功回傳時會完成正規化與向量排序", async () => {
    const provider: SearchProvider = {
      search: vi.fn().mockResolvedValue([
        {
          title: "Vector basics",
          snippet: "vector math introduction",
          url: "https://example.com/vector",
        },
        {
          title: "Browser API search",
          snippet: "browser fetch with vector matching",
          url: "https://example.com/browser-search",
        },
        {
          title: "Invalid without url",
          snippet: "should be filtered",
        },
      ]),
    };

    const client = new SearchClient({ provider });
    const result = await client.search("browser vector", { limit: 5 });

    expect(provider.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: "browser vector", limit: 5 }),
    );
    expect(result.metadata.total).toBe(2);
    expect(result.items[0].url).toBe("https://example.com/browser-search");
    expect(result.items[0].matchedTerms).toContain("browser");
    expect(result.items[0].score).toBeGreaterThanOrEqual(result.items[1].score);
  });

  it("provider 回傳空集合時保持 total=0", async () => {
    const provider: SearchProvider = {
      search: vi.fn().mockResolvedValue([]),
    };

    const client = new SearchClient({ provider });
    const result = await client.search("browser", { limit: 3 });

    expect(result.metadata.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("會過濾非 http/https 的 URL，避免注入惡意連結", async () => {
    const provider: SearchProvider = {
      search: vi.fn().mockResolvedValue([
        {
          title: "bad js",
          snippet: "payload",
          url: "javascript:alert(1)",
        },
        {
          title: "bad data",
          snippet: "payload",
          url: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
        },
        {
          title: "safe",
          snippet: "safe payload",
          url: "https://example.com/safe",
        },
      ]),
    };

    const client = new SearchClient({ provider });
    const result = await client.search("payload", { limit: 5 });

    expect(result.metadata.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].url).toBe("https://example.com/safe");
  });

  it("provider 拋出 TypeError 時映射成 NETWORK_ERROR", async () => {
    const provider: SearchProvider = {
      search: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    };

    const client = new SearchClient({ provider });
    await expect(client.search("browser")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });
});
