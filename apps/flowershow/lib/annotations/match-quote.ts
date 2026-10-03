/**
 * Vendored from the Hypothesis client, src/annotator/anchoring/match-quote.ts
 * at commit c2d2e73a99501a0f7443438c8d24cece704a4c41.
 * https://github.com/hypothesis/client
 * Changes: `textMatchScore` is exported; two type-only fixes (a non-null
 * assertion and `?? null`) for this repo's noUncheckedIndexedAccess.
 *
 * Copyright (c) 2013-2019 Hypothes.is Project and contributors
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
import approxSearch from 'approx-string-match';
import type { Match as StringMatch } from 'approx-string-match';

type Match = {
  /** Start offset of match in text */
  start: number;
  /** End offset of match in text */
  end: number;

  /**
   * Score for the match between 0 and 1.0, where 1.0 indicates a perfect match
   * for the quote and context.
   */
  score: number;
};

/**
 * Find the best approximate matches for `str` in `text` allowing up to
 * `maxErrors` errors.
 */
function search(text: string, str: string, maxErrors: number): StringMatch[] {
  // Do a fast search for exact matches. The `approx-string-match` library
  // doesn't currently incorporate this optimization itself.
  let matchPos = 0;
  const exactMatches: StringMatch[] = [];
  while (matchPos !== -1) {
    matchPos = text.indexOf(str, matchPos);
    if (matchPos !== -1) {
      exactMatches.push({
        start: matchPos,
        end: matchPos + str.length,
        errors: 0,
      });
      matchPos += 1;
    }
  }
  if (exactMatches.length > 0) {
    return exactMatches;
  }

  // If there are no exact matches, do a more expensive search for matches
  // with errors.
  return approxSearch(text, str, maxErrors);
}

/**
 * Compute a score between 0 and 1.0 for the similarity between `text` and `str`.
 */
export function textMatchScore(text: string, str: string) {
  // `search` will return no matches if either the text or pattern is empty,
  // otherwise it will return at least one match if the max allowed error count
  // is at least `str.length`.
  if (str.length === 0 || text.length === 0) {
    return 0.0;
  }

  const matches = search(text, str, str.length);

  // prettier-ignore
  return 1 - (matches[0]!.errors / str.length);
}

type Context = {
  /** Expected text before the quote */
  prefix?: string;
  /** Expected text after the quote */
  suffix?: string;
  /** Expected offset of match within text */
  hint?: number;
};

/**
 * Find the best approximate match for `quote` in `text`.
 *
 * @param text - Document text to search
 * @param quote - String to find within `text`
 * @param context - Context in which the quote originally appeared. This is
 *        used to choose the best match.
 * @return `null` if no match exceeding the minimum quality threshold was found.
 */
export function matchQuote(
  text: string,
  quote: string,
  context: Context = {},
): Match | null {
  if (quote.length === 0) {
    return null;
  }

  // Choose the maximum number of errors to allow for the initial search.
  // This choice involves a tradeoff between:
  //
  //  - Recall (proportion of "good" matches found)
  //  - Precision (proportion of matches found which are "good")
  //  - Cost of the initial search and of processing the candidate matches [1]
  //
  // [1] Specifically, the expected-time complexity of the initial search is
  //     `O((maxErrors / 32) * text.length)`. See `approx-string-match` docs.
  const maxErrors = Math.min(256, quote.length / 2);

  // Find the closest matches for `quote` in `text` based on edit distance.
  const matches = search(text, quote, maxErrors);

  if (matches.length === 0) {
    return null;
  }

  /**
   * Compute a score between 0 and 1.0 for a match candidate.
   */
  const scoreMatch = (match: StringMatch) => {
    const quoteWeight = 50; // Similarity of matched text to quote.
    const prefixWeight = 20; // Similarity of text before matched text to `context.prefix`.
    const suffixWeight = 20; // Similarity of text after matched text to `context.suffix`.
    const posWeight = 2; // Proximity to expected location. Used as a tie-breaker.

    const quoteScore = 1 - match.errors / quote.length;

    const prefixScore = context.prefix
      ? textMatchScore(
          text.slice(
            Math.max(0, match.start - context.prefix.length),
            match.start,
          ),
          context.prefix,
        )
      : 1.0;
    const suffixScore = context.suffix
      ? textMatchScore(
          text.slice(match.end, match.end + context.suffix.length),
          context.suffix,
        )
      : 1.0;

    let posScore = 1.0;
    if (typeof context.hint === 'number') {
      const offset = Math.abs(match.start - context.hint);
      posScore = 1.0 - offset / text.length;
    }

    const rawScore =
      quoteWeight * quoteScore +
      prefixWeight * prefixScore +
      suffixWeight * suffixScore +
      posWeight * posScore;
    const maxScore = quoteWeight + prefixWeight + suffixWeight + posWeight;
    const normalizedScore = rawScore / maxScore;

    return normalizedScore;
  };

  // Rank matches based on similarity of actual and expected surrounding text
  // and actual/expected offset in the document text.
  const scoredMatches = matches.map(m => ({
    start: m.start,
    end: m.end,
    score: scoreMatch(m),
  }));

  // Choose match with the highest score.
  scoredMatches.sort((a, b) => b.score - a.score);
  return scoredMatches[0] ?? null;
}
