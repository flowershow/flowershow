function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export function getConfig() {
  return {
    /** Base URL of the Flowershow API (no trailing slash) */
    apiUrl: requireEnv('FLOWERSHOW_API_URL'),

    /** Port for local development */
    port: optionalEnv('PORT', '3100'),
  };
}

export type Config = ReturnType<typeof getConfig>;
