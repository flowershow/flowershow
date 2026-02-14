declare module "mdast-util-wiki-link";

import "mdast";

declare module "mdast" {
  interface RootContentMap {
    wikiLink: WikiLink;
    embed: Embed;
  }

  interface WikiLink extends Literal {
    type: "wikiLink";
    data: WikiLinkData;
  }

  interface Embed extends Literal {
    type: "embed";
    data: EmbedData;
  }

  interface WikiLinkData {
    path?: string;
    alias?: string;
    existing?: boolean;
    // https://github.com/syntax-tree/mdast-util-to-hast?tab=readme-ov-file#fields-on-nodes
    hName?: string;
    hProperties?: { [key: string]: any };
    hChildren?: Array<{ value: string; type: string }>;
  }

  type EmbedData = WikiLinkData;
}

import "micromark-util-types";

declare module "micromark-util-types" {
  interface TokenTypeMap {
    embed: TokenType;
    embedMarker: TokenType; // The embed opening
    embedCandidate: TokenType;
    wikiLinkCandidate: TokenType;
    wikiLinkOpenSequence: TokenType;
    wikiLink: TokenType;
    wikiLinkMarker: TokenType; // The opening and closing brackets
    wikiLinkData: TokenType; // The data between the brackets
    wikiLinkTarget: TokenType; // The target of the link (the part before the alias divider)
    wikiLinkAliasMarker: TokenType; // The alias divider
    wikiLinkAlias: TokenType; // The alias of the link (the part after the alias divider)
  }

  interface CompileData {
    wikiLinkStack: WikiLinkData[];
  }

  interface WikiLinkData {
    target?: string;
    alias?: string;
  }
}

import "mdast-util-to-markdown";

declare module "mdast-util-to-markdown" {
  interface ConstructNameMap {
    wikiLink: "wikiLink";
    embed: "embed";
  }
}
