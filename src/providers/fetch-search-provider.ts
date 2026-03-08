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
  allowPrivateNetwork?: boolean;
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
    this.endpoint = validateEndpoint(
      options.endpoint,
      options.allowPrivateNetwork ?? false,
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

function validateEndpoint(
  endpoint: string,
  allowPrivateNetwork: boolean,
): string {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(endpoint);
  } catch {
    throw new SearchClientError(
      "INVALID_OPTIONS",
      "endpoint 必須是合法的 URL。",
    );
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new SearchClientError(
      "INVALID_OPTIONS",
      "endpoint 僅支援 http 或 https 協定。",
    );
  }

  if (!allowPrivateNetwork && isPrivateOrLocalHost(parsedUrl.hostname)) {
    throw new SearchClientError(
      "INVALID_OPTIONS",
      "endpoint 不可指向本機或私有網路位址；若為受控環境請設定 allowPrivateNetwork=true。",
    );
  }

  return parsedUrl.toString();
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  return isPrivateIpv4(normalized) || isPrivateIpv6(normalized);
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) {
    return false;
  }

  const octets = parts.map((part) => Number(part));
  if (
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  const [first, second] = octets;
  if (first === 10) return true;
  if (first === 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 100 && second >= 64 && second <= 127) return true;
  if (first === 0) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!normalized.includes(":")) {
    return false;
  }

  if (normalized === "::1" || normalized === "::") {
    return true;
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  if (isIpv6LinkLocalAddress(normalized)) {
    return true;
  }

  const mappedIpv4 = extractMappedIpv4Address(normalized);
  if (mappedIpv4 && isPrivateIpv4(mappedIpv4)) {
    return true;
  }

  return false;
}

function isIpv6LinkLocalAddress(hostname: string): boolean {
  const firstHextet = hostname.split(":")[0];
  if (!firstHextet) {
    return false;
  }

  const parsed = Number.parseInt(firstHextet, 16);
  if (!Number.isFinite(parsed)) {
    return false;
  }

  return parsed >= 0xfe80 && parsed <= 0xfebf;
}

function extractMappedIpv4Address(hostname: string): string | null {
  const dottedMatched = hostname.match(
    /(?:^|:)ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i,
  );
  if (dottedMatched) {
    return dottedMatched[1];
  }

  const hexMatched = hostname.match(/(?:^|:)ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!hexMatched) {
    return null;
  }

  const upper = Number.parseInt(hexMatched[1], 16);
  const lower = Number.parseInt(hexMatched[2], 16);
  if (!Number.isFinite(upper) || !Number.isFinite(lower)) {
    return null;
  }

  const octets = [
    (upper >> 8) & 0xff,
    upper & 0xff,
    (lower >> 8) & 0xff,
    lower & 0xff,
  ];
  return octets.join(".");
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
