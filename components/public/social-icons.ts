import { SocialPlatform } from "@/components/types";

import {
  BlueskyIcon,
  DiscordIcon,
  FacebookIcon,
  GithubIcon,
  InstagramIcon,
  LinkedInIcon,
  MastodonIcon,
  SubstackIcon,
  RedditIcon,
  TwitterIcon,
  YouTubeIcon,
} from "@/components/icons";

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
