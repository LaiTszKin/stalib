import { SearchClientError, isSearchClientError } from "../errors";
import type {
  SearchProvider,
  SearchProviderRequest,
  SearchProviderResultItem,
} from "../types";

type ResponseMapper = (
  payload: unknown,
  request: SearchProviderRequest,
) => SearchProviderResultItem[];

export interface FetchSearchProviderOptions {
  endpoint: string;
  queryParam?: string;
  limitParam?: string | null;
  source?: string;
  headers?: HeadersInit;
  requestInit?: Omit<RequestInit, "method" | "signal">;
  mapResponse?: ResponseMapper;
}

export class FetchSearchProvider implements SearchProvider {
  private readonly endpoint: string;
  private readonly queryParam: string;
  private readonly limitParam: string | null;
  private readonly source?: string;
  private readonly headers?: HeadersInit;
  private readonly requestInit?: Omit<RequestInit, "method" | "signal">;
  private readonly mapResponse: ResponseMapper;

  constructor(options: FetchSearchProviderOptions) {
    this.endpoint = options.endpoint;
    this.queryParam = options.queryParam ?? "q";
    this.limitParam = options.limitParam ?? "limit";
    this.source = options.source;
    this.headers = options.headers;
    this.requestInit = options.requestInit;
    this.mapResponse = options.mapResponse ?? defaultResponseMapper;
  }

  async search(
    request: SearchProviderRequest,
  ): Promise<SearchProviderResultItem[]> {
    const url = new URL(this.endpoint);
    url.searchParams.set(this.queryParam, request.query);

    if (this.limitParam) {
      url.searchParams.set(this.limitParam, String(request.limit));
    }

    const response = await fetch(url.toString(), {
      ...this.requestInit,
      method: "GET",
      headers: this.headers,
      signal: request.signal,
    });

    if (response.status === 401 || response.status === 403) {
      throw new SearchClientError("AUTH_REQUIRED", "搜尋供應商需要授權資訊。", {
        status: response.status,
      });
    }

    if (!response.ok) {
      throw new SearchClientError(
        "PROVIDER_ERROR",
        `搜尋供應商回傳非預期狀態碼：${response.status}`,
        { status: response.status },
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new SearchClientError("PROVIDER_ERROR", "搜尋供應商回傳格式不正確。", {
        cause: error,
      });
    }

    let mapped: SearchProviderResultItem[];
    try {
      mapped = this.mapResponse(payload, request);
    } catch (error) {
      if (isSearchClientError(error)) {
        throw error;
      }

      throw new SearchClientError("PROVIDER_ERROR", "搜尋供應商回傳格式不正確。", {
        cause: error,
      });
    }

    if (!Array.isArray(mapped)) {
      throw new SearchClientError(
        "PROVIDER_ERROR",
        "搜尋供應商回傳格式不正確。",
        { cause: mapped },
      );
    }

    return mapped.map((item) => {
      if (item.source || !this.source) {
        return item;
      }

      return {
        ...item,
        source: this.source,
      };
    });
  }
}

function defaultResponseMapper(payload: unknown): SearchProviderResultItem[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    throw new SearchClientError("PROVIDER_ERROR", "搜尋供應商回傳格式不正確。");
  }

  const results = payload.results;
  if (Array.isArray(results)) {
    return results.filter(isRecord);
  }

  const items = payload.items;
  if (Array.isArray(items)) {
    return items.filter(isRecord);
  }

  throw new SearchClientError("PROVIDER_ERROR", "搜尋供應商回傳格式不正確。", {
    cause: payload,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
