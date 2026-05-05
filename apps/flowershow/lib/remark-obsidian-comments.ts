import type { Root } from 'mdast';

interface MarkerInfo {
  nodeRef: any;
  posInNode: number;
}

function collectMarkers(node: any, markers: MarkerInfo[]): void {
  if (node.type === 'text') {
    const text = node.value as string;
    for (let i = 0; i < text.length - 1; i++) {
      if (text[i] === '%' && text[i + 1] === '%') {
        markers.push({ nodeRef: node, posInNode: i });
        i++;
      }
    }
  } else if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectMarkers(child, markers);
    }
  }
}

function processTextNode(
  text: string,
  inComment: boolean,
  unmatchedPos: number,
): { cleaned: string; inComment: boolean } {
  let result = '';
  let i = 0;
  let currentInComment = inComment;

  while (i < text.length) {
    if (text[i] === '%' && text[i + 1] === '%') {
      if (i === unmatchedPos) {
        result += '%%';
        i += 2;
      } else {
        currentInComment = !currentInComment;
        i += 2;
      }
    } else if (!currentInComment) {
      result += text[i];
      i++;
    } else {
      i++;
    }
  }

  return { cleaned: result, inComment: currentInComment };
}

function processChildren(
  parent: { children: any[] },
  state: { inComment: boolean },
  unmatchedNode: any,
  unmatchedPos: number,
): void {
  let i = 0;
  while (i < parent.children.length) {
    const node = parent.children[i];

    if (node.type === 'text') {
      const pos = node === unmatchedNode ? unmatchedPos : -1;
      const { cleaned, inComment } = processTextNode(
        node.value,
        state.inComment,
        pos,
      );
      state.inComment = inComment;

      if (cleaned === '') {
        parent.children.splice(i, 1);
        continue;
      }
      node.value = cleaned;
    } else if (Array.isArray(node.children)) {
      processChildren(node, state, unmatchedNode, unmatchedPos);
      if (node.children.length === 0) {
        parent.children.splice(i, 1);
        continue;
      }
    } else if (state.inComment) {
      parent.children.splice(i, 1);
      continue;
    }

    i++;
  }
}

function remarkObsidianComments() {
  return (tree: Root) => {
    const markers: MarkerInfo[] = [];
    collectMarkers(tree, markers);

    if (markers.length === 0) return;

    const isOdd = markers.length % 2 !== 0;
    const unmatchedMarker = isOdd ? markers[markers.length - 1] : null;

    const state = { inComment: false };
    processChildren(
      tree as any,
      state,
      unmatchedMarker?.nodeRef ?? null,
      unmatchedMarker?.posInNode ?? -1,
    );
  };
}

export default remarkObsidianComments;
