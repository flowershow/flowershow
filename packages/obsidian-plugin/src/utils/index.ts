function hex(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
  return s;
}

async function digest(
  algo: "SHA-1" | "SHA-256",
  data: Uint8Array,
): Promise<string> {
  const ab = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
  const d = await crypto.subtle.digest(algo, ab);
  return hex(d);
}

/**
 * Calculate SHA-1 hash of file content
 * @param content - File content as ArrayBuffer or Uint8Array
 * @returns SHA-1 hash as hex string
 */
export async function calculateFileSha(
  content: ArrayBuffer | Uint8Array,
): Promise<string> {
  // Convert to Uint8Array for digest function
  const data =
    content instanceof ArrayBuffer ? new Uint8Array(content) : content;

  return digest("SHA-1", data);
}

/**
 * Calculate SHA-1 hash of text content
 * @param text - Text content as string
 * @returns SHA-1 hash as hex string
 */
export async function calculateTextSha(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  return digest("SHA-1", data);
}

export class FlowershowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlowershowError";
  }
}

export function isPlainTextExtension(ext: string) {
  return ["md", "mdx", "json", "yaml", "yml", "css"].includes(ext);
}
export type GitAlgo = "SHA-1" | "SHA-256";

export function createSiteNotice(
  message: string,
  siteUrl?: string,
): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.append(document.createTextNode(`✅ ${message} `));

  if (siteUrl) {
    const a = document.createElement("a");
    a.href = siteUrl;
    a.textContent = "View site →";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    frag.append(a);
  }

  return frag;
}
