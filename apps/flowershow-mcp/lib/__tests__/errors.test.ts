import { describe, expect, it } from 'vitest';
import {
  apiError,
  fileTooLarge,
  networkError,
  notAuthenticated,
  siteAlreadyExists,
  siteNotFound,
  tokenInvalid,
  totalSizeExceeded,
  unexpectedError,
  uploadFailed,
} from '../errors';

describe('MCP error helpers', () => {
  it('returns text content with correct structure', () => {
    const result = notAuthenticated();
    expect(result).toEqual({
      type: 'text',
      text: expect.stringContaining('Personal Access Token'),
    });
  });

  it('notAuthenticated mentions PAT and Authorization header', () => {
    const text = notAuthenticated().text;
    expect(text).toContain('Personal Access Token');
    expect(text).toContain('Authorization');
  });

  it('tokenInvalid mentions PAT', () => {
    const text = tokenInvalid().text;
    expect(text).toContain('invalid');
    expect(text).toContain('PAT');
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
