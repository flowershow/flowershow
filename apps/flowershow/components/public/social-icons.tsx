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
import { MailIcon } from 'lucide-react';

export const socialIcons: { [K in SocialPlatform]: React.FC<any> } = {
  bluesky: BlueskyIcon,
  bsky: BlueskyIcon,
  discord: DiscordIcon,
  mail: (props) => <MailIcon strokeWidth={2.5} {...props} />,
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
