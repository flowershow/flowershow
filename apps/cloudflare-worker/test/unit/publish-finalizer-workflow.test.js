import { describe, it, expect, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({ WorkflowEntrypoint: class {} }));

/**
 * Run the finalizer. `uploading(i)` is the count of uploading rows at check i;
 * `syncStatus(i)` is the GitHub sync instance status at check i.
 */
async function runFinalizer({ uploading, syncStatus }) {
  vi.resetModules();
  const queries = [];
  let check = 0;
  const sql = async (strings, ...values) => {
    const text = strings.join('?');
    queries.push({ text, values });
    if (text.includes("status = 'uploading'") && text.includes('COUNT')) {
      return [{ count: uploading(check) }];
    }
    return [];
  };
  vi.doMock('../../src/clients.js', () => ({ getPostgresClient: () => sql }));
  vi.doMock('../../src/utils.js', () => ({ captureError: vi.fn() }));
  const { PublishFinalizerWorkflow } = await import(
    '../../src/publish-finalizer-workflow.js'
  );
  const workflow = new PublishFinalizerWorkflow();
  workflow.env = {
    GITHUB_SYNC_WORKFLOW: {
      get: async () => ({ status: async () => ({ status: syncStatus(check) }) }),
    },
  };
  const sleeps = [];
  const step = {
    do: async (name, fn) => {
      const output = await fn();
      if (name.startsWith('check-completion-')) check++;
      return output;
    },
    sleep: async (_name, duration) => {
      sleeps.push(duration);
    },
  };
  await workflow.run(
    { payload: { publishId: 'pub1', siteId: 'site1', syncInstanceId: 'pub1-github' } },
    step,
  );
  const expired = queries.some((q) => q.text.includes("SET status = 'expired'"));
  return { checks: check, sleeps, expired };
}

describe('PublishFinalizerWorkflow', () => {
  // A GitHub sync can wait hours for its rate limit; its files must not
  // expire while it can still upload them.
  it('does not expire files while the GitHub sync is still running', async () => {
    const { checks, sleeps, expired } = await runFinalizer({
      uploading: (i) => (i < 500 ? 5 : 0),
      syncStatus: () => 'waiting',
    });

    expect(expired).toBe(false);
    expect(checks).toBe(501);
    expect(sleeps.every((d) => d === '1 minute')).toBe(true);
  });

  it('expires the remaining files one hour after the sync stops', async () => {
    const { checks, sleeps, expired } = await runFinalizer({
      uploading: () => 5,
      syncStatus: (i) => (i < 100 ? 'running' : 'errored'),
    });

    expect(expired).toBe(true);
    expect(checks).toBe(100 + 360);
    expect(sleeps.filter((d) => d === '10 seconds')).toHaveLength(359);
  });
});
