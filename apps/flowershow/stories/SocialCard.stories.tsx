import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SocialCard } from '@/components/og/social-card';

const meta: Meta<typeof SocialCard> = {
  title: 'OG/SocialCard',
  component: SocialCard,
  args: {
    siteName: 'Ana’s Garden',
    logoSrc: null,
    title: 'Why I moved my notes from Obsidian to a public digital garden',
    description:
      'Last spring I made a slightly scary decision: I published my entire notes vault.',
    displayUrl: 'notes-ana.flowershow.me/garden',
    showMark: true,
    markSrc: 'https://r2-assets.flowershow.app/logo.png',
  },
};
export default meta;
type Story = StoryObj<typeof SocialCard>;

export const FreeNoLogo: Story = {};
export const Premium: Story = {
  args: {
    showMark: false,
    logoSrc: 'https://r2-assets.flowershow.app/logo.png',
    siteName: 'Flowershow',
  },
};
export const LongTitle: Story = { args: { title: 'h'.repeat(200) } };
export const NoDescription: Story = { args: { description: null } };
export const SiteOnly: Story = {
  args: {
    title: 'Team Handbook',
    description: 'Private site',
    displayUrl: 'handbook.example.org',
  },
};
