import { slug } from 'github-slugger';

// File type definitions
export type MarkdownFile = `.md` | `.mdx`;

export type ImageFile =
  | `avif`
  | `bmp`
  | `gif`
  | `jpeg`
  | `jpg`
  | `png`
  | `svg`
  | `webp`;

export type AudioFile = `flac` | `m4a` | `mp3` | `ogg` | `wav` | `3gp`;

export type VideoFile = `mkv` | `mov` | `mp4` | `ogv` | `webm`;

export type PdfFile = `pdf`;

export type SupportedFileType =
  | MarkdownFile
  | ImageFile
  | AudioFile
  | VideoFile
  | PdfFile;

export function isMarkdownFile(extension: string): extension is MarkdownFile {
  return extension === 'md' || extension === 'mdx' || extension === '';
}

export function isImageFile(extension: string): extension is ImageFile {
  return ['avif', 'bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'].includes(
    extension,
  );
}

export function isAudioFile(extension: string): extension is AudioFile {
  return ['flac', 'm4a', 'mp3', 'ogg', 'wav', '3gp'].includes(extension);
}

export function isVideoFile(extension: string): extension is VideoFile {
  return ['mkv', 'mov', 'mp4', 'ogv', 'webm'].includes(extension);
}

export function isPdfFile(extension: string): extension is PdfFile {
  return extension === 'pdf';
}

export function isSupportedFileType(
  extension: string,
): extension is SupportedFileType {
  return (
    isMarkdownFile(extension) ||
    isImageFile(extension) ||
    isAudioFile(extension) ||
    isVideoFile(extension) ||
    isPdfFile(extension)
  );
}

const YOUTUBE_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;

export function isYouTubeUrl(value: string): boolean {
  return YOUTUBE_PATTERN.test(value);
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(YOUTUBE_PATTERN);
  if (!match) return null;
  const videoId = match[1];

  const qIndex = url.indexOf('?');
  const urlParams = new URLSearchParams(
    qIndex >= 0 ? url.slice(qIndex + 1) : '',
  );
  const start = urlParams.get('t');
  if (start) {
    const startSeconds = parseInt(start.replace(/s$/, ''), 10);
    urlParams.delete('t');
    if (!isNaN(startSeconds)) {
      urlParams.set('start', startSeconds.toString());
    }
  }
  urlParams.delete('v');

  const qs = urlParams.toString();
  return `https://www.youtube.com/embed/${videoId}${qs ? `?${qs}` : ''}`;
}

export const defaultUrlResolver = ({
  filePath,
  heading,
  isEmbed = false,
}: {
  filePath: string;
  heading?: string;
  isEmbed?: boolean;
}): string => {
  if (isEmbed) {
    return filePath;
  }
  const pathWithNoExtension = filePath.replace(/\.(mdx?|md)/, '');

  // Remove trailing /index and /README
  const normalizedPath = pathWithNoExtension.replace(/\/?(index|README)$/, '');

  // Generate heading id if present
  const headingId = heading ? `#${slug(heading)}` : '';

  // Special case: only heading anchor
  if (headingId && !normalizedPath) {
    return headingId;
  }

  return (normalizedPath || '/') + headingId;
};

export const findMatchingFilePath = ({
  path,
  files,
  format,
  caseInsensitive = true,
}: {
  path: string; // wiki-link target (e.g. some/file in [[some/file#Some heading|Alias]])
  files: string[]; // file paths with  (with or without extensions)
  format?: 'regular' | 'shortestPossible';
  caseInsensitive?: boolean; // whether to match case-insensitively (default: true)
}): string | undefined => {
  if (path.length === 0) {
    return undefined;
  }

  const normalizedPath = caseInsensitive ? path.toLowerCase() : path;

  if (format === 'regular') {
    return files.find((file) => {
      const fileWithoutExt = file.replace(/\.(mdx?|md)$/, '');
      const normalizedFile = caseInsensitive
        ? fileWithoutExt.toLowerCase()
        : fileWithoutExt;
      return normalizedFile === normalizedPath;
    });
  }

  // Find all files that end with the path (without extension for markdown files)
  const matchingFiles = files.filter((file) => {
    const fileWithoutExt = file.replace(/\.(mdx?|md)$/, '');
    const normalizedFile = caseInsensitive
      ? fileWithoutExt.toLowerCase()
      : fileWithoutExt;
    return normalizedFile.endsWith(normalizedPath);
  });

  if (matchingFiles.length === 0) {
    return undefined;
  }

  // Sort by path length (shortest first) to prioritize files closer to root
  // This ensures [[test]] resolves to /test.md instead of /blog/test.md
  return matchingFiles.sort((a, b) => a.length - b.length)[0];
};
