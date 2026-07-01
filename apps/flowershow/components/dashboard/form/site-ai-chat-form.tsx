'use client';
import clsx from 'clsx';
import { signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import LoadingDots from '@/components/icons/loading-dots';
import { api } from '@/trpc/react';
import { PasswordInput } from '../password-input';

export default function SiteAiChatForm({ siteId }: { siteId: string }) {
  const {
    data: site,
    isLoading: isLoadingData,
    refetch,
  } = api.site.getById.useQuery({ id: siteId });

  const [apiKey, setApiKey] = useState('');
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    if (site) {
      setHasExistingKey(site.enableAiChat);
    }
  }, [site?.enableAiChat]);

  const setAiChatApiKey = api.site.setAiChatApiKey.useMutation({
    onSuccess: async () => {
      toast.success('AI Chat settings updated.');
      setApiKey('');
      await refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      if ((error as any).data?.code === 'UNAUTHORIZED') {
        setTimeout(() => signOut(), 3000);
      }
    },
  });

  const pending = isLoadingData || setAiChatApiKey.isLoading;

  const canSave = !pending && apiKey !== '';

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!site) return;
    setAiChatApiKey.mutate({ id: site.id, apiKey: apiKey || undefined });
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault();
    if (!site) return;
    setAiChatApiKey.mutate({ id: site.id, apiKey: undefined });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="isolate rounded-lg border border-stone-200 bg-white"
    >
      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 id="aiChat" className="font-dashboard-heading text-xl">
              AI Chat
            </h2>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              Experimental
            </span>
          </div>
          {hasExistingKey && (
            <span className="flex shrink-0 items-center rounded-full border border-green-200 bg-green-50 px-3 py-0.5 text-xs font-medium text-green-700">
              Enabled
            </span>
          )}
        </div>

        <p className="text-sm text-stone-500">
          Allow visitors to chat with an AI assistant powered by your content.
          Enter your Anthropic API key to enable this feature. The key is stored
          securely and never returned in any API response.
        </p>

        <div className="space-y-2">
          <PasswordInput
            label={hasExistingKey ? 'Replace API key' : 'Anthropic API key'}
            placeholder={hasExistingKey ? '••••••••' : 'sk-ant-...'}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={pending}
            value={apiKey}
          />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center space-y-4 rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3 sm:flex-row sm:justify-between sm:space-x-4 sm:space-y-0 sm:px-10">
        <div className="w-full">
          {hasExistingKey && (
            <button
              type="button"
              onClick={handleClear}
              disabled={pending}
              className={clsx(
                'text-sm text-red-500 underline',
                pending && 'cursor-not-allowed opacity-50',
              )}
            >
              Clear key and disable AI Chat
            </button>
          )}
        </div>

        <button
          type="submit"
          className={clsx(
            'flex h-8 w-32 shrink-0 items-center justify-center space-x-2 rounded-md border px-2 py-1 text-sm transition-all focus:outline-none sm:h-10',
            !canSave || pending
              ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
              : 'border-black bg-black text-white hover:bg-white hover:text-black',
          )}
          disabled={!canSave || pending}
        >
          {pending ? <LoadingDots color="#808080" /> : <p>Save Changes</p>}
        </button>
      </div>
    </form>
  );
}
