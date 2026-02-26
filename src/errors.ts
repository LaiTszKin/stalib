export type SearchErrorCode =
  | "INVALID_QUERY"
  | "INVALID_OPTIONS"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "ABORTED"
  | "AUTH_REQUIRED"
  | "PROVIDER_ERROR";

export interface SearchClientErrorOptions {
  cause?: unknown;
  status?: number;
}

export class SearchClientError extends Error {
  readonly code: SearchErrorCode;
  readonly status?: number;

  constructor(
    code: SearchErrorCode,
    message: string,
    options: SearchClientErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "SearchClientError";
    this.code = code;
    this.status = options.status;
  }
}

export function isSearchClientError(
  error: unknown,
): error is SearchClientError {
  return error instanceof SearchClientError;
}
