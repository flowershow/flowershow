import type {
  Extension as FromMarkdownExtension,
  Handle,
} from "mdast-util-from-markdown";
import {
  defaultUrlResolver,
  findMatchingFilePath,
  isImageFile,
  isMarkdownFile,
  isPdfFile,
  isAudioFile,
  isVideoFile,
} from "../utils";
import { Embed, WikiLink } from "mdast";
import { Options } from "./remarkWikiLink";
import { WIKI_LINK_TARGET_PATTERN } from "../utils/const";

function fromMarkdown(opts: Options = {}): FromMarkdownExtension {
  const format = opts.format || "shortestPossible";
  const files = opts.files || [];
  const permalinks = opts.permalinks || {};
  const caseInsensitive = opts.caseInsensitive ?? true;
  const className = opts.className || "internal";
  const newClassName = opts.newClassName || "new";
  const urlResolver = opts.urlResolver || defaultUrlResolver;

  function top(stack: any): WikiLink | Embed {
    return stack[stack.length - 1];
  }

  const enterWikiLink: Handle = function (this, token) {
    this.enter(
      {
        type: token.type === "embed" ? "embed" : "wikiLink",
        value: "",
        data: {},
      },
      token,
    );
  };

  const exitWikiLinkTarget: Handle = function (this, token) {
    const target = this.sliceSerialize(token);
    const current = top(this.stack);
    current.value = target;
  };

  const exitWikiLinkAlias: Handle = function (this, token) {
    const alias = this.sliceSerialize(token);
    const current = top(this.stack);
    current.data.alias = alias;
  };

  const exitWikiLink: Handle = function (this, token) {
    const wikiLink = top(this.stack);

    const {
      value,
      data: { alias },
    } = wikiLink;

    if (!value) {
      throw new Error("Empty node value");
    }

    const [, targetPath = "", heading = ""] =
      value.match(WIKI_LINK_TARGET_PATTERN) || [];

    const matchingFilePath = findMatchingFilePath({
      path: targetPath,
      files,
      format,
      caseInsensitive,
    });

    const existing = Boolean(
      matchingFilePath ?? (targetPath.length === 0 && heading),
    );

    let classNames = className;
    if (!existing) {
      classNames += " " + newClassName;
    }

    wikiLink.data.existing = existing;

    // Use permalink if available, otherwise apply urlResolver
    let url: string;
    if (matchingFilePath && permalinks[matchingFilePath]) {
      // Use the permalink directly, optionally adding heading
      const permalink = permalinks[matchingFilePath];
      url = heading ? `${permalink}#${heading}` : permalink;
    } else {
      // Apply urlResolver to the matched file path (or original if no match)
      // For embeds, don't apply urlResolver
      url = urlResolver({
        filePath: matchingFilePath ?? targetPath,
        heading,
        isEmbed: token.type === "embed",
      });
    }

    wikiLink.data.path = url;

    if (token.type !== "embed") {
      const text = alias ?? value;
      wikiLink.data.hName = "a";
      wikiLink.data.hProperties = {
        href: url,
        className: classNames,
      };
      wikiLink.data.hChildren = [{ type: "text", value: text }];
    } else {
      const [, name = "", extension = ""] =
        value.match(/^(.+?)(?:\.([^.]+))?$/) ?? [];

      if (isMarkdownFile(extension)) {
        wikiLink.data.hName = "a";
        wikiLink.data.hProperties = {
          className: classNames + " transclusion",
          src: url,
        };
        wikiLink.data.hChildren = [{ type: "text", value: name }];
      } else if (isImageFile(extension)) {
        const [match, width, height] = alias?.match(/^(\d+)(?:x(\d+))?$/) ?? [];
        if (match) {
          wikiLink.data.alias = undefined;
        }

        const hProperties: any = {
          src: url,
          alt: name,
          className: classNames,
          "data-fs-max-width": width ?? undefined,
          "data-fs-max-height": height ?? undefined,
        };

        wikiLink.data.hName = "img";
        wikiLink.data.hProperties = hProperties;
      } else if (isPdfFile(extension)) {
        wikiLink.data.hName = "iframe";
        wikiLink.data.hProperties = {
          width: "100%",
          src: url,
          title: name,
          className: classNames,
        };
      } else if (isVideoFile(extension)) {
        const [match, width, height] = alias?.match(/^(\d+)(?:x(\d+))?$/) ?? [];
        if (match) {
          wikiLink.data.alias = undefined;
        }

        const hProperties: any = {
          src: url,
          className: classNames,
          controls: true,
          "data-fs-max-width": width ?? undefined,
          "data-fs-max-height": height ?? undefined,
        };

        wikiLink.data.hName = "video";
        wikiLink.data.hProperties = hProperties;
        wikiLink.data.hChildren = [
          {
            type: "text",
            value: "Your browser does not support the video tag.",
          },
        ];
      } else if (isAudioFile(extension)) {
        wikiLink.data.hName = "audio";
        wikiLink.data.hProperties = {
          src: url,
          className: classNames,
          controls: true,
        };
        wikiLink.data.hChildren = [
          {
            type: "text",
            value: "Your browser does not support the audio tag.",
          },
        ];
      } else {
        // Unsupported file formats
        wikiLink.data.hName = "a";
        wikiLink.data.hProperties = {
          href: url,
          className: classNames + " unsupported",
        };
        wikiLink.data.hChildren = [{ type: "text", value }];
      }
    }

    if (matchingFilePath) {
      wikiLink.data.hProperties = {
        ...wikiLink.data.hProperties,
        "data-fs-resolved-file-path": matchingFilePath,
      };
    }

    this.exit(token);
  };

  return {
    enter: {
      wikiLink: enterWikiLink,
      embed: enterWikiLink,
    },
    exit: {
      wikiLinkTarget: exitWikiLinkTarget,
      wikiLinkAlias: exitWikiLinkAlias,
      wikiLink: exitWikiLink,
      embed: exitWikiLink,
    },
  };
}

export { fromMarkdown };
