# Project Overview

## What stalib is

`stalib` is a browser-oriented search utility library that combines:

1. Keyword-based web search through pluggable providers
2. Local vector ranking based on TF-IDF and cosine similarity

The project is designed for client-side applications that need predictable ranking without relying on server-side vector infrastructure.

## Primary goals

- Keep the search orchestration API simple and type-safe.
- Make providers easy to swap or customize.
- Ensure output ranking is deterministic for the same input.
- Provide explicit and actionable error types.

## Non-goals (current scope)

- Built-in credential management for commercial search APIs
- Server-side storage or vector database integration
- UI components
- Semantic embedding models

## Current module map

- `src/search-client.ts`: main search orchestration
- `src/providers/`: provider implementations
- `src/vector/tfidf.ts`: tokenization and ranking engine
- `src/errors.ts`: typed error model
- `tests/`: unit, integration, and property-based tests

## Stability expectations

- API is early-stage (`0.x`), so minor breaking changes are still possible.
- Core ranking and error behavior is test-covered and intended to remain stable.
