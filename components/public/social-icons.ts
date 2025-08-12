import { SocialPlatform } from "@/components/types";

import {
  DiscordIcon,
  FacebookIcon,
  GithubIcon,
  InstagramIcon,
  LinkedInIcon,
  TwitterIcon,
  YouTubeIcon,
  MastodonIcon,
  BlueskyIcon,
} from "@/components/icons";

export const socialIcons: { [K in SocialPlatform]: React.FC<any> } = {
  discord: DiscordIcon,
  facebook: FacebookIcon,
  github: GithubIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  twitter: TwitterIcon,
  x: TwitterIcon,
  youtube: YouTubeIcon,
  mastodon: MastodonIcon,
  bluesky: BlueskyIcon,
  bsky: BlueskyIcon,
};
