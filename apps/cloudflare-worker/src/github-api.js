const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';

// ─── DER / PEM helpers ────────────────────────────────────────────────────────

function derLength(len) {
  if (len < 128) return new Uint8Array([len]);
  if (len < 256) return new Uint8Array([0x81, len]);
  return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
}

function derWrap(tag, content) {
  return new Uint8Array([tag, ...derLength(content.length), ...content]);
}

/**
 * Wrap a PKCS#1 RSA private key DER into PKCS#8 so Web Crypto can import it.
 * GitHub App keys are typically exported as PKCS#1 (-----BEGIN RSA PRIVATE KEY-----).
 *
 * To avoid this conversion, convert the key once with:
 *   openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in key.pem -out key-pkcs8.pem
 */
function pkcs1ToPkcs8Der(pkcs1Der) {
  const rsaOidBytes = new Uint8Array([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01]);
  const oid = derWrap(0x06, rsaOidBytes);
  const algoSeq = derWrap(0x30, new Uint8Array([...oid, 0x05, 0x00]));
  const version = new Uint8Array([0x02, 0x01, 0x00]);
  const octetStr = derWrap(0x04, pkcs1Der);
  return derWrap(0x30, new Uint8Array([...version, ...algoSeq, ...octetStr]));
}

function pemToDer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const binary = atob(b64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function importRsaPrivateKey(pemOrBase64Pem) {
  if (!pemOrBase64Pem) throw new Error('GITHUB_APP_PRIVATE_KEY is not set — add it to .dev.vars');
  const decoded = pemOrBase64Pem.includes('-----')
    ? pemOrBase64Pem
    : atob(pemOrBase64Pem);

  let der = pemToDer(decoded);
  if (decoded.includes('BEGIN RSA PRIVATE KEY')) {
    der = pkcs1ToPkcs8Der(der);
  }

  return crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function base64url(str) {
  return btoa(str).replace(/[=]/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlBytes(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/[=]/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// ─── GitHub App JWT ───────────────────────────────────────────────────────────

/**
 * Generate a short-lived GitHub App JWT (RS256).
 * appId: the GitHub App's numeric ID.
 * privateKeyPemOrBase64: PEM string or base64-encoded PEM (as stored in secrets).
 */
export async function generateGitHubAppJWT(appId, privateKeyPemOrBase64) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({ iat: now - 60, exp: now + 600, iss: String(appId) }),
  );
  const message = `${header}.${payload}`;

  const key = await importRsaPrivateKey(privateKeyPemOrBase64);
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(message)),
  );

  return `${message}.${base64urlBytes(sig)}`;
}

// ─── Installation token ───────────────────────────────────────────────────────

/**
 * Exchange a GitHub App JWT for an installation access token.
 * githubInstallationId: the BigInt installation ID as a string.
 */
export async function getGitHubInstallationToken(githubInstallationId, appId, privateKey) {
  const jwt = await generateGitHubAppJWT(appId, privateKey);
  const res = await fetch(
    `${GITHUB_API_BASE}/app/installations/${githubInstallationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
        'User-Agent': 'flowershow-worker',
      },
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Failed to get GitHub installation token: ${res.status} ${res.statusText} — ${body}`,
    );
  }
  const data = await res.json();
  return data.token;
}

// ─── GitHub API helpers ───────────────────────────────────────────────────────

async function githubFetch(url, token, { accept = 'application/vnd.github+json' } = {}) {
  const res = await fetch(`${GITHUB_API_BASE}${url}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      'User-Agent': 'flowershow-worker',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status} for ${url}: ${res.statusText}`);
  }
  return res;
}

/** Fetch the full recursive tree for a repo branch. */
export async function fetchGitHubRepoTree(ghRepository, ghBranch, token) {
  const res = await githubFetch(
    `/repos/${ghRepository}/git/trees/${encodeURIComponent(ghBranch)}?recursive=1`,
    token,
  );
  return res.json();
}

/** Fetch raw file bytes from GitHub by blob SHA. Returns ArrayBuffer. */
export async function fetchGitHubFileRaw(ghRepository, fileSha, token) {
  const res = await githubFetch(
    `/repos/${ghRepository}/git/blobs/${fileSha}`,
    token,
    { accept: 'application/vnd.github.raw+json' },
  );
  return res.arrayBuffer();
}

/** Fetch JSON from a GitHub API path (relative, starting with /). */
export async function githubJsonFetch(url, token) {
  const res = await githubFetch(url, token);
  return res.json();
}
