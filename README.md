# stalib

A browser-first TypeScript web search library for AI workflows.

`stalib` is primarily built for AI web search scenarios. It takes a keyword, fetches results from a pluggable search provider, performs lightweight vector chunking over returned text, and re-ranks the chunks with local TF-IDF vector matching.

## Why this project

- Support AI-first web search and retrieval flows in browser environments.
- Provide a clean provider abstraction for different search backends.
- Use vector chunking and deterministic ranking for stable AI context selection.

## Features

- Browser API first (`fetch`, `AbortSignal`)
- Pluggable provider interface (`SearchProvider`)
- Local ranking with TF-IDF + cosine similarity
- Stable tie-break behavior for deterministic ordering
- Typed error model (`SearchClientError`)
- CI pipeline with precheck + test split + npm publish gate

## Installation

### Install the published package (after CI publish)

```bash
npm install stalib
```

Pin a specific version if needed:

```bash
npm install stalib@0.1.0
```

## Quick Start

### Custom provider

```ts
import { SearchClient, type SearchProvider } from "stalib";

const provider: SearchProvider = {
  async search({ query, limit, signal }) {
    const response = await fetch(
      `https://example.com/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { signal },
    );

    const data = (await response.json()) as {
      results: Array<{ title: string; snippet: string; url: string }>;
    };

    return data.results;
  },
};

const client = new SearchClient({
  provider,
  defaultLimit: 5,
  defaultTimeoutMs: 5000,
});

const result = await client.search("browser vector search");
console.log(result.items);
```

### Built-in DuckDuckGo provider

```ts
import { SearchClient, createDuckDuckGoProvider } from "stalib";

const client = new SearchClient({
  provider: createDuckDuckGoProvider(),
  defaultLimit: 5,
});

const result = await client.search("browser fetch api");
console.log(result.items);
```

## Documentation

- Project overview: `docs/PROJECT_OVERVIEW.md`
- Architecture: `docs/ARCHITECTURE.md`
- Development and release workflow: `docs/DEVELOPMENT.md`
- Feature planning/spec docs: `docs/plans/`

## API Summary

### `new SearchClient(options)`

- `provider` (required): implements `SearchProvider`
- `defaultLimit` (optional, default `10`)
- `defaultTimeoutMs` (optional)

### `client.search(keyword, options?)`

- `keyword`: non-empty string
- `options.limit`: positive integer
- `options.timeoutMs`: positive integer
- `options.signal`: `AbortSignal`

Response shape:

```ts
{
  query: string;
  metadata: {
    total: number;
    tookMs: number;
  }
  items: Array<{
    id: string;
    title: string;
    snippet: string;
    url: string;
    source: string;
    score: number;
    matchedTerms: string[];
  }>;
}
```

## Error Codes

`SearchClientError.code`:

- `INVALID_QUERY`
- `INVALID_OPTIONS`
- `NETWORK_ERROR`
- `TIMEOUT`
- `ABORTED`
- `AUTH_REQUIRED`
- `PROVIDER_ERROR`

## License

MIT
