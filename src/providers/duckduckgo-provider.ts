import type { SearchProviderResultItem } from "../types";
import { FetchSearchProvider } from "./fetch-search-provider";

const DEFAULT_DUCKDUCKGO_ENDPOINT =
  "https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1";

interface DuckDuckGoTopic {
  FirstURL?: string;
  Text?: string;
  Topics?: DuckDuckGoTopic[];
}

interface DuckDuckGoPayload {
  AbstractURL?: string;
  AbstractText?: string;
  RelatedTopics?: DuckDuckGoTopic[];
}

export function createDuckDuckGoProvider(
  endpoint = DEFAULT_DUCKDUCKGO_ENDPOINT,
): FetchSearchProvider {
  return new FetchSearchProvider({
    endpoint,
    queryParam: "q",
    limitParam: null,
    source: "duckduckgo",
    mapResponse: (payload, request) =>
      mapDuckDuckGoPayload(payload).slice(0, request.limit),
  });
}

function mapDuckDuckGoPayload(payload: unknown): SearchProviderResultItem[] {
  if (!isDuckDuckGoPayload(payload)) {
    return [];
  }

  const items: SearchProviderResultItem[] = [];

  if (payload.AbstractText && payload.AbstractURL) {
    items.push({
      title: deriveTitle(payload.AbstractText),
      snippet: payload.AbstractText,
      url: payload.AbstractURL,
      source: "duckduckgo",
    });
  }

  if (Array.isArray(payload.RelatedTopics)) {
    items.push(...flattenRelatedTopics(payload.RelatedTopics));
  }

  return items;
}

function flattenRelatedTopics(
  topics: DuckDuckGoTopic[],
): SearchProviderResultItem[] {
  const results: SearchProviderResultItem[] = [];

  for (const topic of topics) {
    if (Array.isArray(topic.Topics)) {
      results.push(...flattenRelatedTopics(topic.Topics));
      continue;
    }

    if (!topic.Text || !topic.FirstURL) {
      continue;
    }

    results.push({
      title: deriveTitle(topic.Text),
      snippet: topic.Text,
      url: topic.FirstURL,
      source: "duckduckgo",
    });
  }

  return results;
}

function deriveTitle(text: string): string {
  const separatorIndex = text.indexOf(" - ");
  if (separatorIndex === -1) {
    return text;
  }

  return text.slice(0, separatorIndex);
}

function isDuckDuckGoPayload(payload: unknown): payload is DuckDuckGoPayload {
  return typeof payload === "object" && payload !== null;
}
