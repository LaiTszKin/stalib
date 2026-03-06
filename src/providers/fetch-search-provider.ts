import { SearchClientError } from "../errors";
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
  allowPrivateNetwork?: boolean;
  headers?: HeadersInit;
  requestInit?: Omit<RequestInit, "method" | "signal">;
  mapResponse?: ResponseMapper;
}

export class FetchSearchProvider implements SearchProvider {
  private readonly endpoint: string;
  private readonly queryParam: string;
  private readonly limitParam: string | null;
  private readonly source?: string;
  private readonly allowPrivateNetwork: boolean;
  private readonly headers?: HeadersInit;
  private readonly requestInit?: Omit<RequestInit, "method" | "signal">;
  private readonly mapResponse: ResponseMapper;

  constructor(options: FetchSearchProviderOptions) {
    this.allowPrivateNetwork = options.allowPrivateNetwork ?? false;
    this.endpoint = sanitizeEndpoint(
      options.endpoint,
      this.allowPrivateNetwork,
    );
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
      throw new SearchClientError(
        "PROVIDER_ERROR",
        "搜尋供應商回傳格式不正確。",
        {
          cause: error,
        },
      );
    }
    const mapped = this.mapResponse(payload, request);
    if (!Array.isArray(mapped)) {
      throw new SearchClientError(
        "PROVIDER_ERROR",
        "搜尋供應商回傳格式不正確。",
        { cause: mapped },
      );
    }

    return mapped.map((item) => {
      if (!isRecord(item)) {
        throw new SearchClientError(
          "PROVIDER_ERROR",
          "搜尋供應商回傳格式不正確。",
          { cause: item },
        );
      }

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

function sanitizeEndpoint(
  endpoint: string,
  allowPrivateNetwork: boolean,
): string {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new SearchClientError("INVALID_OPTIONS", "endpoint 必須是合法 URL。");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SearchClientError(
      "INVALID_OPTIONS",
      "endpoint 僅支援 http/https。",
    );
  }

  if (parsed.username || parsed.password) {
    throw new SearchClientError(
      "INVALID_OPTIONS",
      "endpoint 不可包含帳號密碼資訊。",
    );
  }

  if (!allowPrivateNetwork && isPrivateNetworkHost(parsed.hostname)) {
    throw new SearchClientError(
      "INVALID_OPTIONS",
      "endpoint 不可為本機或私有網段位址。",
    );
  }

  return parsed.toString();
}

function isPrivateNetworkHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "[::1]" ||
    normalized === "::1"
  ) {
    return true;
  }

  const ipv4 = parseIPv4(normalized);
  if (!ipv4) {
    return false;
  }

  const [a, b] = ipv4;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function parseIPv4(hostname: string): number[] | null {
  const segments = hostname.split(".");
  if (segments.length !== 4) {
    return null;
  }

  const values: number[] = [];
  for (const segment of segments) {
    if (!/^\d+$/.test(segment)) {
      return null;
    }

    const value = Number(segment);
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      return null;
    }
    values.push(value);
  }

  return values;
}
