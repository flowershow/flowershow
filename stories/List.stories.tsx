import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Decorator } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { observable } from '@trpc/server/observable';
import { api } from '@/trpc/react';
import superjson from 'superjson';
import List from '@/components/public/mdx/list';
import { manyItems } from '@/stories/__fixtures__/catalog';
import '@/styles/default-theme.css';

/**
 * Creates a Storybook decorator that wraps the story in the tRPC React
 * provider. The supplied `resolvedData` is returned for every tRPC query,
 * so each story can control what the component "sees".
 */
function withTRPC(resolvedData: unknown): Decorator {
  return function TRPCWrapper(Story) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const trpcClient = api.createClient({
      transformer: superjson,
      links: [
        () => () =>
          observable((observer) => {
            observer.next({
              result: { type: 'data', data: resolvedData },
            });
            observer.complete();
          }),
      ],
    });

    return (
      <QueryClientProvider client={queryClient}>
        <api.Provider client={trpcClient} queryClient={queryClient}>
          <Story />
        </api.Provider>
      </QueryClientProvider>
    );
  };
}

const meta: Meta<typeof List> = {
  title: 'Other/List',
  component: List,
  args: {
    siteId: 'site_123',
    dir: '',
  },
  parameters: {
    controls: { exclude: ['fields', 'siteId'] },
  },
  argTypes: {
    dir: {
      control: false,
    },
  },
};
export default meta;

type Story = StoryObj<typeof List>;

export const Default: Story = {
  decorators: [withTRPC({ items: manyItems(3) })],
};

export const WithPagination: Story = {
  parameters: {
    nextjs: {
      router: {
        pathname: '/blog',
        query: {
          page: 1,
        },
      },
    },
  },
  args: { pageSize: 10 },
  decorators: [withTRPC({ items: manyItems(23) })],
};

export const CustomSlots: Story = {
  args: {
    slots: {
      media: 'image',
      eyebrow: 'title',
      headline: 'date',
      summary: 'description',
      footnote: 'tags',
    },
  },
  decorators: [withTRPC({ items: manyItems(3) })],
};

export const EmptyState: Story = {
  decorators: [withTRPC({ items: [] })],
};
