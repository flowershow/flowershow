import { visit } from "unist-util-visit";

function remarkEmbed() {
  return (tree: any) => {
    visit(tree, "paragraph", (node) => {
      if (node.children.length !== 1) return;
      const child = node.children[0];
      if (child.type !== "link" || typeof child.url !== "string") return;

      // Extract YouTube video ID
      const match = child.url.match(
        /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/,
      );
      if (!match) return;
      const videoId = match[1];

      // Parse start time
      const urlParams = new URLSearchParams(child.url.split("?").pop());
      const start = urlParams.get("t");
      if (start) {
        // Remove 's' suffix if present and convert to number
        const startSeconds = parseInt(start.replace(/s$/, ""));
        urlParams.delete("t");
        urlParams.set("start", startSeconds.toString());
      }

      const iframeUrl = `https://www.youtube.com/embed/${videoId}${
        urlParams ? `?${urlParams.toString()}` : ""
      }`;

      Object.assign(node, {
        ...node,
        type: "element",
        data: {
          hProperties: {
            style: "position:relative;padding-bottom:56.25%",
          },
        },
        children: [
          {
            type: "element",
            tagName: "iframe",
            data: {
              hName: "iframe",
              hProperties: {
                style: "position:absolute;top:0;left:0;width:100%;height:100%",
                src: iframeUrl,
                allowfullscreen: true,
                frameborder: "0",
                allow:
                  "accelerometer autoplay clipboard-write encrypted-media gyroscope picture-in-picture",
              },
            },
            children: [],
          },
        ],
      });
    });
  };
}

export default remarkEmbed;
