export interface SearchProviderRequest {
  query: string;
  limit: number;
  signal?: AbortSignal;
}

export interface SearchProviderResultItem {
  id?: string;
  title?: string;
  snippet?: string;
  url?: string;
  source?: string;
  [key: string]: unknown;
}

export interface SearchProvider {
  search(request: SearchProviderRequest): Promise<SearchProviderResultItem[]>;
}

export interface SearchOptions {
  limit?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface SearchClientOptions {
  provider: SearchProvider;
  defaultLimit?: number;
  defaultTimeoutMs?: number;
}

export interface NormalizedSearchRecord {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
  raw: SearchProviderResultItem;
  originalIndex: number;
}

export interface RankedSearchItem {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
  score: number;
  matchedTerms: string[];
  raw: SearchProviderResultItem;
}

export interface SearchResponse {
  query: string;
  metadata: {
    total: number;
    tookMs: number;
  };
  items: RankedSearchItem[];
}
