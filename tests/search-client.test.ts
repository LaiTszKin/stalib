import { describe, expect, it, vi } from "vitest";
import { SearchClient } from "../src/search-client";
import type { SearchProvider } from "../src/types";

function createAbortAwareProvider(): SearchProvider {
  return {
    search: vi.fn(({ signal }): Promise<never> => {
      return new Promise((_, reject) => {
        if (signal?.aborted) {
          reject(createAbortError());
          return;
        }

        signal?.addEventListener(
          "abort",
          () => {
            reject(createAbortError());
          },
          { once: true },
        );
      });
    }),
  };
}

function createAbortError(): Error {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}

describe("SearchClient (unit)", () => {
  it("keyword 空白時直接回傳 INVALID_QUERY 並且不呼叫 provider", async () => {
    const provider: SearchProvider = {
      search: vi.fn(),
    };
    const client = new SearchClient({ provider });

    await expect(client.search("   ")).rejects.toMatchObject({
      code: "INVALID_QUERY",
    });
    expect(provider.search).not.toHaveBeenCalled();
  });

  it("timeout 會回傳 TIMEOUT", async () => {
    const provider = createAbortAwareProvider();
    const client = new SearchClient({ provider, defaultTimeoutMs: 5 });

    await expect(client.search("browser api")).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });

  it("外部 signal 取消時會回傳 ABORTED", async () => {
    const provider = createAbortAwareProvider();
    const client = new SearchClient({ provider });
    const controller = new AbortController();

    const request = client.search("browser api", { signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toMatchObject({ code: "ABORTED" });
  });

  it("limit 或 timeoutMs 非正整數時回傳 INVALID_OPTIONS", async () => {
    const provider: SearchProvider = {
      search: vi.fn().mockResolvedValue([]),
    };
    const client = new SearchClient({ provider });

    await expect(client.search("browser", { limit: 0 })).rejects.toMatchObject({
      code: "INVALID_OPTIONS",
    });
    await expect(
      client.search("browser", { timeoutMs: -1 }),
    ).rejects.toMatchObject({
      code: "INVALID_OPTIONS",
    });
    expect(provider.search).not.toHaveBeenCalled();
  });

  it("provider 回傳非陣列時回傳 PROVIDER_ERROR", async () => {
    const provider: SearchProvider = {
      search: vi.fn().mockResolvedValue(null as unknown as never[]),
    };
    const client = new SearchClient({ provider });

    await expect(client.search("browser")).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });
});
