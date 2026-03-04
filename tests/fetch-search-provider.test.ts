import { afterEach, describe, expect, it, vi } from "vitest";
import { FetchSearchProvider } from "../src/providers/fetch-search-provider";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FetchSearchProvider", () => {
  it("endpoint 非法時回傳 INVALID_OPTIONS", async () => {
    const provider = new FetchSearchProvider({
      endpoint: "not-a-url",
    });

    await expect(
      provider.search({ query: "browser", limit: 2 }),
    ).rejects.toMatchObject({
      code: "INVALID_OPTIONS",
    });
  });

  it("會以 fetch 發送查詢並套用預設 source", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ results: [{ title: "A", url: "https://a.test" }] }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new FetchSearchProvider({
      endpoint: "https://example.com/search",
      source: "example",
    });

    const controller = new AbortController();
    const result = await provider.search({
      query: "browser",
      limit: 4,
      signal: controller.signal,
    });

    const [requestInfo, requestInit] = fetchMock.mock.calls[0];
    const requestUrl =
      typeof requestInfo === "string"
        ? requestInfo
        : requestInfo instanceof URL
          ? requestInfo.toString()
          : requestInfo.url;
    const url = new URL(requestUrl);

    expect(url.searchParams.get("q")).toBe("browser");
    expect(url.searchParams.get("limit")).toBe("4");
    expect((requestInit as RequestInit).signal).toBe(controller.signal);
    expect(result).toEqual([
      {
        title: "A",
        url: "https://a.test",
        source: "example",
      },
    ]);
  });

  it("401/403 會回傳 AUTH_REQUIRED", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({}, 401));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new FetchSearchProvider({
      endpoint: "https://example.com/search",
    });

    await expect(
      provider.search({ query: "browser", limit: 5 }),
    ).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
      status: 401,
    });
  });

  it("回傳格式不符時會回傳 PROVIDER_ERROR", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ foo: "bar" }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new FetchSearchProvider({
      endpoint: "https://example.com/search",
    });

    await expect(
      provider.search({ query: "browser", limit: 5 }),
    ).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("可用自訂 mapResponse 轉換回傳資料", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        docs: [{ heading: "Browser", link: "https://b.test" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new FetchSearchProvider({
      endpoint: "https://example.com/search",
      mapResponse: (payload) => {
        const docs =
          (payload as { docs?: Array<{ heading: string; link: string }> })
            .docs ?? [];

        return docs.map((doc) => ({
          title: doc.heading,
          url: doc.link,
          snippet: "custom mapping",
        }));
      },
    });

    const result = await provider.search({ query: "browser", limit: 2 });
    expect(result[0]).toMatchObject({
      title: "Browser",
      url: "https://b.test",
    });
  });

  it("mapResponse 回傳非陣列時會回傳 PROVIDER_ERROR", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new FetchSearchProvider({
      endpoint: "https://example.com/search",
      mapResponse: () => null as unknown as never[],
    });

    await expect(
      provider.search({ query: "browser", limit: 2 }),
    ).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("回傳無法解析的 JSON 時會回傳 PROVIDER_ERROR", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("not-json", { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const provider = new FetchSearchProvider({
      endpoint: "https://example.com/search",
    });

    await expect(
      provider.search({ query: "browser", limit: 2 }),
    ).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("mapResponse 含有非物件項目時會回傳 PROVIDER_ERROR", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new FetchSearchProvider({
      endpoint: "https://example.com/search",
      mapResponse: () => [null as unknown as never],
    });

    await expect(
      provider.search({ query: "browser", limit: 2 }),
    ).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });
});
