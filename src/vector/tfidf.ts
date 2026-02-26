export interface RankedVectorResult {
  index: number;
  score: number;
  matchedTerms: string[];
}

export type Tokenizer = (text: string) => string[];

const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(TOKEN_PATTERN) ?? [];
}

export function rankDocumentsByQuery(
  query: string,
  documents: string[],
  tokenizer: Tokenizer = tokenize,
): RankedVectorResult[] {
  const queryTokens = tokenizer(query);
  const documentTokens = documents.map((doc) => tokenizer(doc));

  if (documents.length === 0) {
    return [];
  }

  const vocabulary = buildVocabulary(queryTokens, documentTokens);
  const idf = computeIdf(vocabulary, documentTokens);
  const queryVector = createTfidfVector(queryTokens, vocabulary, idf);
  const queryNorm = vectorNorm(queryVector);

  return documentTokens
    .map((tokens, index) => {
      const documentVector = createTfidfVector(tokens, vocabulary, idf);
      const rawScore =
        queryNorm === 0
          ? 0
          : cosineSimilarity(queryVector, queryNorm, documentVector);
      const score = Number.isFinite(rawScore) ? clamp(rawScore, 0, 1) : 0;
      const tokenSet = new Set(tokens);
      const matchedTerms = uniqueTerms(
        queryTokens.filter((term) => tokenSet.has(term)),
      );

      return {
        index,
        score,
        matchedTerms,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    });
}

function uniqueTerms(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }

  return result;
}

function buildVocabulary(
  queryTokens: string[],
  documentTokens: string[][],
): string[] {
  const vocabulary = new Set<string>();

  for (const term of queryTokens) {
    vocabulary.add(term);
  }

  for (const tokens of documentTokens) {
    for (const term of tokens) {
      vocabulary.add(term);
    }
  }

  return Array.from(vocabulary);
}

function computeIdf(
  vocabulary: string[],
  documents: string[][],
): Map<string, number> {
  const docCount = documents.length;
  const idf = new Map<string, number>();

  for (const term of vocabulary) {
    let docFrequency = 0;

    for (const tokens of documents) {
      if (tokens.includes(term)) {
        docFrequency += 1;
      }
    }

    // Smooth IDF to avoid division-by-zero and keep vector weights stable.
    const value = Math.log((1 + docCount) / (1 + docFrequency)) + 1;
    idf.set(term, value);
  }

  return idf;
}

function createTfidfVector(
  tokens: string[],
  vocabulary: string[],
  idf: Map<string, number>,
): number[] {
  const tokenCount = tokens.length;
  const frequencies = new Map<string, number>();

  for (const term of tokens) {
    frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
  }

  return vocabulary.map((term) => {
    const tf = tokenCount === 0 ? 0 : (frequencies.get(term) ?? 0) / tokenCount;
    const idfValue = idf.get(term) ?? 0;

    return tf * idfValue;
  });
}

function cosineSimilarity(
  left: number[],
  leftNorm: number,
  right: number[],
): number {
  const rightNorm = vectorNorm(right);
  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  let dot = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
  }

  return dot / (leftNorm * rightNorm);
}

function vectorNorm(vector: number[]): number {
  let sum = 0;
  for (const value of vector) {
    sum += value * value;
  }

  return Math.sqrt(sum);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
