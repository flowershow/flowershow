import type {
  Options as ToMarkdownExtension,
  Handle as ToMarkdownHandle,
  Unsafe,
} from 'mdast-util-to-markdown';

interface ToMarkdownOptions {
  aliasDivider?: string;
}

function toMarkdown(opts: ToMarkdownOptions = {}): ToMarkdownExtension {
  const aliasDivider = opts.aliasDivider ?? '|';

  const unsafe: Unsafe[] = [
    {
      character: '[',
      inConstruct: ['phrasing', 'label', 'reference'],
    },
    {
      character: ']',
      inConstruct: ['label', 'reference'],
    },
  ];

  const handler: ToMarkdownHandle = (node, _parent, state) => {
    const exit = state.enter('wikiLink');

    const nodeValue = state.safe(node.value, { before: '[', after: ']' });
    const nodeAlias = node.data.alias
      ? state.safe(node.data.alias, { before: '[', after: ']' })
      : nodeValue;

    let value: string;
    if (nodeAlias !== nodeValue) {
      value = `[[${nodeValue}${aliasDivider}${nodeAlias}]]`;
    } else {
      value = `[[${nodeValue}]]`;
    }

    exit();

    return value;
  };

  const embedHandler: ToMarkdownHandle = (node, _parent, state) => {
    const exit = state.enter('embed');

    const nodeValue = state.safe(node.value, { before: '[', after: ']' });

    // Check if there are dimensions (width/height) in hProperties
    const width = node.data.hProperties?.['data-fs-width'];
    const height = node.data.hProperties?.['data-fs-height'];

    let aliasOrDimensions = '';
    if (width || height) {
      // Reconstruct dimensions string
      aliasOrDimensions = width && height ? `${width}x${height}` : width || '';
    } else if (node.data.alias) {
      // Use regular alias if no dimensions
      aliasOrDimensions = state.safe(node.data.alias, {
        before: '[',
        after: ']',
      });
    }

    const value = aliasOrDimensions
      ? `![[${nodeValue}${aliasDivider}${aliasOrDimensions}]]`
      : `![[${nodeValue}]]`;

    exit();

    return value;
  };

  return {
    unsafe,
    handlers: {
      wikiLink: handler,
      embed: embedHandler,
    },
  };
}

export { toMarkdown };
