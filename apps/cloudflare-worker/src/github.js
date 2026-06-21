function derLength(len) {
  if (len < 0x80) return new Uint8Array([len]);
  if (len < 0x100) return new Uint8Array([0x81, len]);
  return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
}

function derTLV(tag, value) {
  const lenBytes = derLength(value.length);
  const out = new Uint8Array(1 + lenBytes.length + value.length);
  out[0] = tag;
  out.set(lenBytes, 1);
  out.set(value, 1 + lenBytes.length);
  return out;
}

function concatBytes(...arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

// Web Crypto only accepts PKCS#8; GitHub generates PKCS#1 (BEGIN RSA PRIVATE KEY).
// Wrap PKCS#1 DER in a PKCS#8 PrivateKeyInfo envelope.
function pkcs1ToPkcs8(pkcs1Der) {
  const algorithmId = new Uint8Array([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
    0x01, 0x05, 0x00,
  ]);
  const version = new Uint8Array([0x02, 0x01, 0x00]);
  return derTLV(0x30, concatBytes(version, algorithmId, derTLV(0x04, pkcs1Der)));
}

async function generateGitHubAppJWT(appId, privateKeyBase64) {
  const now = Math.floor(Date.now() / 1000);

  const toB64Url = (str) =>
    btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const objToB64Url = (obj) => toB64Url(JSON.stringify(obj));

  const header = objToB64Url({ alg: 'RS256', typ: 'JWT' });
  // iat is back-dated 60s to account for clock skew
  const payload = objToB64Url({ iat: now - 60, exp: now + 600, iss: appId });
  const message = `${header}.${payload}`;

  const pemStr = atob(privateKeyBase64);
  const pemBody = pemStr
    .replace(/-----BEGIN[^-]+-----/g, '')
    .replace(/-----END[^-]+-----/g, '')
    .replace(/\s/g, '');
  const rawDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const keyDer = pemStr.includes('BEGIN RSA PRIVATE KEY')
    ? pkcs1ToPkcs8(rawDer)
    : rawDer;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(message),
  );

  const sigB64Url = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${message}.${sigB64Url}`;
}

export async function getGitHubInstallationToken(githubInstallationId, env) {
  const jwt = await generateGitHubAppJWT(
    env.GITHUB_APP_ID,
    env.GITHUB_APP_PRIVATE_KEY,
  );

  const response = await fetch(
    `https://api.github.com/app/installations/${githubInstallationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'flowershow-worker',
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to get GitHub installation token: ${response.status} ${response.statusText} — ${body}`,
    );
  }

  const data = await response.json();
  return data.token;
}

async function githubFetch(url, token, accept = 'application/vnd.github+json') {
  const response = await fetch(`https://api.github.com${url}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'flowershow-worker',
    },
  });
  if (!response.ok) {
    throw new Error(
      `GitHub API ${response.status} ${response.statusText}: ${url}`,
    );
  }
  return response;
}

export async function fetchGitHubRepoTree(ghRepository, ghBranch, token) {
  const resp = await githubFetch(
    `/repos/${ghRepository}/git/trees/${encodeURIComponent(ghBranch)}?recursive=1`,
    token,
  );
  return resp.json();
}

export async function fetchGitHubConfig(ghRepository, ghBranch, token, rootDir) {
  const configPath = rootDir ? `${rootDir.replace(/^\/+|\/+$/g, '')}/config.json` : 'config.json';
  try {
    const resp = await githubFetch(
      `/repos/${ghRepository}/contents/${configPath}?ref=${encodeURIComponent(ghBranch)}`,
      token,
    );
    const data = await resp.json();
    const decoded = atob(data.content.replace(/\n/g, ''));
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

export async function fetchGitHubFileRaw(ghRepository, fileSha, token) {
  const resp = await githubFetch(
    `/repos/${ghRepository}/git/blobs/${fileSha}`,
    token,
    'application/vnd.github.raw+json',
  );
  return resp.arrayBuffer();
}
