# Architecture

## High-level flow

1. User calls `SearchClient.search(keyword, options)`.
2. Input is validated (`keyword`, `limit`, `timeoutMs`).
3. Request is forwarded to a `SearchProvider`.
4. Raw records are normalized (`title` and `url` are required).
5. Query/document vectors are computed with TF-IDF.
6. Similarity is computed using cosine similarity.
7. Results are sorted by score with deterministic tie-break.

## Core components

### `SearchClient`

Coordinates validation, provider execution, normalization, ranking, metadata, and error mapping.

### `SearchProvider`

Abstraction layer for upstream search APIs.

- Input: `{ query, limit, signal }`
- Output: `SearchProviderResultItem[]`

### `FetchSearchProvider`

Reusable HTTP provider wrapper based on browser `fetch`.

### `createDuckDuckGoProvider`

Built-in provider factory for DuckDuckGo Instant Answer payload mapping.

### TF-IDF ranking module

`src/vector/tfidf.ts` contains:

- tokenization
- vocabulary and IDF construction
- TF-IDF vector creation
- cosine similarity scoring
- stable ranking output

## Error strategy

All known failures are converted into `SearchClientError` with explicit `code` values:

- `INVALID_QUERY`
- `INVALID_OPTIONS`
- `NETWORK_ERROR`
- `TIMEOUT`
- `ABORTED`
- `AUTH_REQUIRED`
- `PROVIDER_ERROR`

## Testing strategy

- Unit tests: validation, provider behavior, ranking basics
- Integration tests: end-to-end client flow with provider stubs
- Property-based tests: score bounds and deterministic ranking invariants
