import { codes } from "micromark-util-symbol";
import { markdownLineEnding } from "micromark-util-character";
import type {
  Code,
  Extension as SyntaxExtension,
  Tokenizer,
  State,
} from "micromark-util-types";

export interface SyntaxOptions {
  aliasDivider?: string;
}

export function syntax(options?: SyntaxOptions): SyntaxExtension {
  const aliasDivider = options?.aliasDivider ?? "|";
  const aliasMarker = aliasDivider.charCodeAt(0);

  const startBracket = codes.leftSquareBracket; // '['
  const endBracket = codes.rightSquareBracket; // ']'
  const bang = codes.exclamationMark; // '!'

  /**
   * Tokenizer for wiki links: [[target|alias]]
   */
  const tokenizeWikiLink: Tokenizer = function (effects, ok, nok) {
    let openCount = 0;
    let closeCount = 0;
    let hasTargetChar = false;
    let hasAliasChar = false;

    return start as State;

    function start(code: Code): any {
      if (code !== startBracket) return nok(code);

      effects.enter("wikiLinkOpenSequence");
      openCount = 0;
      return openSeq(code);
    }

    function openSeq(code: Code): any {
      if (code === startBracket) {
        effects.consume(code);
        openCount++;
        return openSeq;
      }

      if (openCount < 2) {
        return nok(code);
      }

      effects.exit("wikiLinkOpenSequence");
      effects.enter("wikiLink");
      effects.enter("wikiLinkData");
      effects.enter("wikiLinkTarget");
      return inTarget(code);
    }

    function inTarget(code: Code): any {
      if (code === null || code === codes.eof || markdownLineEnding(code)) {
        return nok(code);
      }

      if (code === aliasMarker) {
        if (!hasTargetChar) return nok(code);
        effects.exit("wikiLinkTarget");
        effects.enter("wikiLinkAliasMarker");
        effects.consume(code);
        effects.exit("wikiLinkAliasMarker");
        effects.enter("wikiLinkAlias");
        return inAlias;
      }

      if (code === endBracket) {
        if (!hasTargetChar) return nok(code);
        effects.exit("wikiLinkTarget");
        effects.exit("wikiLinkData");
        effects.enter("wikiLinkMarker");
        closeCount = 0;
        return closeSeq(code);
      }

      hasTargetChar = true;
      effects.consume(code);
      return inTarget;
    }

    function inAlias(code: Code): any {
      if (code === null || code === codes.eof || markdownLineEnding(code)) {
        return nok(code);
      }

      if (code === endBracket) {
        if (!hasAliasChar) return nok(code);
        effects.exit("wikiLinkAlias");
        effects.exit("wikiLinkData");
        effects.enter("wikiLinkMarker");
        closeCount = 0;
        return closeSeq(code);
      }

      hasAliasChar = true;
      effects.consume(code);
      return inAlias;
    }

    function closeSeq(code: Code): any {
      if (code === endBracket) {
        effects.consume(code);
        closeCount++;
        if (closeCount === 2) {
          effects.exit("wikiLinkMarker");
          effects.exit("wikiLink");
          return ok;
        }
        return closeSeq;
      }
      return nok(code);
    }
  };

  /**
   * Tokenizer for embeds: ![[target|alias]]
   */
  const tokenizeEmbed: Tokenizer = function (effects, ok, nok) {
    let openCount = 0;
    let closeCount = 0;
    let hasTargetChar = false;
    let hasAliasChar = false;

    return start as State;

    function start(code: Code): any {
      if (code !== bang) return nok(code);

      effects.enter("embed");
      effects.enter("embedMarker");
      effects.consume(code);
      effects.exit("embedMarker");

      return expectFirstBracket;
    }

    function expectFirstBracket(code: Code): any {
      if (code !== startBracket) {
        return nok(code);
      }
      effects.enter("wikiLinkOpenSequence");
      openCount = 0;
      return openSeq(code);
    }

    function openSeq(code: Code): any {
      if (code === startBracket) {
        effects.consume(code);
        openCount++;
        return openSeq;
      }

      if (openCount < 2) {
        return nok(code);
      }

      effects.exit("wikiLinkOpenSequence");
      effects.enter("wikiLinkData");
      effects.enter("wikiLinkTarget");
      return inTarget(code);
    }

    function inTarget(code: Code): any {
      if (code === null || code === codes.eof || markdownLineEnding(code)) {
        return nok(code);
      }

      if (code === aliasMarker) {
        if (!hasTargetChar) return nok(code);
        effects.exit("wikiLinkTarget");
        effects.enter("wikiLinkAliasMarker");
        effects.consume(code);
        effects.exit("wikiLinkAliasMarker");
        effects.enter("wikiLinkAlias");
        return inAlias;
      }

      if (code === endBracket) {
        if (!hasTargetChar) return nok(code);
        effects.exit("wikiLinkTarget");
        effects.exit("wikiLinkData");
        effects.enter("embedMarker"); // we reuse a marker type specific to embed
        closeCount = 0;
        return closeSeq(code);
      }

      hasTargetChar = true;
      effects.consume(code);
      return inTarget;
    }

    function inAlias(code: Code): any {
      if (code === null || code === codes.eof || markdownLineEnding(code)) {
        return nok(code);
      }

      if (code === endBracket) {
        if (!hasAliasChar) return nok(code);
        effects.exit("wikiLinkAlias");
        effects.exit("wikiLinkData");
        effects.enter("embedMarker");
        closeCount = 0;
        return closeSeq(code);
      }

      hasAliasChar = true;
      effects.consume(code);
      return inAlias;
    }

    function closeSeq(code: Code): any {
      if (code === endBracket) {
        effects.consume(code);
        closeCount++;
        if (closeCount === 2) {
          effects.exit("embedMarker");
          effects.exit("embed");
          return ok;
        }
        return closeSeq;
      }
      return nok(code);
    }
  };

  return {
    text: {
      [codes.leftSquareBracket]: { tokenize: tokenizeWikiLink },
      [codes.exclamationMark]: { tokenize: tokenizeEmbed },
    },
  };
}
