import { SearchClientError, isSearchClientError } from "./errors";
import type {
  NormalizedSearchRecord,
  RankedSearchItem,
  SearchClientOptions,
  SearchOptions,
  SearchProviderResultItem,
  SearchResponse,
} from "./types";
import { rankDocumentsByQuery } from "./vector/tfidf";

const DEFAULT_LIMIT = 10;
const MAX_PROVIDER_RESULTS = 1000;
const MAX_QUERY_LENGTH = 2048;
const MAX_TITLE_LENGTH = 4096;
const MAX_SNIPPET_LENGTH = 16_384;
const MAX_URL_LENGTH = 2048;
const MAX_SOURCE_LENGTH = 128;
const MAX_ID_LENGTH = 256;

interface AbortContext {
  signal?: AbortSignal;
  isTimeout: () => boolean;
  cleanup: () => void;
}

export class SearchClient {
  private readonly provider: SearchClientOptions["provider"];
  private readonly defaultLimit: number;
  private readonly defaultTimeoutMs?: number;

  constructor(options: SearchClientOptions) {
    this.provider = options.provider;
    this.defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
    this.defaultTimeoutMs = options.defaultTimeoutMs;
  }

  async search(
    keyword: string,
    options: SearchOptions = {},
  ): Promise<SearchResponse> {
    if (typeof keyword !== "string") {
      throw new SearchClientError("INVALID_QUERY", "keyword 必須是字串。");
    }

    const query = keyword.trim();
    if (!query) {
      throw new SearchClientError("INVALID_QUERY", "keyword 不能是空白字串。");
    }
    if (query.length > MAX_QUERY_LENGTH) {
      throw new SearchClientError(
        "INVALID_QUERY",
        `keyword 長度不可超過 ${MAX_QUERY_LENGTH} 字元。`,
      );
    }

    const limit = parsePositiveInteger(
      options.limit ?? this.defaultLimit,
      "limit",
    );
    const timeoutMs =
      options.timeoutMs === undefined
        ? this.defaultTimeoutMs
        : parsePositiveInteger(options.timeoutMs, "timeoutMs");

    const startedAt = Date.now();
    const abortContext = createAbortContext(options.signal, timeoutMs);

    try {
      const rawResults = await this.provider.search({
        query,
        limit,
        signal: abortContext.signal,
      });
      if (!Array.isArray(rawResults)) {
        throw new SearchClientError(
          "PROVIDER_ERROR",
          "搜尋供應商回傳格式不正確。",
        );
      }
      if (rawResults.length > MAX_PROVIDER_RESULTS) {
        throw new SearchClientError(
          "PROVIDER_ERROR",
          `搜尋供應商回傳資料筆數超過安全上限（${MAX_PROVIDER_RESULTS}）。`,
        );
      }

      const normalizedResults = normalizeProviderResults(rawResults);
      const rankedItems = rankResults(query, normalizedResults).slice(0, limit);

      return {
        query,
        metadata: {
          total: normalizedResults.length,
          tookMs: Date.now() - startedAt,
        },
        items: rankedItems,
      };
    } catch (error) {
      throw mapToSearchError(error, abortContext.isTimeout());
    } finally {
      abortContext.cleanup();
    }
  }
}

export function normalizeProviderResults(
  rawResults: SearchProviderResultItem[],
): NormalizedSearchRecord[] {
  return rawResults
    .map((entry, index) => {
      const title = sanitizeText(entry.title, MAX_TITLE_LENGTH);
      const url = sanitizeHttpUrl(entry.url);
      if (!title || !url) {
        return null;
      }

      const snippet = sanitizeText(entry.snippet, MAX_SNIPPET_LENGTH) ?? "";
      const source = sanitizeText(entry.source, MAX_SOURCE_LENGTH) ?? "unknown";
      const id = sanitizeText(entry.id, MAX_ID_LENGTH) ?? `${index}:${url}`;

      return {
        id,
        title,
        snippet,
        url,
        source,
        raw: entry,
        originalIndex: index,
      };
    })
    .filter((value): value is NormalizedSearchRecord => value !== null);
}

function rankResults(
  query: string,
  records: NormalizedSearchRecord[],
): RankedSearchItem[] {
  const ranking = rankDocumentsByQuery(
    query,
    records.map((record) => `${record.title} ${record.snippet}`.trim()),
  );

  return ranking
    .map((rank) => {
      const record = records[rank.index];

      return {
        id: record.id,
        title: record.title,
        snippet: record.snippet,
        url: record.url,
        source: record.source,
        score: rank.score,
        matchedTerms: rank.matchedTerms,
        raw: record.raw,
        originalIndex: record.originalIndex,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.originalIndex - right.originalIndex;
    })
    .map(({ originalIndex: _originalIndex, ...value }) => value);
}

function sanitizeText(value: unknown, maxLength?: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (maxLength !== undefined && trimmed.length > maxLength) {
    return undefined;
  }

  return trimmed;
}

function sanitizeHttpUrl(value: unknown): string | undefined {
  const rawUrl = sanitizeText(value, MAX_URL_LENGTH);
  if (!rawUrl) {
    return undefined;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return undefined;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return undefined;
  }

  return parsedUrl.toString();
}

function parsePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new SearchClientError("INVALID_OPTIONS", `${field} 必須是正整數。`);
  }

  return value;
}

function createAbortContext(
  signal?: AbortSignal,
  timeoutMs?: number,
): AbortContext {
  if (!signal && timeoutMs === undefined) {
    return {
      signal: undefined,
      isTimeout: () => false,
      cleanup: () => {},
    };
  }

  const controller = new AbortController();
  let timedOut = false;

  const abortFromParent = () => {
    controller.abort(signal?.reason);
  };

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener("abort", abortFromParent, { once: true });
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs !== undefined) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort(createTimeoutReason());
    }, timeoutMs);
  }

  return {
    signal: controller.signal,
    isTimeout: () => timedOut,
    cleanup: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (signal) {
        signal.removeEventListener("abort", abortFromParent);
      }
    },
  };
}

function mapToSearchError(
  error: unknown,
  timeoutTriggered: boolean,
): SearchClientError {
  if (isSearchClientError(error)) {
    return error;
  }

  if (isAbortError(error)) {
    if (timeoutTriggered) {
      return new SearchClientError("TIMEOUT", "搜尋請求逾時。", {
        cause: error,
      });
    }

    return new SearchClientError("ABORTED", "搜尋請求已取消。", {
      cause: error,
    });
  }

  if (error instanceof TypeError) {
    return new SearchClientError("NETWORK_ERROR", "網路請求失敗。", {
      cause: error,
    });
  }

  return new SearchClientError("PROVIDER_ERROR", "搜尋供應商發生未預期錯誤。", {
    cause: error,
  });
}

function isAbortError(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "AbortError";
  }

  return error instanceof Error && error.name === "AbortError";
}

function createTimeoutReason(): unknown {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Timeout", "AbortError");
  }

  const timeoutError = new Error("Timeout");
  timeoutError.name = "AbortError";
  return timeoutError;
}
