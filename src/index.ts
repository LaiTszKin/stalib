export { SearchClient } from "./search-client";
export { SearchClientError } from "./errors";
export { FetchSearchProvider } from "./providers/fetch-search-provider";
export { createDuckDuckGoProvider } from "./providers/duckduckgo-provider";
export { rankDocumentsByQuery, tokenize } from "./vector/tfidf";

export type { FetchSearchProviderOptions } from "./providers/fetch-search-provider";
export type { SearchClientErrorOptions, SearchErrorCode } from "./errors";
export type {
  NormalizedSearchRecord,
  RankedSearchItem,
  SearchClientOptions,
  SearchOptions,
  SearchProvider,
  SearchProviderRequest,
  SearchProviderResultItem,
  SearchResponse,
} from "./types";
