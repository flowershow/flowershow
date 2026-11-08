/**
 * Message from a failed API response body (`{ message }`), so server-provided
 * text such as storage limits and upgrade links reaches the user.
 */
export async function readApiError(
  res: Response,
  fallback: string,
): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.message === 'string' && body.message
    ? body.message
    : fallback;
}
