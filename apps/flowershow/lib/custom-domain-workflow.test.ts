import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  startCustomDomainWorkflow,
  type CustomDomainWorkflowParams,
} from './custom-domain-workflow';

const PARAMS: CustomDomainWorkflowParams = {
  email: 'user@example.com',
  name: 'Alice Smith',
  domain: 'example.com',
  siteId: 'site-123',
};

describe('startCustomDomainWorkflow', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
    process.env.CLOUDFLARE_API_TOKEN = 'test-token';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
  });

  it('does not call fetch when CLOUDFLARE_ACCOUNT_ID is missing', async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    await startCustomDomainWorkflow('inst-1', PARAMS);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not call fetch when CLOUDFLARE_API_TOKEN is missing', async () => {
    delete process.env.CLOUDFLARE_API_TOKEN;
    await startCustomDomainWorkflow('inst-1', PARAMS);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('POSTs to the correct CF Workflows URL', async () => {
    await startCustomDomainWorkflow('inst-1', PARAMS);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/test-account/workflows/custom-domain-workflow/instances',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends Bearer Authorization header', async () => {
    await startCustomDomainWorkflow('inst-1', PARAMS);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('uses the provided instanceId as the workflow instance id', async () => {
    await startCustomDomainWorkflow('my-instance-id', PARAMS);
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.id).toBe('my-instance-id');
  });

  it('sends all required params in the request body', async () => {
    await startCustomDomainWorkflow('inst-1', PARAMS);
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.params).toEqual(PARAMS);
  });

  it('handles null name in params', async () => {
    await startCustomDomainWorkflow('inst-1', { ...PARAMS, name: null });
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.params.name).toBeNull();
  });
});
