import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal('fetch', mockFetch);

const { startGithubSyncWorkflow } = await import('./github-sync-workflow');

const baseParams = {
  publishId: 'pub-123',
  siteId: 'site-456',
  installationDbId: 'inst-789',
  ghRepository: 'org/repo',
  ghBranch: 'main',
};

describe('startGithubSyncWorkflow', () => {
  beforeEach(() => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
    process.env.CLOUDFLARE_API_TOKEN = 'test-token';
    mockFetch.mockClear();
  });

  afterEach(() => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
  });

  it('does not call fetch when CLOUDFLARE_ACCOUNT_ID is missing', async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    await startGithubSyncWorkflow(baseParams);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not call fetch when CLOUDFLARE_API_TOKEN is missing', async () => {
    delete process.env.CLOUDFLARE_API_TOKEN;
    await startGithubSyncWorkflow(baseParams);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('POSTs to the correct CF Workflows URL', async () => {
    await startGithubSyncWorkflow(baseParams);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/test-account/workflows/github-sync-workflow/instances',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends Bearer Authorization header', async () => {
    await startGithubSyncWorkflow(baseParams);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-token',
    );
  });

  it('uses publishId as the workflow instance id', async () => {
    await startGithubSyncWorkflow(baseParams);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.id).toBe('pub-123');
  });

  it('sends all required params in the request body', async () => {
    await startGithubSyncWorkflow(baseParams);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.params).toMatchObject(baseParams);
  });

  it('includes optional params when provided', async () => {
    const params = {
      ...baseParams,
      rootDir: 'docs',
      gitCommitSha: 'abc123',
      gitCommitMessage: 'Update site',
    };
    await startGithubSyncWorkflow(params);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.params).toMatchObject(params);
  });
});
