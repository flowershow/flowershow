import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import chalk from "chalk";
import { API_URL } from "./const.js";

const CONFIG_DIR = join(homedir(), ".flowershow");
const TOKEN_FILE = join(CONFIG_DIR, "token.json");

interface TokenData {
  token: string;
  username: string;
  savedAt: string;
}

interface UserInfo {
  username?: string;
  email?: string;
  id?: string;
}

interface DeviceTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

/**
 * Save CLI token to local storage
 * @param token - The CLI token to save
 * @param username - The username associated with the token
 */
export function saveToken(token: string, username: string): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const data: TokenData = {
    token,
    username,
    savedAt: new Date().toISOString(),
  };

  writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Get saved CLI token
 * @returns Token data or null if not found
 */
export function getToken(): TokenData | null {
  if (!existsSync(TOKEN_FILE)) {
    return null;
  }

  try {
    const data = readFileSync(TOKEN_FILE, "utf-8");
    return JSON.parse(data) as TokenData;
  } catch (error) {
    console.error(chalk.yellow("Warning: Failed to read token file"));
    return null;
  }
}

/**
 * Remove saved CLI token
 */
export async function removeToken(): Promise<void> {
  if (existsSync(TOKEN_FILE)) {
    try {
      const fs = await import("fs/promises");
      await fs.unlink(TOKEN_FILE);
    } catch (error) {
      // If file doesn't exist, that's fine
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
}

/**
 * Get authorization header for API requests
 * @returns Headers object or null if not authenticated
 */
export function getAuthHeaders(): Record<string, string> | null {
  const tokenData = getToken();

  if (!tokenData || !tokenData.token) {
    return null;
  }

  return {
    Authorization: `Bearer ${tokenData.token}`,
  };
}

/**
 * Poll device authorization endpoint
 * @param apiUrl - Base API URL
 * @param deviceCode - Device code from authorization request
 * @param interval - Polling interval in seconds
 * @param expiresIn - Expiration time in seconds
 * @returns Access token
 */
export async function pollForToken(
  apiUrl: string,
  deviceCode: string,
  interval: number,
  expiresIn: number,
): Promise<string> {
  const startTime = Date.now();
  const expirationTime = startTime + expiresIn * 1000;
  let currentInterval = interval;

  while (Date.now() < expirationTime) {
    // Wait for the specified interval
    await new Promise((resolve) => setTimeout(resolve, currentInterval * 500));

    try {
      const response = await fetch(`${apiUrl}/api/cli/device/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_code: deviceCode,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });

      const data = (await response.json()) as DeviceTokenResponse;

      if (response.ok && data.access_token) {
        return data.access_token;
      }

      if (data.error === "authorization_pending") {
        // Continue polling
        continue;
      }

      if (data.error === "slow_down") {
        // Increase interval by 5 seconds
        currentInterval += 5;
        continue;
      }

      if (data.error === "expired_token") {
        throw new Error("The device code has expired. Please try again.");
      }

      if (data.error === "access_denied") {
        throw new Error("Authorization was denied.");
      }

      throw new Error(
        data.error_description || data.error || "Unknown error occurred",
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("expired") || error.message.includes("denied"))
      ) {
        throw error;
      }
      // Network errors - continue polling
      continue;
    }
  }

  throw new Error("Authorization timed out. Please try again.");
}

/**
 * Check if user is authenticated
 * @returns User info
 */
export async function requireAuth(): Promise<UserInfo> {
  try {
    const tokenData = getToken();
    if (!tokenData) {
      throw new Error("Not authenticated");
    }
    return await getUserInfo(tokenData.token);
  } catch (error) {
    displayError(
      "You must be authenticated to use this command.\n" +
        "Run `publish auth login` to authenticate.",
    );
    process.exit(0);
  }
}

/**
 * Get user info from API
 * @param token - CLI token
 * @returns User info
 */
export async function getUserInfo(token: string): Promise<UserInfo> {
  const response = await fetch(`${API_URL}/api/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get user info");
  }

  return (await response.json()) as UserInfo;
}

/**
 * Display error message
 */
function displayError(message: string): void {
  console.error(chalk.red(`\n✗ Error: ${message}\n`));
}
