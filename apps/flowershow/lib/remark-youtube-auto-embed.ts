import { visit } from 'unist-util-visit';

/**
 * Extract a YouTube embed iframe URL from a YouTube watch/share URL.
 * Returns null if the URL is not a recognised YouTube URL.
 */
function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/,
  );
  if (!match) return null;
  const videoId = match[1];

  // Parse start time from the original URL query string
  const qIndex = url.indexOf('?');
  const urlParams = new URLSearchParams(
    qIndex >= 0 ? url.slice(qIndex + 1) : '',
  );
  const start = urlParams.get('t');
  if (start) {
    // Remove 's' suffix if present and convert to number
    const startSeconds = parseInt(start.replace(/s$/, ''), 10);
    urlParams.delete('t');
    if (!isNaN(startSeconds)) {
      urlParams.set('start', startSeconds.toString());
    }
  }
  // Remove the 'v' param – it belongs in the embed path, not the query string
  urlParams.delete('v');

  const qs = urlParams.toString();
  return `https://www.youtube.com/embed/${videoId}${qs ? `?${qs}` : ''}`;
}

function makeYouTubeIframeNode(iframeUrl: string) {
  return {
    type: 'element',
    data: {
      hProperties: {
        style: 'position:relative;padding-bottom:56.25%',
      },
    },
    children: [
      {
        type: 'element',
        tagName: 'iframe',
        data: {
          hName: 'iframe',
          hProperties: {
            style: 'position:absolute;top:0;left:0;width:100%;height:100%',
            src: iframeUrl,
            allowfullscreen: true,
            frameborder: '0',
            allow:
              'accelerometer autoplay clipboard-write encrypted-media gyroscope picture-in-picture',
          },
        },
        children: [],
      },
    ],
  };
}

function remarkYouTubeEmbed() {
  return (tree: any) => {
    visit(tree, 'paragraph', (node) => {
      if (node.children.length !== 1) return;
      const child = node.children[0];

      // Bare link on its own line: [text](youtube-url)
      if (child.type === 'link' && typeof child.url === 'string') {
        const iframeUrl = getYouTubeEmbedUrl(child.url);
        if (!iframeUrl) return;
        Object.assign(node, { ...node, ...makeYouTubeIframeNode(iframeUrl) });
        return;
      }

      // Obsidian-style embed: ![alt](youtube-url)
      if (child.type === 'image' && typeof child.url === 'string') {
        const iframeUrl = getYouTubeEmbedUrl(child.url);
        if (!iframeUrl) return;
        Object.assign(node, { ...node, ...makeYouTubeIframeNode(iframeUrl) });
      }
    });
  };
}

export default remarkYouTubeEmbed;
