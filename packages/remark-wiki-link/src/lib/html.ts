import {
  defaultUrlResolver,
  findMatchingFilePath,
  isImageFile,
  isMarkdownFile,
  isPdfFile,
  isAudioFile,
  isVideoFile,
} from "../utils";
import type { CompileData, Handle, HtmlExtension } from "micromark-util-types";
import { Options } from "./remarkWikiLink";
import { WIKI_LINK_TARGET_PATTERN } from "../utils/const";

// Micromark HtmlExtension
// https://github.com/micromark/micromark#htmlextension
function html(opts: Options = {}): HtmlExtension {
  const format = opts.format || "shortestPossible";
  const files = opts.files || [];
  const caseInsensitive = opts.caseInsensitive ?? true;
  const className = opts.className || "internal";
  const newClassName = opts.newClassName || "new";
  const urlResolver = opts.urlResolver || defaultUrlResolver;

  function top(stack: CompileData["wikiLinkStack"]) {
    return stack[stack.length - 1];
  }

  const enterWikiLink: Handle = function (this, token) {
    let stack = this.getData("wikiLinkStack");
    if (!stack) this.setData("wikiLinkStack", (stack = []));

    stack.push({
      target: undefined,
      alias: undefined,
    });
  };

  const exitWikiLinkTarget: Handle = function (this, token) {
    const target = this.sliceSerialize(token);
    const current = top(this.getData("wikiLinkStack"));
    current.target = target;
  };

  const exitWikiLinkAlias: Handle = function (this, token) {
    const alias = this.sliceSerialize(token);
    const current = top(this.getData("wikiLinkStack"));
    current.alias = alias;
  };

  const exitWikiLink: Handle = function (this, token) {
    const node = top(this.getData("wikiLinkStack"));

    const { target, alias } = node;

    if (!target) {
      throw new Error("Target is required");
    }

    const [, targetPath = "", heading = ""] =
      target.match(WIKI_LINK_TARGET_PATTERN) || [];

    // /path/to/file.md
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

    // Apply urlResolver to the matched file path (or original if no match)
    // For embeds, don't apply urlResolver
    const url = urlResolver({
      filePath: matchingFilePath ?? targetPath,
      heading,
      isEmbed: token.type === "embed",
    });

    const resolvedAttr = matchingFilePath
      ? ` data-resolved-file-path="${matchingFilePath}"`
      : "";

    if (token.type !== "embed") {
      const text = alias ?? target;
      this.tag(`<a href="${url}" class="${classNames}"${resolvedAttr}>`);
      this.raw(text);
      this.tag("</a>");
      return;
    } else {
      const [, name = "", extension = ""] =
        target.match(/^(.+?)(?:\.([^.]+))?$/) ?? [];

      if (isMarkdownFile(extension)) {
        this.tag(`<a href="${url}" class="${classNames} transclusion"${resolvedAttr}>`);
        this.raw(name);
        this.tag("</a>");
        return;
      }

      if (isImageFile(extension)) {
        let imgAttributes = `src="${url}" alt="${name}" class="${classNames}"`;

        const [, width, height] = alias?.match(/^(\d+)(?:x(\d+))?$/) ?? [];
        if (width) {
          imgAttributes += ` width="${width}"`;
          if (height) {
            imgAttributes += ` height="${height}"`;
          }
          // Add inline styles for better rendering control
          const styleWidth = `width: ${width}px`;
          const styleHeight = height ? `; height: ${height}px` : "";
          imgAttributes += ` style="${styleWidth}${styleHeight}"`;
        }

        this.tag(`<img ${imgAttributes}${resolvedAttr} />`);
        return;
      }

      if (isPdfFile(extension)) {
        this.tag(
          `<iframe width="100%" src="${url}" title="${name}" class="${classNames}"${resolvedAttr} />`,
        );
        return;
      }

      if (isVideoFile(extension)) {
        let videoAttributes = `src="${url}" class="${classNames}" controls`;

        const [, width, height] = alias?.match(/^(\d+)(?:x(\d+))?$/) ?? [];
        if (width) {
          videoAttributes += ` width="${width}"`;
          if (height) {
            videoAttributes += ` height="${height}"`;
          }
          // Add inline styles for better rendering control
          const styleWidth = `width: ${width}px`;
          const styleHeight = height ? `; height: ${height}px` : "";
          videoAttributes += ` style="${styleWidth}${styleHeight}"`;
        }

        this.tag(`<video ${videoAttributes}${resolvedAttr}>`);
        this.raw(`Your browser does not support the video tag.`);
        this.tag(`</video>`);
        return;
      }

      if (isAudioFile(extension)) {
        this.tag(`<audio src="${url}" class="${classNames}"${resolvedAttr} controls>`);
        this.raw(`Your browser does not support the audio tag.`);
        this.tag(`</audio>`);
        return;
      }

      // Unsupported file formats
      this.tag(`<a href="${url}" class="${classNames} unsupported"${resolvedAttr}>`);
      this.raw(target);
      this.tag("</a>");
    }
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

export { html };
