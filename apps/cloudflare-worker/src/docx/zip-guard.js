import { unzipSync } from 'fflate';

/** Limits checked against the zip's central directory, before inflating. */
export const DOCX_LIMITS = {
  maxDocumentXmlBytes: 20 * 1024 * 1024,
  maxTotalUncompressedBytes: 60 * 1024 * 1024,
  maxEntries: 500,
  maxImages: 200,
};

/** A .docx we refuse to convert. `message` is shown to the user. */
export class DocxRejectedError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'DocxRejectedError';
  }
}

const NOT_DOCX = 'This file is not a valid Word (.docx) document.';
const TOO_LARGE = 'This Word document is too large to convert.';

/**
 * Throw a DocxRejectedError unless `bytes` is a zip holding
 * `word/document.xml` within DOCX_LIMITS. Reads only the central directory:
 * nothing is inflated.
 *
 * @param {Uint8Array} bytes
 */
export function checkDocxZip(bytes) {
  // 22 bytes is the smallest possible zip (an empty end-of-central-directory).
  if (!(bytes instanceof Uint8Array) || bytes.length < 22) {
    throw new DocxRejectedError(NOT_DOCX);
  }

  const entries = [];
  try {
    // The filter sees each central-directory entry; returning false means
    // no entry is ever decompressed.
    unzipSync(bytes, {
      filter: (file) => {
        entries.push(file);
        return false;
      },
    });
  } catch (cause) {
    throw new DocxRejectedError(NOT_DOCX, { cause });
  }

  const documentXml = entries.find((e) => e.name === 'word/document.xml');
  if (!documentXml) throw new DocxRejectedError(NOT_DOCX);

  if (entries.length > DOCX_LIMITS.maxEntries) {
    throw new DocxRejectedError(
      'This Word document has too many parts to convert.',
    );
  }
  const images = entries.filter((e) => e.name.startsWith('word/media/'));
  if (images.length > DOCX_LIMITS.maxImages) {
    throw new DocxRejectedError(
      `This Word document has too many images to convert (the limit is ${DOCX_LIMITS.maxImages}).`,
    );
  }
  if (documentXml.originalSize > DOCX_LIMITS.maxDocumentXmlBytes) {
    throw new DocxRejectedError(TOO_LARGE);
  }
  const total = entries.reduce((sum, e) => sum + e.originalSize, 0);
  if (total > DOCX_LIMITS.maxTotalUncompressedBytes) {
    throw new DocxRejectedError(TOO_LARGE);
  }
}
