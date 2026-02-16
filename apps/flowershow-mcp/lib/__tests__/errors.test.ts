import { describe, it, expect } from 'vitest';
import {
  notAuthenticated,
  authPending,
  authExpired,
  tokenRevoked,
  siteNotFound,
  siteAlreadyExists,
  fileTooLarge,
  totalSizeExceeded,
  uploadFailed,
  apiError,
  networkError,
  unexpectedError,
} from '../errors';

describe('MCP error helpers', () => {
  it('returns text content with correct structure', () => {
    const result = notAuthenticated();
    expect(result).toEqual({
      type: 'text',
      text: expect.stringContaining('auth_start'),
    });
  });

  it('notAuthenticated mentions auth_start', () => {
    expect(notAuthenticated().text).toContain('auth_start');
  });

  it('authPending mentions auth_status', () => {
    expect(authPending().text).toContain('auth_status');
  });

  it('authExpired mentions auth_start', () => {
    expect(authExpired().text).toContain('auth_start');
  });

  it('tokenRevoked mentions auth_start', () => {
    expect(tokenRevoked().text).toContain('auth_start');
  });

  it('siteNotFound includes site id', () => {
    expect(siteNotFound('site-123').text).toContain('site-123');
  });

  it('siteAlreadyExists includes site name', () => {
    expect(siteAlreadyExists('my-blog').text).toContain('my-blog');
  });

  it('fileTooLarge includes path and limit', () => {
    const result = fileTooLarge('images/big.png', 100);
    expect(result.text).toContain('images/big.png');
    expect(result.text).toContain('100');
  });

  it('totalSizeExceeded includes limit', () => {
    expect(totalSizeExceeded(500).text).toContain('500');
  });

  it('uploadFailed includes path', () => {
    expect(uploadFailed('file.md').text).toContain('file.md');
  });

  it('uploadFailed includes optional reason', () => {
    expect(uploadFailed('file.md', 'timeout').text).toContain('timeout');
  });

  it('apiError includes status code and message', () => {
    const result = apiError(403, 'Forbidden');
    expect(result.text).toContain('403');
    expect(result.text).toContain('Forbidden');
  });

  it('networkError includes message', () => {
    expect(networkError('ECONNREFUSED').text).toContain('ECONNREFUSED');
  });

  it('unexpectedError includes message', () => {
    expect(unexpectedError('null ref').text).toContain('null ref');
  });
});
