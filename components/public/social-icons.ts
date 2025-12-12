import {
  BlueskyIcon,
  DiscordIcon,
  FacebookIcon,
  GithubIcon,
  InstagramIcon,
  LinkedInIcon,
  MastodonIcon,
  RedditIcon,
  SubstackIcon,
  TwitterIcon,
  YouTubeIcon,
} from '@/components/icons';
import { SocialPlatform } from '@/components/types';

export const socialIcons: { [K in SocialPlatform]: React.FC<any> } = {
  bluesky: BlueskyIcon,
  bsky: BlueskyIcon,
  discord: DiscordIcon,
  facebook: FacebookIcon,
  github: GithubIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  mastodon: MastodonIcon,
  reddit: RedditIcon,
  substack: SubstackIcon,
  twitter: TwitterIcon,
  x: TwitterIcon,
  youtube: YouTubeIcon,
};
