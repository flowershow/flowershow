import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SocialCard } from '@/components/og/social-card';

const meta: Meta<typeof SocialCard> = {
  title: 'OG/SocialCard',
  component: SocialCard,
  args: {
    siteName: 'Ana’s Garden',
    logoSrc: null,
    title: 'Why I moved my notes from Obsidian to a public digital garden',
    section: 'Notes',
    domain: 'notes-ana.flowershow.me',
    showMark: true,
    markSrc: 'https://r2-assets.flowershow.app/logo.png',
    pictureSrc: null,
  },
};
export default meta;
type Story = StoryObj<typeof SocialCard>;

export const TextCard: Story = {};
export const PictureCard: Story = {
  args: {
    pictureSrc:
      'https://flowershow.app/assets/covers/hokusai-poppies-large-flowers-series.webp',
  },
};
export const Premium: Story = {
  args: {
    showMark: false,
    logoSrc: 'https://r2-assets.flowershow.app/logo.png',
    siteName: 'Flowershow',
  },
};
export const LongTitle: Story = { args: { title: 'h'.repeat(200) } };
export const NoSection: Story = { args: { section: null } };
export const SiteOnly: Story = {
  args: {
    title: 'Team Handbook',
    section: null,
    domain: 'handbook.example.org',
  },
};
