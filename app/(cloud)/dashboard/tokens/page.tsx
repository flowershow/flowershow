import TokensList from './tokens-list';
import CreateTokenModal from './create-token-modal';
import { api } from '@/trpc/server';

export default async function TokensPage() {
  const tokens = await api.user.getAccessTokens.query();

  const patTokens = tokens.filter((t) => t.type === 'PAT');
  const cliTokens = tokens.filter((t) => t.type === 'CLI');

  return (
    <div className="flex max-w-screen-xl flex-col space-y-12 p-8">
      <div className="flex flex-col space-y-6">
        <h1 className="font-cal text-3xl font-bold dark:text-white">
          Access Tokens
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400">
          Manage your access tokens for the Flowershow CLI and Obsidian plugin.
        </p>
      </div>

      {/* Personal Access Tokens */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold dark:text-white">
              Personal Access Tokens
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Tokens for use with the Obsidian plugin or other integrations.
            </p>
          </div>
          <CreateTokenModal />
        </div>
        <TokensList
          tokens={patTokens}
          emptyMessage="No personal access tokens. Create one to use with the Obsidian plugin."
        />
      </section>

      {/* CLI Tokens */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold dark:text-white">CLI Tokens</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Tokens created via{' '}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-stone-800">
              publish auth login
            </code>
          </p>
        </div>
        <TokensList
          tokens={cliTokens}
          emptyMessage="No CLI tokens. Run 'publish auth login' to authenticate."
        />
      </section>
    </div>
  );
}
