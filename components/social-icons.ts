import { SocialPlatform } from "@/components/types";

import {
  DiscordIcon,
  FacebookIcon,
  GithubIcon,
  InstagramIcon,
  LinkedInIcon,
  XIcon,
  YouTubeIcon,
} from "@/components/icons";

export const socialIcons: { [K in SocialPlatform]: React.FC<any> } = {
  discord: DiscordIcon,
  facebook: FacebookIcon,
  github: GithubIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  twitter: XIcon,
  x: XIcon,
  youtube: YouTubeIcon,
};
